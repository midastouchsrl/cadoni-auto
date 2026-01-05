/**
 * Data Sources Module
 * Esporta tutti gli adapter e l'aggregator
 */

// Types
export * from './types';

// Adapters (AutoScout24 sempre disponibile)
export { autoscout24Adapter, fetchAvailableFuels } from './autoscout24';

// Subito adapter disponibile solo via import dinamico per evitare errori Playwright in build
// Usare: const { subitoAdapter } = await import('@/lib/datasources/subito')

// Aggregator
export {
  aggregateListings,
  aggregateListingsSync,
  registerAdapter,
  registerSubitoAdapter,
  getAdapter,
  getAdaptersByPriority,
  queueRequest,
  getPendingRequests,
} from './aggregator';

// Retrocompatibilità con vecchio datasource.ts
export { fetchListingsMultiPage } from './autoscout24';
