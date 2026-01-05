/**
 * Tipi per l'architettura multi-source
 * Supporta aggregazione da multiple fonti con fallback intelligente
 */

import { CarValuationInput, CarListing } from '../types';

/**
 * Parametri di ricerca normalizzati
 */
export interface SearchParams {
  yearMin: number;
  yearMax: number;
  kmMin: number;
  kmMax: number;
  maxPages?: number;
}

/**
 * Interface che ogni data source deve implementare
 */
export interface DataSourceAdapter {
  /** Nome identificativo della fonte (es. 'autoscout24', 'subito') */
  name: string;

  /** Priorità: 1 = primario (veloce), 2 = secondario (fallback) */
  priority: number;

  /** Se true, richiede browser headless (Playwright) */
  requiresBrowser: boolean;

  /**
   * Recupera listing dalla fonte
   * @returns Array di CarListing con source popolato
   */
  fetchListings(
    input: CarValuationInput,
    params: SearchParams
  ): Promise<CarListing[]>;

  /**
   * Health check - verifica se la fonte è raggiungibile
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Risultato aggregato da multiple fonti
 */
export interface AggregatedResult {
  /** Listing combinati e deduplicati */
  listings: CarListing[];

  /** Conteggio per fonte */
  sources: {
    [sourceName: string]: number;
  };

  /** True se è stato necessario usare fonti secondarie */
  enriched: boolean;

  /** Tempo totale di fetch in ms */
  fetchTimeMs: number;
}

/**
 * Richiesta in coda per background processing
 */
export interface QueuedRequest {
  id: string;
  input: CarValuationInput;
  params: SearchParams;
  source: string;
  createdAt: Date;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Configurazione per rate limiting
 */
export interface RateLimitConfig {
  /** Millisecondi minimi tra richieste alla stessa fonte */
  minDelayMs: number;

  /** Delay random aggiuntivo (0 a questo valore) */
  randomDelayMs: number;

  /** Massimo richieste per minuto */
  maxRequestsPerMinute: number;
}

/**
 * Configurazione aggregator
 */
export interface AggregatorConfig {
  /** Soglia minima risultati per non attivare fonti secondarie */
  minResultsThreshold: number;

  /** TTL cache in ore */
  cacheTtlHours: number;

  /** Rate limit per fonte */
  rateLimits: {
    [sourceName: string]: RateLimitConfig;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_AGGREGATOR_CONFIG: AggregatorConfig = {
  minResultsThreshold: 10,
  cacheTtlHours: 24,
  rateLimits: {
    autoscout24: {
      minDelayMs: 500,
      randomDelayMs: 500,
      maxRequestsPerMinute: 30,
    },
    subito: {
      minDelayMs: 10000, // 10 secondi minimo
      randomDelayMs: 5000, // + 0-5 sec random
      maxRequestsPerMinute: 6, // Max 6/min = 1 ogni 10 sec
    },
  },
};
