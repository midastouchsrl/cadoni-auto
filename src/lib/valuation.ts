/**
 * Servizio di valutazione principale
 * Orchestrazione del flusso: input -> fetch -> calcolo -> output
 */

import { CarValuationInput, ValuationResult, ValuationError, ValuationResponse } from './types';
import { DEFAULT_VALUATION_CONFIG } from './config';
import { fetchListingsMultiPage } from './datasource';
import { computeValuation } from './stats';
import { valuationCache, generateCacheKey } from './cache';

/**
 * Valida l'input del form
 */
export function validateInput(input: Partial<CarValuationInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.brand || input.brand.trim().length < 2) {
    errors.push('Marca non valida');
  }

  if (!input.model || input.model.trim().length < 1) {
    errors.push('Modello non valido');
  }

  const currentYear = new Date().getFullYear();
  if (!input.year || input.year < 1990 || input.year > currentYear + 1) {
    errors.push(`Anno deve essere tra 1990 e ${currentYear}`);
  }

  if (!input.km || input.km < 0 || input.km > 999999) {
    errors.push('Chilometraggio non valido');
  }

  if (!input.fuel) {
    errors.push('Seleziona il tipo di alimentazione');
  }

  if (!input.gearbox) {
    errors.push('Seleziona il tipo di cambio');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Configurazione finestra allargata per fallback
const EXTENDED_WINDOW = {
  yearWindow: 2,        // ±2 anni invece di ±1
  kmWindowPercent: 0.30, // ±30% invece di ±15%
};

/**
 * Esegue la valutazione completa con fallback automatico
 */
export async function performValuation(
  input: CarValuationInput
): Promise<ValuationResponse> {
  const config = DEFAULT_VALUATION_CONFIG;

  // Controlla cache per risultato completo
  const resultCacheKey = `result:${generateCacheKey(input as unknown as Record<string, unknown>)}`;
  const cachedResult = valuationCache.get(resultCacheKey);
  if (cachedResult) {
    console.log('[Valuation] Risultato da cache');
    return JSON.parse(cachedResult) as ValuationResult;
  }

  try {
    // STEP 1: Prova con finestra standard
    const yearMin = input.year - config.yearWindow;
    const yearMax = input.year + config.yearWindow;
    const kmDelta = Math.round(input.km * config.kmWindowPercent);
    const kmMin = Math.max(0, input.km - kmDelta);
    const kmMax = input.km + kmDelta;

    console.log(`[Valuation] Ricerca standard: anni ${yearMin}-${yearMax}, km ${kmMin}-${kmMax}`);

    let listings = await fetchListingsMultiPage(
      input,
      yearMin,
      yearMax,
      kmMin,
      kmMax
    );

    let usedExtendedWindow = false;

    // STEP 2: Se pochi risultati, prova con finestra allargata
    if (listings.length < 5) {
      const extYearMin = input.year - EXTENDED_WINDOW.yearWindow;
      const extYearMax = input.year + EXTENDED_WINDOW.yearWindow;
      const extKmDelta = Math.round(input.km * EXTENDED_WINDOW.kmWindowPercent);
      const extKmMin = Math.max(0, input.km - extKmDelta);
      const extKmMax = input.km + extKmDelta;

      console.log(`[Valuation] Pochi risultati (${listings.length}), allargo ricerca: anni ${extYearMin}-${extYearMax}, km ${extKmMin}-${extKmMax}`);

      const extendedListings = await fetchListingsMultiPage(
        input,
        extYearMin,
        extYearMax,
        extKmMin,
        extKmMax
      );

      if (extendedListings.length > listings.length) {
        listings = extendedListings;
        usedExtendedWindow = true;
      }
    }

    // STEP 3: Se ancora 0 risultati, il modello non è disponibile
    if (listings.length === 0) {
      // Prova a cercare solo il modello senza filtri anno/km per capire se esiste
      const anyListings = await fetchListingsMultiPage(
        input,
        1990,
        new Date().getFullYear() + 1,
        0,
        999999
      );

      if (anyListings.length === 0) {
        return {
          error: true,
          message: `Nessun ${input.brand} ${input.model} trovato in Italia.`,
          suggestion: 'Questo modello potrebbe non essere disponibile sul mercato italiano.',
        };
      } else {
        return {
          error: true,
          message: 'Nessun annuncio corrisponde ai tuoi criteri.',
          suggestion: `Esistono ${anyListings.length} annunci di ${input.brand} ${input.model} ma con anno/km diversi. Prova a modificare i parametri.`,
        };
      }
    }

    // Calcola valutazione con la config appropriata
    const effectiveConfig = usedExtendedWindow
      ? { ...config, yearWindow: EXTENDED_WINDOW.yearWindow, kmWindowPercent: EXTENDED_WINDOW.kmWindowPercent }
      : config;

    const result = computeValuation(
      listings,
      {
        year: input.year,
        km: input.km,
        condition: input.condition,
      },
      effectiveConfig
    );

    if (!result) {
      return {
        error: true,
        message: 'Impossibile calcolare la valutazione.',
        suggestion: 'I dati trovati non sono sufficienti per una stima affidabile.',
      };
    }

    // Aggiungi nota se usata finestra allargata
    if (usedExtendedWindow) {
      result.explanation = result.explanation.replace(
        'Valutazione basata su',
        'Valutazione basata su (con criteri allargati)'
      );
    }

    // Salva in cache
    valuationCache.set(resultCacheKey, JSON.stringify(result));

    return result;
  } catch (error) {
    console.error('[Valuation] Errore:', error);

    return {
      error: true,
      message: 'Si è verificato un errore durante la valutazione.',
      suggestion:
        'Il servizio potrebbe essere temporaneamente non disponibile. Riprova tra qualche minuto.',
    };
  }
}

/**
 * Verifica se una risposta è un errore
 */
export function isValuationError(
  response: ValuationResponse
): response is ValuationError {
  return 'error' in response && response.error === true;
}
