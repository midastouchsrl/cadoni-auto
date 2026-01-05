/**
 * Data source per recuperare annunci auto
 *
 * Utilizziamo AutoScout24 Italia con gli ID precisi per marca/modello
 * per ricerche accurate (inclusi allestimenti AMG, RS, ecc.)
 */

import { CarListing, CarValuationInput, FuelType, GearboxType, PowerRangeType } from './types';
import { valuationCache, generateCacheKey } from './cache';
import { FUEL_MAP, GEARBOX_MAP } from './autoscout-data';
import { POWER_RANGES } from './config';

// Mapping marche per URL fallback (quando non abbiamo makeId)
const BRAND_SLUGS: Record<string, string> = {
  'abarth': 'abarth',
  'alfa romeo': 'alfa-romeo',
  'audi': 'audi',
  'bmw': 'bmw',
  'byd': 'byd',
  'chevrolet': 'chevrolet',
  'citroen': 'citroen',
  'cupra': 'cupra',
  'dacia': 'dacia',
  'ds': 'ds-automobiles',
  'ds automobiles': 'ds-automobiles',
  'fiat': 'fiat',
  'ford': 'ford',
  'genesis': 'genesis',
  'honda': 'honda',
  'hyundai': 'hyundai',
  'jaguar': 'jaguar',
  'jeep': 'jeep',
  'kia': 'kia',
  'lancia': 'lancia',
  'land rover': 'land-rover',
  'lexus': 'lexus',
  'mazda': 'mazda',
  'mercedes-benz': 'mercedes-benz',
  'mg': 'mg',
  'mini': 'mini',
  'mitsubishi': 'mitsubishi',
  'nissan': 'nissan',
  'opel': 'opel',
  'peugeot': 'peugeot',
  'polestar': 'polestar',
  'porsche': 'porsche',
  'renault': 'renault',
  'seat': 'seat',
  'skoda': 'skoda',
  'smart': 'smart',
  'ssangyong': 'ssangyong',
  'subaru': 'subaru',
  'suzuki': 'suzuki',
  'tesla': 'tesla',
  'toyota': 'toyota',
  'volkswagen': 'volkswagen',
  'volvo': 'volvo',
};

// Mapping alimentazione
const FUEL_SLUGS: Record<FuelType, string> = {
  'benzina': 'B',
  'diesel': 'D',
  'gpl': 'L',
  'metano': 'M',
  'ibrida': '2', // Ibrido benzina
  'elettrica': 'E',
};

// Mapping cambio
const GEARBOX_SLUGS: Record<GearboxType, string> = {
  'manuale': 'M',
  'automatico': 'A',
};

/**
 * Ottiene i range HP dalla configurazione
 */
function getPowerRangeParams(powerRange?: PowerRangeType): { hpFrom?: number; hpTo?: number } {
  if (!powerRange) return {};

  const range = POWER_RANGES.find(r => r.value === powerRange);
  if (!range || (range.hpFrom === 0 && range.hpTo === 0)) return {};

  return {
    hpFrom: range.hpFrom || undefined,
    hpTo: range.hpTo || undefined,
  };
}

/**
 * Costruisce l'URL di ricerca AutoScout24
 * Usa gli ID quando disponibili per ricerche precise
 */
function buildSearchUrl(
  input: CarValuationInput,
  yearMin: number,
  yearMax: number,
  kmMin: number,
  kmMax: number,
  page: number = 1,
  options?: { skipFuelFilter?: boolean }
): string {
  const params = new URLSearchParams({
    'cy': 'I', // Italia
    'fregfrom': String(yearMin),
    'fregto': String(yearMax),
    'kmfrom': String(kmMin),
    'kmto': String(kmMax),
    'gear': GEARBOX_SLUGS[input.gearbox] || 'M',
    'sort': 'standard',
    'desc': '0',
    'atype': 'C', // Solo auto
    'ustate': 'N,U', // Nuove e usate
    'size': '20', // Max risultati per pagina
    'page': String(page),
    'damaged_listing': 'exclude',
  });

  // Aggiungi filtro carburante solo se non skippiamo
  if (!options?.skipFuelFilter) {
    params.set('fuel', FUEL_SLUGS[input.fuel] || 'B');
  }

  // Aggiungi filtro potenza se presente
  const powerParams = getPowerRangeParams(input.powerRange);
  if (powerParams.hpFrom || powerParams.hpTo) {
    params.set('powertype', 'hp'); // Usa CV invece di kW
    if (powerParams.hpFrom) {
      params.set('powerfrom', String(powerParams.hpFrom));
    }
    if (powerParams.hpTo) {
      params.set('powerto', String(powerParams.hpTo));
    }
  }

  // Se abbiamo makeId e modelId, usa il formato mmm (più preciso)
  if (input.makeId && input.modelId) {
    params.set('mmm', `${input.makeId}|${input.modelId}|`);
    return `https://www.autoscout24.it/lst?${params.toString()}`;
  }

  // Fallback: usa slug marca/modello
  const brand = BRAND_SLUGS[input.brand.toLowerCase()] || input.brand.toLowerCase().replace(/\s+/g, '-');
  const model = input.model.toLowerCase().replace(/\s+/g, '-');

  return `https://www.autoscout24.it/lst/${brand}/${model}?${params.toString()}`;
}

/**
 * Estrae un attributo data-* da un blocco HTML
 */
function extractDataAttr(block: string, attr: string): string | null {
  const pattern = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = block.match(pattern);
  return match ? match[1] : null;
}

/**
 * Estrae listing completi dalla pagina HTML di AutoScout24
 * Usa i data-* attributes degli elementi <article>
 */
function extractListingsFromHtml(html: string): CarListing[] {
  const listings: CarListing[] = [];
  const seenGuids = new Set<string>();

  // Trova tutti i blocchi <article> che contengono data-price
  // Splittiamo per "<article" e poi cerchiamo i data attributes
  const articleBlocks = html.split('<article');

  for (const block of articleBlocks) {
    // Verifica che sia un listing (ha data-price)
    if (!block.includes('data-price=')) continue;

    // Estrai tutti i campi
    const guid = extractDataAttr(block, 'data-guid');
    const priceStr = extractDataAttr(block, 'data-price');
    const mileageStr = extractDataAttr(block, 'data-mileage');
    const firstReg = extractDataAttr(block, 'data-first-registration');
    const fuelType = extractDataAttr(block, 'data-fuel-type');
    const sellerType = extractDataAttr(block, 'data-seller-type');

    // Verifica campi obbligatori
    if (!priceStr) continue;

    const price = parseInt(priceStr, 10);
    if (price < 500 || price > 500000) continue;

    // Genera GUID se mancante
    const listingGuid = guid || `gen-${price}-${mileageStr || '0'}`;

    // Evita duplicati
    if (seenGuids.has(listingGuid)) continue;
    seenGuids.add(listingGuid);

    const mileage = mileageStr ? parseInt(mileageStr, 10) : 0;

    // Estrai anno da first-registration (formato MM-YYYY)
    let year = 0;
    if (firstReg) {
      const yearMatch = firstReg.match(/(\d{4})$/);
      year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
    }

    listings.push({
      guid: listingGuid,
      price,
      mileage,
      firstRegistration: firstReg || '',
      fuelType: fuelType || '',
      sellerType: (sellerType === 'p' ? 'p' : 'd') as 'd' | 'p',
      // Campi legacy per retrocompatibilita
      year,
      km: mileage,
    });
  }

  console.log(`[Extract] Trovati ${listings.length} listing con data attributes`);
  return listings;
}

/**
 * Fetch dei listing da AutoScout24 con caching (singola pagina)
 */
export async function fetchListings(
  input: CarValuationInput,
  yearMin: number,
  yearMax: number,
  kmMin: number,
  kmMax: number,
  page: number = 1
): Promise<CarListing[]> {
  // Genera chiave cache (include makeId/modelId se presenti)
  const cacheKey = generateCacheKey({
    brand: input.brand.toLowerCase(),
    model: input.model.toLowerCase(),
    makeId: input.makeId,
    modelId: input.modelId,
    yearMin,
    yearMax,
    kmMin,
    kmMax,
    fuel: input.fuel,
    gearbox: input.gearbox,
    page,
  });

  // Controlla cache
  const cached = valuationCache.get(cacheKey);
  if (cached) {
    console.log('[Cache] Hit per pagina', page);
    return JSON.parse(cached) as CarListing[];
  }

  console.log(`[Fetch] Richiesta a AutoScout24 pagina ${page}...`);

  const url = buildSearchUrl(input, yearMin, yearMax, kmMin, kmMax, page);
  console.log('[Fetch] URL:', url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[Fetch] Errore HTTP:', response.status);
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const listings = extractListingsFromHtml(html);

    console.log(`[Fetch] Pagina ${page}: trovati ${listings.length} annunci`);

    // Salva in cache
    valuationCache.set(cacheKey, JSON.stringify(listings));

    return listings;
  } catch (error) {
    console.error('[Fetch] Errore:', error);
    return [];
  }
}

/**
 * Fetch multipagina per ottenere più risultati
 */
export async function fetchListingsMultiPage(
  input: CarValuationInput,
  yearMin: number,
  yearMax: number,
  kmMin: number,
  kmMax: number,
  maxPages: number = 5
): Promise<CarListing[]> {
  const allListings: CarListing[] = [];
  const seenPrices = new Set<number>();

  for (let page = 1; page <= maxPages; page++) {
    const pageListings = await fetchListings(
      input,
      yearMin,
      yearMax,
      kmMin,
      kmMax,
      page
    );

    // Aggiungi i risultati evitando duplicati
    for (const listing of pageListings) {
      if (!seenPrices.has(listing.price)) {
        seenPrices.add(listing.price);
        allListings.push(listing);
      }
    }

    // Se questa pagina ha meno di 10 risultati, stop
    if (pageListings.length < 10) {
      console.log(`[Fetch] Pagina ${page} con pochi risultati, stop paginazione`);
      break;
    }

    // Pausa tra le richieste (rate limit: max 2 req/sec)
    if (page < maxPages) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[Fetch] Totale annunci unici: ${allListings.length}`);
  return allListings;
}

/**
 * Recupera le alimentazioni disponibili per un dato modello
 * Fa una ricerca senza filtro carburante ed estrae i tipi disponibili dagli annunci
 */
export async function fetchAvailableFuels(
  makeId: number,
  modelId: number
): Promise<string[]> {
  console.log(`[Fuels] Ricerca alimentazioni per make ${makeId}, model ${modelId}`);

  // Costruiamo un input minimale per la ricerca
  const input: CarValuationInput = {
    brand: '',
    model: '',
    makeId,
    modelId,
    year: 2020, // Anno medio per ricerca ampia
    km: 50000,
    fuel: 'benzina', // Verrà ignorato con skipFuelFilter
    gearbox: 'manuale',
  };

  // Finestra ampia: ultimi 10 anni, qualsiasi km
  const currentYear = new Date().getFullYear();
  const yearMin = currentYear - 10;
  const yearMax = currentYear;
  const kmMin = 0;
  const kmMax = 200000;

  // Costruisci URL senza filtro carburante
  const url = buildSearchUrl(input, yearMin, yearMax, kmMin, kmMax, 1, { skipFuelFilter: true });
  console.log('[Fuels] URL:', url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[Fuels] Errore HTTP:', response.status);
      return [];
    }

    const html = await response.text();
    const listings = extractListingsFromHtml(html);

    // Estrai i fuel types unici dagli annunci
    const fuelCodes = new Set<string>();
    for (const listing of listings) {
      if (listing.fuelType) {
        fuelCodes.add(listing.fuelType.toUpperCase());
      }
    }

    const fuels = Array.from(fuelCodes).sort();
    console.log(`[Fuels] Trovate ${fuels.length} alimentazioni:`, fuels);

    return fuels;
  } catch (error) {
    console.error('[Fuels] Errore:', error);
    return [];
  }
}
