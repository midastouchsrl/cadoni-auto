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
  km: number;              // Chilometraggio (valore centrale o esatto)
  kmMin?: number;          // Km minimo (se range selezionato)
  kmMax?: number;          // Km massimo (se range selezionato)
  kmRangeType?: KmRangeType; // Tipo di input km usato
  fuel: FuelType;          // Alimentazione
  gearbox: GearboxType;    // Cambio
  condition?: ConditionType; // Condizione veicolo (opzionale)
  powerRange?: PowerRangeType; // Fascia di potenza (opzionale)
  variant?: string;        // ID variante/modelLineId (es. "4x4", "cross")
  bodyType?: BodyType;     // Tipo carrozzeria (opzionale)
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

// Fasce di potenza
export type PowerRangeType = '' | 'low' | 'medium-low' | 'medium' | 'medium-high' | 'high';

// Tipi carrozzeria (body types)
export type BodyType =
  | 'berlina'
  | 'sw'
  | 'coupe'
  | 'suv'
  | 'monovolume'
  | 'cabrio'
  | 'hatchback';

// Livello confidenza valutazione
export type ConfidenceLevel = 'bassa' | 'media' | 'alta';

// Fattore limitante per suggerimenti tattici
export type LimitingFactor =
  | 'km_range'      // Range km troppo stretto
  | 'year_range'    // Anno troppo specifico
  | 'variant'       // Variante rara
  | 'rare_car'      // Auto genuinamente rara (F40, ecc.)
  | 'filters'       // Combinazione filtri troppo restrittiva
  | null;           // Nessun fattore limitante

// Fascia chilometrica
export type KmRangeType =
  | '0-30000'
  | '30000-60000'
  | '60000-100000'
  | '100000-150000'
  | '150000+'
  | 'exact';        // Input esatto

// Risultato valutazione API
export interface ValuationResult {
  // Prezzi principali
  range_min: number;       // Prezzo minimo range (P25)
  range_max: number;       // Prezzo massimo range (P75)
  market_median: number;   // Mediana di mercato (P50)
  dealer_buy_price: number; // Prezzo ritiro diretto dealer (più basso)

  // Prezzi vendita dettagliati
  private_listing_price: number;  // Dove mettere annuncio privato (P75)
  private_closing_price: number;  // Chiusura realistica privato (P50)
  trade_in_price: number;         // Permuta (sopra ritiro, sotto P50)

  // Percentili dettagliati
  p25: number;
  p50: number;
  p75: number;

  // Estremi puliti (dopo rimozione outlier)
  min_clean?: number;
  max_clean?: number;

  // Statistiche campione
  samples: number;         // Numero annunci analizzati (dopo dedup)
  samples_raw: number;     // Numero annunci grezzi (prima dedup)
  n_dealers: number;       // Annunci da dealer
  n_private: number;       // Annunci da privati
  iqr_ratio: number;       // IQR/P50 - misura variabilita

  // Affidabilita
  confidence: ConfidenceLevel;
  explanation: string;     // Spiegazione in italiano
  limiting_factor?: LimitingFactor;      // Fattore che limita la precisione
  tactical_suggestion?: string;          // Suggerimento tattico per migliorare

  // Metadata
  updated_at: string;      // ISO timestamp ultimo aggiornamento
  cached: boolean;         // Se proveniente da cache
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

// Listing da data source (arricchito con campi verificati)
export interface CarListing {
  // Campi core (sempre presenti)
  guid: string;           // ID univoco per dedup
  price: number;          // Prezzo EUR
  mileage: number;        // Km (intero)
  firstRegistration: string; // MM-YYYY
  fuelType: string;       // Codice (b,d,l,m,e,2,3)
  sellerType: 'd' | 'p';  // Dealer o Privato
  source?: string;        // Fonte dati (autoscout24, subito, ecc.)

  // Campi legacy per retrocompatibilita
  year: number;
  km: number;
  fuel?: string;
  gearbox?: string;
  title?: string;
  url?: string;
}

// Configurazione valutazione
export interface ValuationConfig {
  yearWindow: number;           // ±anni da cercare (default: 1)
  kmWindowPercent: number;      // ±% km da cercare (default: 0.30)
  outlierLowPercentile: number; // Percentile basso da escludere (default: 10)
  outlierHighPercentile: number;// Percentile alto da escludere (default: 90)
  dealerDiscountPercent: number;// Sconto dealer ritiro diretto (default: 0.14 = 14%)
  tradeInDiscountPercent: number;// Sconto permuta (default: 0.07 = 7%)
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
