/**
 * Tipi per l'applicazione VibeCar
 * Valutazione auto usate basata su annunci di mercato
 */

// Input form utente
export interface CarValuationInput {
  brand: string;           // Marca (es. "Fiat", "Volkswagen")
  model: string;           // Modello (es. "Panda", "Golf")
  makeId?: number;         // ID marca AutoScout24 (opzionale, per ricerche precise)
  modelId?: number;        // ID modello AutoScout24 (opzionale, per ricerche precise)
  year: number;            // Anno immatricolazione
  km: number;              // Chilometraggio
  fuel: FuelType;          // Alimentazione
  gearbox: GearboxType;    // Cambio
  condition?: ConditionType; // Condizione veicolo (opzionale)
}

// Tipi alimentazione
export type FuelType =
  | 'benzina'
  | 'diesel'
  | 'gpl'
  | 'metano'
  | 'ibrida'
  | 'elettrica';

// Tipi cambio
export type GearboxType = 'manuale' | 'automatico';

// Condizione veicolo
export type ConditionType = 'scarsa' | 'normale' | 'ottima';

// Livello confidenza valutazione
export type ConfidenceLevel = 'bassa' | 'media' | 'alta';

// Risultato valutazione API
export interface ValuationResult {
  range_min: number;       // Prezzo minimo range (P25)
  range_max: number;       // Prezzo massimo range (P75)
  market_median: number;   // Mediana di mercato
  dealer_buy_price: number; // Prezzo acquisto concessionario
  samples: number;         // Numero annunci analizzati
  confidence: ConfidenceLevel;
  explanation: string;     // Spiegazione in italiano
  computed_from: {
    year_window: [number, number]; // [anno_min, anno_max]
    km_window: [number, number];   // [km_min, km_max]
    filters_applied: string[];
  };
}

// Errore API
export interface ValuationError {
  error: true;
  message: string;
  suggestion?: string;
}

// Risposta API unificata
export type ValuationResponse = ValuationResult | ValuationError;

// Listing da data source
export interface CarListing {
  price: number;
  year: number;
  km: number;
  fuel?: string;
  gearbox?: string;
  region?: string;
  title?: string;
  url?: string;
}

// Configurazione valutazione
export interface ValuationConfig {
  yearWindow: number;           // ±anni da cercare (default: 1)
  kmWindowPercent: number;      // ±% km da cercare (default: 0.30)
  outlierLowPercentile: number; // Percentile basso da escludere (default: 10)
  outlierHighPercentile: number;// Percentile alto da escludere (default: 90)
  dealerDiscountPercent: number;// Sconto dealer (default: 0.14 = 14%)
  conditionAdjustments: {
    scarsa: number;  // -7%
    normale: number; // 0%
    ottima: number;  // +5%
  };
  confidenceThresholds: {
    highSamples: number;        // Minimo samples per alta confidenza
    highMaxIqrRatio: number;    // Max IQR/median per alta confidenza
    mediumSamples: number;      // Minimo samples per media confidenza
  };
}

// Dati grezzi per calcolo statistiche
export interface PriceStats {
  prices: number[];
  median: number;
  p25: number;
  p75: number;
  iqr: number;
  iqrRatio: number; // IQR / median
}
