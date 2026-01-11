/**
 * Servizio di stima con caching DB
 * Orchestrazione: check cache -> scrape -> compute -> cache -> return
 */

import { CarValuationInput, ValuationResult, ValuationError, ValuationResponse, ConditionType, LimitingFactor } from './types';
import { DEFAULT_VALUATION_CONFIG } from './config';
import { aggregateListings, queueRequest } from './datasources';
import { computeRobustStats, generateQueryHash, roundToMultiple } from './robust-stats';
import { getCachedStats, upsertStats, QueryStatsInput } from './db';

/**
 * Tactical suggestions based on limiting factor
 */
const TACTICAL_SUGGESTIONS: Record<string, string> = {
  km_range: 'Prova a selezionare una fascia km più ampia per più risultati',
  year_range: 'Considera anche annate vicine per una stima più precisa',
  variant: 'Rimuovi la selezione della versione per confrontare l\'intero modello',
  filters: 'Prova a rimuovere alcuni filtri opzionali per più risultati',
  rare_car: '', // Nessun suggerimento per auto rare - è il mercato
};

// Configurazione fallback con limiting factor associato
const SEARCH_STRATEGIES = [
  { yearWindow: 1, kmWindowPercent: 0.15, label: 'stretta', limitingFactor: null as LimitingFactor },
  { yearWindow: 2, kmWindowPercent: 0.15, label: 'anno allargato', limitingFactor: 'year_range' as LimitingFactor },
  { yearWindow: 2, kmWindowPercent: 0.30, label: 'anno+km allargati', limitingFactor: 'km_range' as LimitingFactor },
  { yearWindow: 2, kmWindowPercent: 0.30, removeGear: true, label: 'senza cambio', limitingFactor: 'filters' as LimitingFactor },
  { yearWindow: 2, kmWindowPercent: 0.30, removeVariant: true, label: 'senza versione', limitingFactor: 'variant' as LimitingFactor },
];

/**
 * Genera hash query per cache
 */
function buildQueryHash(input: CarValuationInput, yearMin: number, yearMax: number, kmMin: number, kmMax: number): string {
  return generateQueryHash({
    brand: input.brand.toLowerCase(),
    model: input.model.toLowerCase(),
    yearMin,
    yearMax,
    kmMin,
    kmMax,
    fuel: input.fuel,
    gearbox: input.gearbox,
    variant: input.variant || '',
    bodyType: input.bodyType || '',
  });
}

/**
 * Calcola aggiustamento per condizione
 */
function applyConditionAdjustment(price: number, condition?: ConditionType): number {
  const adjustments = DEFAULT_VALUATION_CONFIG.conditionAdjustments;
  const factor = 1 + (adjustments[condition || 'normale'] || 0);
  return roundToMultiple(price * factor, 50);
}

/**
 * Genera spiegazione testuale - user-friendly, senza riferimenti tecnici
 */
function generateExplanation(
  input: CarValuationInput,
  stats: { nClean: number; nDealers: number; nPrivate: number; iqrRatio: number },
  yearWindow: [number, number],
  _kmWindow: [number, number],
  _strategyLabel: string,
  _cached: boolean
): string {
  // Costruisci una spiegazione semplice e orientata al valore
  const vehicleDesc = `${input.brand} ${input.model}`;
  const yearRange = yearWindow[0] === yearWindow[1]
    ? `del ${yearWindow[0]}`
    : `dal ${yearWindow[0]} al ${yearWindow[1]}`;

  // Messaggio principale semplice
  let explanation = `Abbiamo analizzato ${stats.nClean} ${vehicleDesc} ${yearRange} attualmente in vendita in Italia`;

  // Aggiungi contesto sulla tipologia di venditori solo se significativo
  if (stats.nDealers > 0 && stats.nPrivate > 0) {
    const dealerPct = Math.round((stats.nDealers / (stats.nDealers + stats.nPrivate)) * 100);
    if (dealerPct >= 70) {
      explanation += ', prevalentemente da concessionari';
    } else if (dealerPct <= 30) {
      explanation += ', prevalentemente da privati';
    }
  }

  explanation += '.';

  return explanation;
}

/**
 * Esegue stima con caching DB e fallback intelligente
 */
export async function getOrComputeEstimate(
  input: CarValuationInput
): Promise<ValuationResponse> {
  const config = DEFAULT_VALUATION_CONFIG;

  // Prova ogni strategia di ricerca
  for (const strategy of SEARCH_STRATEGIES) {
    // Salta la strategia "senza versione" se non c'è una versione selezionata
    if (strategy.removeVariant && !input.variant) {
      continue;
    }

    const yearMin = input.year - strategy.yearWindow;
    const yearMax = input.year + strategy.yearWindow;

    // Usa range km esplicito se fornito, altrimenti calcola da percentuale
    let kmMin: number;
    let kmMax: number;
    if (input.kmMin !== undefined && input.kmMax !== undefined) {
      // Range esplicito da form - applica solo allargamento se strategia lo richiede
      if (strategy.kmWindowPercent > 0.15) {
        // Allarga il range del 20% su entrambi i lati
        const rangeSize = input.kmMax - input.kmMin;
        const expansion = Math.round(rangeSize * 0.2);
        kmMin = Math.max(0, input.kmMin - expansion);
        kmMax = input.kmMax + expansion;
      } else {
        kmMin = input.kmMin;
        kmMax = input.kmMax;
      }
    } else {
      // Calcolo tradizionale da km esatto
      const kmDelta = Math.round(input.km * strategy.kmWindowPercent);
      kmMin = Math.max(0, input.km - kmDelta);
      kmMax = input.km + kmDelta;
    }

    // Crea input modificato per questa strategia (rimuovi variant se richiesto)
    const strategyInput = strategy.removeVariant
      ? { ...input, variant: undefined }
      : input;

    // Genera hash per questa query
    const queryHash = buildQueryHash(strategyInput, yearMin, yearMax, kmMin, kmMax);

    console.log(`[Estimate] Strategia "${strategy.label}": anni ${yearMin}-${yearMax}, km ${kmMin}-${kmMax}${strategy.removeVariant ? ' (versione rimossa)' : ''}`);

    // STEP 1: Check cache DB
    try {
      const cached = await getCachedStats(queryHash);
      if (cached && cached.n_listings >= 5) {
        console.log(`[Estimate] Cache hit: ${cached.n_listings} listing`);

        // Applica aggiustamento condizione
        const p25 = applyConditionAdjustment(cached.p25, input.condition);
        const p50 = applyConditionAdjustment(cached.p50, input.condition);
        const p75 = applyConditionAdjustment(cached.p75, input.condition);
        const dealerPrice = roundToMultiple(p50 * (1 - config.dealerDiscountPercent), 50);

        // Calcola prezzi vendita dettagliati
        const tradeInPrice = roundToMultiple((dealerPrice + p50) / 2, 50); // Tra dealer e P50

        // Calcola confidence e limiting factor
        const confidence = cached.iqr_ratio < 0.25 && cached.n_listings >= 30 ? 'alta' :
                          cached.iqr_ratio < 0.40 && cached.n_listings >= 10 ? 'media' : 'bassa';
        const limitingFactor = confidence === 'bassa' ? strategy.limitingFactor : null;
        const tacticalSuggestion = limitingFactor ? TACTICAL_SUGGESTIONS[limitingFactor] : undefined;

        return {
          range_min: p25,
          range_max: p75,
          market_median: p50,
          dealer_buy_price: dealerPrice,
          private_listing_price: p75,    // Dove mettere annuncio
          private_closing_price: p50,    // Chiusura realistica
          trade_in_price: tradeInPrice,  // Permuta
          p25,
          p50,
          p75,
          samples: cached.n_listings,
          samples_raw: cached.n_listings,
          n_dealers: cached.n_dealers,
          n_private: cached.n_private,
          iqr_ratio: cached.iqr_ratio,
          confidence,
          limiting_factor: limitingFactor,
          tactical_suggestion: tacticalSuggestion,
          explanation: generateExplanation(
            strategyInput,
            { nClean: cached.n_listings, nDealers: cached.n_dealers, nPrivate: cached.n_private, iqrRatio: cached.iqr_ratio },
            [yearMin, yearMax],
            [kmMin, kmMax],
            strategy.label,
            true
          ),
          updated_at: cached.updated_at.toISOString(),
          cached: true,
          computed_from: {
            year_window: [yearMin, yearMax],
            km_window: [kmMin, kmMax],
            filters_applied: [strategyInput.fuel, strategyInput.gearbox, strategyInput.variant, strategyInput.bodyType].filter(Boolean) as string[],
          },
        };
      }
    } catch (dbError) {
      console.warn('[Estimate] DB cache check failed:', dbError);
      // Continua senza cache
    }

    // STEP 2: Fetch data via aggregator (cache-first, AutoScout24 primario)
    console.log(`[Estimate] Fetching via aggregator...`);
    const aggregated = await aggregateListings(strategyInput, {
      yearMin,
      yearMax,
      kmMin,
      kmMax,
      maxPages: 5,
    });

    const listings = aggregated.listings;
    console.log(`[Estimate] Aggregator: ${listings.length} listing da ${Object.keys(aggregated.sources).join(', ')}`);

    if (listings.length === 0) {
      console.log(`[Estimate] Nessun risultato per strategia "${strategy.label}"`);
      continue; // Prova strategia successiva
    }

    // Se pochi risultati, l'aggregator ha già accodato richieste per fonti secondarie
    if (listings.length < 10 && !aggregated.enriched) {
      console.log(`[Estimate] Pochi risultati, richieste secondarie accodate per background`);
    }

    // STEP 3: Calcola statistiche robuste
    const stats = computeRobustStats(listings);

    if (!stats || stats.nClean < 3) {
      console.log(`[Estimate] Troppo pochi risultati dopo outlier removal`);
      continue;
    }

    console.log(`[Estimate] Stats: n=${stats.nClean}, p50=${stats.p50}, iqr_ratio=${stats.iqrRatio.toFixed(3)}`);

    // STEP 4: Salva in cache DB
    try {
      const cacheInput: QueryStatsInput = {
        queryHash,
        filters: {
          brand: strategyInput.brand,
          model: strategyInput.model,
          yearMin,
          yearMax,
          kmMin,
          kmMax,
          fuel: strategyInput.fuel,
          gearbox: strategyInput.gearbox,
          variant: strategyInput.variant,
          bodyType: strategyInput.bodyType,
        },
        source: 'autoscout24',
        nListings: stats.nClean,
        p25: stats.p25,
        p50: stats.p50,
        p75: stats.p75,
        minClean: stats.minClean,
        maxClean: stats.maxClean,
        iqrRatio: stats.iqrRatio,
        nDealers: stats.nDealers,
        nPrivate: stats.nPrivate,
        ttlHours: 24,
      };

      await upsertStats(cacheInput);
      console.log(`[Estimate] Cached in DB`);
    } catch (dbError) {
      console.warn('[Estimate] DB cache write failed:', dbError);
      // Continua senza salvare cache
    }

    // STEP 5: Applica aggiustamento condizione e ritorna
    const p25 = applyConditionAdjustment(stats.p25, input.condition);
    const p50 = applyConditionAdjustment(stats.p50, input.condition);
    const p75 = applyConditionAdjustment(stats.p75, input.condition);
    const dealerPrice = roundToMultiple(p50 * (1 - config.dealerDiscountPercent), 50);
    const tradeInPrice = roundToMultiple((dealerPrice + p50) / 2, 50);

    // Determina limiting factor solo se confidence bassa
    const limitingFactor = stats.confidence === 'bassa' ? strategy.limitingFactor : null;
    const tacticalSuggestion = limitingFactor ? TACTICAL_SUGGESTIONS[limitingFactor] : undefined;

    return {
      range_min: p25,
      range_max: p75,
      market_median: p50,
      dealer_buy_price: dealerPrice,
      private_listing_price: p75,
      private_closing_price: p50,
      trade_in_price: tradeInPrice,
      p25,
      p50,
      p75,
      samples: stats.nClean,
      samples_raw: stats.nRaw,
      n_dealers: stats.nDealers,
      n_private: stats.nPrivate,
      iqr_ratio: stats.iqrRatio,
      confidence: stats.confidence,
      limiting_factor: limitingFactor,
      tactical_suggestion: tacticalSuggestion,
      explanation: generateExplanation(
        strategyInput,
        stats,
        [yearMin, yearMax],
        [kmMin, kmMax],
        strategy.label,
        false
      ),
      updated_at: new Date().toISOString(),
      cached: false,
      computed_from: {
        year_window: [yearMin, yearMax],
        km_window: [kmMin, kmMax],
        filters_applied: [strategyInput.fuel, strategyInput.gearbox, strategyInput.variant, strategyInput.bodyType].filter(Boolean) as string[],
      },
    };
  }

  // STEP 6: Nessun risultato con nessuna strategia
  // Verifica se il modello esiste (senza variant per test più ampio)
  const baseInput = { ...input, variant: undefined };
  const anyResult = await aggregateListings(baseInput, {
    yearMin: 1990,
    yearMax: new Date().getFullYear() + 1,
    kmMin: 0,
    kmMax: 999999,
    maxPages: 1,
  });
  const anyListings = anyResult.listings;

  if (anyListings.length === 0) {
    return {
      error: true,
      message: `${input.brand} ${input.model} non disponibile sul mercato`,
      suggestion: 'Questo modello è molto raro in Italia. Contattaci per una valutazione personalizzata.',
    } as ValuationError;
  }

  // Se c'era una variante specifica, suggerisci alternativa
  if (input.variant) {
    return {
      error: true,
      message: `Versione "${input.variant}" rara sul mercato`,
      suggestion: `Sono disponibili ${anyListings.length} ${input.brand} ${input.model} in altre versioni. Rimuovi la selezione della versione per una stima basata sull'intero mercato.`,
    } as ValuationError;
  }

  return {
    error: true,
    message: 'Combinazione anno/km non comune',
    suggestion: `Abbiamo trovato ${anyListings.length} ${input.brand} ${input.model} con caratteristiche diverse. Modifica anno o chilometraggio per una valutazione più precisa.`,
  } as ValuationError;
}

/**
 * Type guard per errori
 */
export function isEstimateError(response: ValuationResponse): response is ValuationError {
  return 'error' in response && response.error === true;
}
