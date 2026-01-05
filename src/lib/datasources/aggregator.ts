/**
 * Aggregator Multi-Source
 * Logica cache-first con fallback intelligente a fonti secondarie
 *
 * Strategia:
 * 1. AutoScout24 (veloce, HTTP fetch)
 * 2. Se < 10 risultati → accoda richiesta Subito.it per background
 * 3. Background worker processa coda con rate limiting
 */

import { CarListing, CarValuationInput } from '../types';
import {
  DataSourceAdapter,
  SearchParams,
  AggregatedResult,
  AggregatorConfig,
  DEFAULT_AGGREGATOR_CONFIG,
  QueuedRequest,
} from './types';
import { autoscout24Adapter } from './autoscout24';

// Registry delle fonti disponibili
const adapters: Map<string, DataSourceAdapter> = new Map();

// Coda per richieste background (in-memory, per MVP)
const requestQueue: QueuedRequest[] = [];

// Timestamp ultima richiesta per rate limiting
const lastRequestTime: Map<string, number> = new Map();

/**
 * Registra un adapter
 */
export function registerAdapter(adapter: DataSourceAdapter): void {
  adapters.set(adapter.name, adapter);
  console.log(`[Aggregator] Registrato adapter: ${adapter.name} (priority: ${adapter.priority})`);
}

/**
 * Ottieni adapter per nome
 */
export function getAdapter(name: string): DataSourceAdapter | undefined {
  return adapters.get(name);
}

/**
 * Ottieni tutti gli adapter ordinati per priorità
 */
export function getAdaptersByPriority(): DataSourceAdapter[] {
  return Array.from(adapters.values()).sort((a, b) => a.priority - b.priority);
}

/**
 * Deduplicazione cross-source
 * Usa matching fuzzy: stesso prezzo ±5%, stesso anno, km simili ±10%
 */
function deduplicateCrossSource(listings: CarListing[]): CarListing[] {
  const unique: CarListing[] = [];
  const seen = new Set<string>();

  for (const listing of listings) {
    // Chiave primaria: GUID esatto
    if (seen.has(listing.guid)) continue;

    // Chiave secondaria: fingerprint fuzzy
    const fingerprint = `${Math.round(listing.price / 100)}-${listing.year}-${Math.round(listing.mileage / 1000)}`;

    if (seen.has(fingerprint)) {
      // Duplicato probabile, preferisci fonte primaria (autoscout24)
      const existing = unique.find(u =>
        `${Math.round(u.price / 100)}-${u.year}-${Math.round(u.mileage / 1000)}` === fingerprint
      );
      if (existing && existing.source === 'autoscout24') {
        continue; // Mantieni AutoScout24
      }
    }

    seen.add(listing.guid);
    seen.add(fingerprint);
    unique.push(listing);
  }

  return unique;
}

/**
 * Verifica rate limit per una fonte
 */
function checkRateLimit(sourceName: string, config: AggregatorConfig): boolean {
  const rateConfig = config.rateLimits[sourceName];
  if (!rateConfig) return true;

  const lastTime = lastRequestTime.get(sourceName) || 0;
  const elapsed = Date.now() - lastTime;
  const minDelay = rateConfig.minDelayMs + Math.random() * rateConfig.randomDelayMs;

  return elapsed >= minDelay;
}

/**
 * Aggiorna timestamp ultima richiesta
 */
function updateRateLimit(sourceName: string): void {
  lastRequestTime.set(sourceName, Date.now());
}

/**
 * Accoda richiesta per elaborazione background
 */
export function queueRequest(
  input: CarValuationInput,
  params: SearchParams,
  source: string
): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const request: QueuedRequest = {
    id,
    input,
    params,
    source,
    createdAt: new Date(),
    attempts: 0,
    status: 'pending',
  };

  requestQueue.push(request);
  console.log(`[Aggregator] Accodata richiesta ${id} per ${source}`);

  return id;
}

/**
 * Ottieni coda richieste pending
 */
export function getPendingRequests(): QueuedRequest[] {
  return requestQueue.filter(r => r.status === 'pending');
}

/**
 * Aggregatore principale - Cache-First con fallback intelligente
 */
export async function aggregateListings(
  input: CarValuationInput,
  params: SearchParams,
  config: AggregatorConfig = DEFAULT_AGGREGATOR_CONFIG
): Promise<AggregatedResult> {
  const startTime = Date.now();
  const sources: { [key: string]: number } = {};

  // STEP 1: Fonte primaria (AutoScout24 - veloce)
  console.log('[Aggregator] Step 1: Fetch da AutoScout24...');

  let primaryResults: CarListing[] = [];
  try {
    primaryResults = await autoscout24Adapter.fetchListings(input, params);
    sources['autoscout24'] = primaryResults.length;
  } catch (error) {
    console.error('[Aggregator] Errore AutoScout24:', error);
    sources['autoscout24'] = 0;
  }

  // STEP 2: Valuta se servono fonti secondarie
  if (primaryResults.length >= config.minResultsThreshold) {
    console.log(`[Aggregator] ${primaryResults.length} risultati sufficienti, skip fonti secondarie`);

    return {
      listings: primaryResults,
      sources,
      enriched: false,
      fetchTimeMs: Date.now() - startTime,
    };
  }

  // STEP 3: Pochi risultati - fetch sincrono da fonti secondarie
  console.log(`[Aggregator] Solo ${primaryResults.length} risultati, attivo fonti secondarie...`);

  // Trova fonti secondarie (priority > 1, che richiedono browser)
  const secondaryAdapters = getAdaptersByPriority().filter(a =>
    a.priority > 1 && a.requiresBrowser
  );

  // Registra Subito se non già fatto
  if (secondaryAdapters.length === 0) {
    await registerSubitoAdapter();
    const updatedAdapters = getAdaptersByPriority().filter(a =>
      a.priority > 1 && a.requiresBrowser
    );
    secondaryAdapters.push(...updatedAdapters);
  }

  let allListings = [...primaryResults];

  for (const adapter of secondaryAdapters) {
    // Check rate limit
    if (!checkRateLimit(adapter.name, config)) {
      console.log(`[Aggregator] Rate limit attivo per ${adapter.name}, skip`);
      sources[adapter.name] = 0;
      continue;
    }

    try {
      console.log(`[Aggregator] Fetch sincrono da ${adapter.name}...`);
      updateRateLimit(adapter.name);

      const listings = await adapter.fetchListings(input, params);
      sources[adapter.name] = listings.length;
      allListings.push(...listings);

      console.log(`[Aggregator] ${adapter.name}: ${listings.length} risultati`);
    } catch (error) {
      console.error(`[Aggregator] Errore ${adapter.name}:`, error);
      sources[adapter.name] = 0;
    }
  }

  // Deduplicazione cross-source
  const deduplicated = deduplicateCrossSource(allListings);

  return {
    listings: deduplicated,
    sources,
    enriched: secondaryAdapters.length > 0 && allListings.length > primaryResults.length,
    fetchTimeMs: Date.now() - startTime,
  };
}

/**
 * Aggregatore sincrono - Attende tutte le fonti (per background worker)
 * ATTENZIONE: Usa solo in contesti non-blocking (worker, cron job)
 */
export async function aggregateListingsSync(
  input: CarValuationInput,
  params: SearchParams,
  config: AggregatorConfig = DEFAULT_AGGREGATOR_CONFIG
): Promise<AggregatedResult> {
  const startTime = Date.now();
  const sources: { [key: string]: number } = {};
  const allListings: CarListing[] = [];

  // Fetch da tutte le fonti in parallelo (con rate limiting)
  const adaptersToUse = getAdaptersByPriority();

  for (const adapter of adaptersToUse) {
    // Check rate limit
    if (!checkRateLimit(adapter.name, config)) {
      console.log(`[Aggregator] Rate limit attivo per ${adapter.name}, skip`);
      sources[adapter.name] = 0;
      continue;
    }

    try {
      console.log(`[Aggregator] Fetch da ${adapter.name}...`);
      updateRateLimit(adapter.name);

      const listings = await adapter.fetchListings(input, params);
      sources[adapter.name] = listings.length;
      allListings.push(...listings);

      console.log(`[Aggregator] ${adapter.name}: ${listings.length} risultati`);
    } catch (error) {
      console.error(`[Aggregator] Errore ${adapter.name}:`, error);
      sources[adapter.name] = 0;
    }
  }

  // Deduplicazione cross-source
  const deduplicated = deduplicateCrossSource(allListings);

  return {
    listings: deduplicated,
    sources,
    enriched: Object.keys(sources).length > 1,
    fetchTimeMs: Date.now() - startTime,
  };
}

// Import lazy di Subito per evitare problemi con Playwright in contesti API
let subitoRegistered = false;

/**
 * Registra Subito.it adapter (lazy, per background worker)
 */
export async function registerSubitoAdapter(): Promise<void> {
  if (subitoRegistered) return;

  try {
    const { subitoAdapter } = await import('./subito');
    registerAdapter(subitoAdapter);
    subitoRegistered = true;
    console.log('[Aggregator] Subito adapter registrato');
  } catch (error) {
    console.warn('[Aggregator] Subito adapter non disponibile:', error);
  }
}

// Registra AutoScout24 come fonte primaria (sempre disponibile)
registerAdapter(autoscout24Adapter);

// Export per uso diretto
export { autoscout24Adapter };
