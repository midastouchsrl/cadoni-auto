/**
 * Data source per recuperare annunci auto
 *
 * DEPRECATO: Questo file è mantenuto per retrocompatibilità.
 * Usare import da './datasources' per nuove implementazioni.
 */

// Re-export tutto dal nuovo modulo
export {
  fetchListingsMultiPage as fetchListings,
  fetchListingsMultiPage,
  fetchAvailableFuels,
} from './datasources/autoscout24';
