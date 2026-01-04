/**
 * Funzioni statistiche per il calcolo della valutazione
 * Tutte le operazioni sono pure functions, facilmente testabili
 */

import {
  CarListing,
  PriceStats,
  ValuationResult,
  ConditionType,
  ConfidenceLevel,
  ValuationConfig,
} from './types';
import { DEFAULT_VALUATION_CONFIG } from './config';

/**
 * Calcola un percentile da un array ordinato di numeri
 * @param sortedArr Array già ordinato in ordine crescente
 * @param percentile Valore da 0 a 100
 */
export function percentile(sortedArr: number[], percentile: number): number {
  if (sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];

  const index = (percentile / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sortedArr.length) return sortedArr[sortedArr.length - 1];

  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

/**
 * Calcola la mediana di un array
 */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return percentile(sorted, 50);
}

/**
 * Rimuove gli outlier usando percentili
 * @param prices Array di prezzi
 * @param lowP Percentile basso (es. 10)
 * @param highP Percentile alto (es. 90)
 */
export function removeOutliers(
  prices: number[],
  lowP: number = 10,
  highP: number = 90
): number[] {
  if (prices.length < 5) {
    // Con pochi samples, non rimuoviamo outlier
    return prices;
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const lowThreshold = percentile(sorted, lowP);
  const highThreshold = percentile(sorted, highP);

  return prices.filter((p) => p >= lowThreshold && p <= highThreshold);
}

/**
 * Calcola tutte le statistiche di prezzo
 */
export function calculatePriceStats(prices: number[]): PriceStats {
  if (prices.length === 0) {
    return {
      prices: [],
      median: 0,
      p25: 0,
      p75: 0,
      iqr: 0,
      iqrRatio: 0,
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const med = percentile(sorted, 50);
  const p25 = percentile(sorted, 25);
  const p75 = percentile(sorted, 75);
  const iqr = p75 - p25;

  return {
    prices: sorted,
    median: med,
    p25,
    p75,
    iqr,
    iqrRatio: med > 0 ? iqr / med : 0,
  };
}

/**
 * Applica l'aggiustamento per condizione
 */
export function applyConditionAdjustment(
  price: number,
  condition: ConditionType | undefined,
  config: ValuationConfig = DEFAULT_VALUATION_CONFIG
): number {
  if (!condition || condition === 'normale') {
    return price;
  }
  const adjustment = config.conditionAdjustments[condition];
  return Math.round(price * (1 + adjustment));
}

/**
 * Calcola il prezzo dealer arrotondato ai 50€ più vicini
 */
export function calculateDealerPrice(
  median: number,
  config: ValuationConfig = DEFAULT_VALUATION_CONFIG
): number {
  const raw = median * (1 - config.dealerDiscountPercent);
  return Math.round(raw / 50) * 50;
}

/**
 * Determina il livello di confidenza
 */
export function determineConfidence(
  samples: number,
  iqrRatio: number,
  config: ValuationConfig = DEFAULT_VALUATION_CONFIG
): ConfidenceLevel {
  const { confidenceThresholds } = config;

  if (
    samples >= confidenceThresholds.highSamples &&
    iqrRatio <= confidenceThresholds.highMaxIqrRatio
  ) {
    return 'alta';
  }

  if (samples >= confidenceThresholds.mediumSamples) {
    return 'media';
  }

  return 'bassa';
}

/**
 * Genera la spiegazione in italiano
 */
export function generateExplanation(
  samples: number,
  confidence: ConfidenceLevel,
  yearWindow: [number, number],
  kmWindow: [number, number],
  condition?: ConditionType
): string {
  const parts: string[] = [];

  // Campione
  parts.push(`Valutazione basata su ${samples} annunci analizzati in Italia`);

  // Finestre di ricerca
  parts.push(
    `(anni ${yearWindow[0]}-${yearWindow[1]}, km ${formatNumber(
      kmWindow[0]
    )}-${formatNumber(kmWindow[1])})`
  );

  // Condizione
  if (condition && condition !== 'normale') {
    const adj = condition === 'scarsa' ? '-7%' : '+5%';
    parts.push(`. Applicato aggiustamento ${adj} per condizione ${condition}`);
  }

  // Confidenza
  const confDesc = {
    alta: 'Affidabilità alta: ampio campione con prezzi omogenei.',
    media: 'Affidabilità media: campione sufficiente.',
    bassa: 'Affidabilità bassa: pochi annunci trovati, valutazione indicativa.',
  };
  parts.push(`. ${confDesc[confidence]}`);

  return parts.join(' ');
}

/**
 * Formatta un numero con separatore migliaia
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('it-IT');
}

/**
 * Formatta un prezzo in euro
 */
export function formatPrice(n: number): string {
  return n.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Estrae i prezzi validi dai listing
 */
export function extractValidPrices(listings: CarListing[]): number[] {
  return listings
    .map((l) => l.price)
    .filter((p): p is number => typeof p === 'number' && p > 0 && !isNaN(p));
}

/**
 * Calcola la valutazione completa
 */
export function computeValuation(
  listings: CarListing[],
  input: {
    year: number;
    km: number;
    condition?: ConditionType;
  },
  config: ValuationConfig = DEFAULT_VALUATION_CONFIG
): ValuationResult | null {
  // Estrai prezzi validi
  const rawPrices = extractValidPrices(listings);

  if (rawPrices.length === 0) {
    return null;
  }

  // Rimuovi outlier se abbiamo abbastanza dati
  const cleanPrices = removeOutliers(
    rawPrices,
    config.outlierLowPercentile,
    config.outlierHighPercentile
  );

  // Calcola statistiche
  const stats = calculatePriceStats(cleanPrices);

  // Finestre di ricerca usate
  const yearMin = input.year - config.yearWindow;
  const yearMax = input.year + config.yearWindow;
  const kmDelta = Math.round(input.km * config.kmWindowPercent);
  const kmMin = Math.max(0, input.km - kmDelta);
  const kmMax = input.km + kmDelta;

  // Applica aggiustamento condizione
  const condAdj = input.condition || 'normale';
  const adjustedMedian = applyConditionAdjustment(stats.median, condAdj, config);
  const adjustedP25 = applyConditionAdjustment(stats.p25, condAdj, config);
  const adjustedP75 = applyConditionAdjustment(stats.p75, condAdj, config);

  // Calcola prezzo dealer
  const dealerPrice = calculateDealerPrice(adjustedMedian, config);

  // Determina confidenza
  const confidence = determineConfidence(
    cleanPrices.length,
    stats.iqrRatio,
    config
  );

  // Genera spiegazione
  const explanation = generateExplanation(
    cleanPrices.length,
    confidence,
    [yearMin, yearMax],
    [kmMin, kmMax],
    input.condition
  );

  // Filtri applicati
  const filters: string[] = [
    `Anno: ${yearMin}-${yearMax}`,
    `Km: ${formatNumber(kmMin)}-${formatNumber(kmMax)}`,
  ];

  return {
    range_min: adjustedP25,
    range_max: adjustedP75,
    market_median: adjustedMedian,
    dealer_buy_price: dealerPrice,
    samples: cleanPrices.length,
    confidence,
    explanation,
    computed_from: {
      year_window: [yearMin, yearMax],
      km_window: [kmMin, kmMax],
      filters_applied: filters,
    },
  };
}
