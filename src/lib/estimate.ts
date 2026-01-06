/**
 * Servizio di stima con caching DB
 * Orchestrazione: check cache -> scrape -> compute -> cache -> return
 */

import { CarValuationInput, ValuationResult, ValuationError, ValuationResponse, ConditionType } from './types';
import { DEFAULT_VALUATION_CONFIG } from './config';
import { aggregateListings, queueRequest } from './datasources';
import { computeRobustStats, generateQueryHash, roundToMultiple } from './robust-stats';
import { getCachedStats, upsertStats, QueryStatsInput } from './db';

// Configurazione fallback
const SEARCH_STRATEGIES = [
  { yearWindow: 1, kmWindowPercent: 0.15, label: 'stretta' },
  { yearWindow: 2, kmWindowPercent: 0.15, label: 'anno allargato' },
  { yearWindow: 2, kmWindowPercent: 0.30, label: 'anno+km allargati' },
  { yearWindow: 2, kmWindowPercent: 0.30, removeGear: true, label: 'senza cambio' },
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
    const yearMin = input.year - strategy.yearWindow;
    const yearMax = input.year + strategy.yearWindow;
    const kmDelta = Math.round(input.km * strategy.kmWindowPercent);
    const kmMin = Math.max(0, input.km - kmDelta);
    const kmMax = input.km + kmDelta;

    // Genera hash per questa query
    const queryHash = buildQueryHash(input, yearMin, yearMax, kmMin, kmMax);

    console.log(`[Estimate] Strategia "${strategy.label}": anni ${yearMin}-${yearMax}, km ${kmMin}-${kmMax}`);

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

        return {
          range_min: p25,
          range_max: p75,
          market_median: p50,
          dealer_buy_price: dealerPrice,
          p25,
          p50,
          p75,
          samples: cached.n_listings,
          samples_raw: cached.n_listings,
          n_dealers: cached.n_dealers,
          n_private: cached.n_private,
          iqr_ratio: cached.iqr_ratio,
          confidence: cached.iqr_ratio < 0.25 && cached.n_listings >= 30 ? 'alta' :
                     cached.iqr_ratio < 0.40 && cached.n_listings >= 10 ? 'media' : 'bassa',
          explanation: generateExplanation(
            input,
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
            filters_applied: [input.fuel, input.gearbox, input.variant, input.bodyType].filter(Boolean) as string[],
          },
        };
      }
    } catch (dbError) {
      console.warn('[Estimate] DB cache check failed:', dbError);
      // Continua senza cache
    }

    // STEP 2: Fetch data via aggregator (cache-first, AutoScout24 primario)
    console.log(`[Estimate] Fetching via aggregator...`);
    const aggregated = await aggregateListings(input, {
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
          brand: input.brand,
          model: input.model,
          yearMin,
          yearMax,
          kmMin,
          kmMax,
          fuel: input.fuel,
          gearbox: input.gearbox,
          variant: input.variant,
          bodyType: input.bodyType,
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

    return {
      range_min: p25,
      range_max: p75,
      market_median: p50,
      dealer_buy_price: dealerPrice,
      p25,
      p50,
      p75,
      samples: stats.nClean,
      samples_raw: stats.nRaw,
      n_dealers: stats.nDealers,
      n_private: stats.nPrivate,
      iqr_ratio: stats.iqrRatio,
      confidence: stats.confidence,
      explanation: generateExplanation(
        input,
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
        filters_applied: [input.fuel, input.gearbox, input.variant, input.bodyType].filter(Boolean) as string[],
      },
    };
  }

  // STEP 6: Nessun risultato con nessuna strategia
  // Verifica se il modello esiste
  const anyResult = await aggregateListings(input, {
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
      message: `Nessun ${input.brand} ${input.model} trovato in Italia.`,
      suggestion: 'Questo modello potrebbe non essere disponibile sul mercato italiano.',
    } as ValuationError;
  }

  return {
    error: true,
    message: 'Nessun annuncio corrisponde ai tuoi criteri.',
    suggestion: `Esistono ${anyListings.length} annunci di ${input.brand} ${input.model} ma con anno/km diversi. Prova a modificare i parametri.`,
  } as ValuationError;
}

/**
 * Type guard per errori
 */
export function isEstimateError(response: ValuationResponse): response is ValuationError {
  return 'error' in response && response.error === true;
}
