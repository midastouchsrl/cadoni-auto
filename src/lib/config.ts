/**
 * Configurazione VibeCar
 * Tutti i parametri configurabili per la valutazione
 */

import { ValuationConfig } from './types';

// Configurazione di default per la valutazione
export const DEFAULT_VALUATION_CONFIG: ValuationConfig = {
  // Finestra temporale: ±1 anno
  yearWindow: 1,

  // Finestra km: ±15% del valore inserito
  kmWindowPercent: 0.15,

  // Outlier removal: escludi sotto P10 e sopra P90
  outlierLowPercentile: 10,
  outlierHighPercentile: 90,

  // Sconto dealer: 14% sotto la mediana (quindi * 0.86)
  dealerDiscountPercent: 0.14,

  // Aggiustamenti per condizione veicolo
  conditionAdjustments: {
    scarsa: -0.07,  // -7%
    normale: 0,     // 0%
    ottima: 0.05,   // +5%
  },

  // Soglie per livello di confidenza
  confidenceThresholds: {
    highSamples: 40,      // Almeno 40 samples per "alta"
    highMaxIqrRatio: 0.20, // IQR/median <= 20% per "alta"
    mediumSamples: 20,    // Almeno 20 samples per "media"
  },
};

// Marche auto comuni in Italia
export const MARCHE_AUTO = [
  'Abarth',
  'Alfa Romeo',
  'Audi',
  'BMW',
  'Chevrolet',
  'Citroen',
  'Dacia',
  'DS',
  'Fiat',
  'Ford',
  'Honda',
  'Hyundai',
  'Jaguar',
  'Jeep',
  'Kia',
  'Lancia',
  'Land Rover',
  'Lexus',
  'Mazda',
  'Mercedes-Benz',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Opel',
  'Peugeot',
  'Porsche',
  'Renault',
  'Seat',
  'Skoda',
  'Smart',
  'Subaru',
  'Suzuki',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
] as const;

// Tipi alimentazione
export const FUEL_TYPES = [
  { value: 'benzina', label: 'Benzina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gpl', label: 'GPL' },
  { value: 'metano', label: 'Metano' },
  { value: 'ibrida', label: 'Ibrida' },
  { value: 'elettrica', label: 'Elettrica' },
] as const;

// Tipi cambio
export const GEARBOX_TYPES = [
  { value: 'manuale', label: 'Manuale' },
  { value: 'automatico', label: 'Automatico' },
] as const;

// Condizioni veicolo
export const CONDITION_TYPES = [
  { value: 'scarsa', label: 'Scarsa', description: 'Usura evidente o interventi necessari' },
  { value: 'normale', label: 'Normale', description: 'Buone condizioni per età e chilometraggio' },
  { value: 'ottima', label: 'Ottima', description: 'Tenuta con cura, senza difetti rilevanti' },
] as const;

// Cache settings
export const CACHE_CONFIG = {
  // Cache HTTP: 24 ore + 1 ora stale-while-revalidate
  httpMaxAge: 86400,
  httpStaleWhileRevalidate: 3600,

  // LRU cache in-memory: max entries
  lruMaxSize: 500,

  // TTL cache in-memory: 24 ore in ms
  lruTtl: 24 * 60 * 60 * 1000,
};
