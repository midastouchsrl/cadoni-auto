/**
 * AutoScout24 Data Source Adapter
 * Fonte primaria per valutazioni auto in Italia
 */

import { CarListing, CarValuationInput, FuelType, GearboxType, PowerRangeType } from '../types';
import { valuationCache, generateCacheKey } from '../cache';
import { POWER_RANGES } from '../config';
import { DataSourceAdapter, SearchParams } from './types';

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
  'ibrida': '2',
  'elettrica': 'E',
};

// Mapping cambio singolo
const GEARBOX_SLUGS: Record<GearboxType, string> = {
  'manuale': 'M',
  'automatico': 'A',
};

// Mapping cambio esteso - per "automatico" includiamo anche semiautomatico
const GEARBOX_SEARCH_CODES: Record<GearboxType, string[]> = {
  'manuale': ['M'],
  'automatico': ['A', 'S'],
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
 */
function buildSearchUrl(
  input: CarValuationInput,
  yearMin: number,
  yearMax: number,
  kmMin: number,
  kmMax: number,
  page: number = 1,
  options?: { skipFuelFilter?: boolean; gearCode?: string }
): string {
  const gearCode = options?.gearCode || GEARBOX_SLUGS[input.gearbox] || 'M';

  const params = new URLSearchParams({
    'cy': 'I',
    'fregfrom': String(yearMin),
    'fregto': String(yearMax),
    'kmfrom': String(kmMin),
    'kmto': String(kmMax),
    'gear': gearCode,
    'sort': 'standard',
    'desc': '0',
    'atype': 'C',
    'ustate': 'N,U',
    'size': '20',
    'page': String(page),
    'damaged_listing': 'exclude',
  });

  if (!options?.skipFuelFilter) {
    params.set('fuel', FUEL_SLUGS[input.fuel] || 'B');
  }

  const powerParams = getPowerRangeParams(input.powerRange);
  if (powerParams.hpFrom || powerParams.hpTo) {
    params.set('powertype', 'hp');
    if (powerParams.hpFrom) params.set('powerfrom', String(powerParams.hpFrom));
    if (powerParams.hpTo) params.set('powerto', String(powerParams.hpTo));
  }

  if (input.makeId && input.modelId) {
    params.set('mmm', `${input.makeId}|${input.modelId}|`);
    return `https://www.autoscout24.it/lst?${params.toString()}`;
  }

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
 * Estrae listing dalla pagina HTML di AutoScout24
 */
function extractListingsFromHtml(html: string): CarListing[] {
  const listings: CarListing[] = [];
  const seenGuids = new Set<string>();

  const articleBlocks = html.split('<article');

  for (const block of articleBlocks) {
    if (!block.includes('data-price=')) continue;

    const guid = extractDataAttr(block, 'data-guid');
    const priceStr = extractDataAttr(block, 'data-price');
    const mileageStr = extractDataAttr(block, 'data-mileage');
    const firstReg = extractDataAttr(block, 'data-first-registration');
    const fuelType = extractDataAttr(block, 'data-fuel-type');
    const sellerType = extractDataAttr(block, 'data-seller-type');

    if (!priceStr) continue;

    const price = parseInt(priceStr, 10);
    if (price < 500 || price > 500000) continue;

    const listingGuid = guid || `as24-${price}-${mileageStr || '0'}`;

    if (seenGuids.has(listingGuid)) continue;
    seenGuids.add(listingGuid);

    const mileage = mileageStr ? parseInt(mileageStr, 10) : 0;

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
      source: 'autoscout24',
      year,
      km: mileage,
    });
  }

  return listings;
}

/**
 * Fetch singola pagina da AutoScout24
 */
async function fetchPage(
  input: CarValuationInput,
  yearMin: number,
  yearMax: number,
  kmMin: number,
  kmMax: number,
  page: number,
  gearCode?: string
): Promise<CarListing[]> {
  const effectiveGearCode = gearCode || GEARBOX_SLUGS[input.gearbox] || 'M';
  const cacheKey = generateCacheKey({
    source: 'autoscout24',
    brand: input.brand.toLowerCase(),
    model: input.model.toLowerCase(),
    makeId: input.makeId,
    modelId: input.modelId,
    yearMin,
    yearMax,
    kmMin,
    kmMax,
    fuel: input.fuel,
    gearCode: effectiveGearCode,
    page,
  });

  const cached = valuationCache.get(cacheKey);
  if (cached) {
    console.log(`[AS24] Cache hit per pagina ${page}, gear=${effectiveGearCode}`);
    return JSON.parse(cached) as CarListing[];
  }

  console.log(`[AS24] Fetch pagina ${page}, gear=${effectiveGearCode}...`);

  const url = buildSearchUrl(input, yearMin, yearMax, kmMin, kmMax, page, { gearCode });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[AS24] Errore HTTP:', response.status);
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const listings = extractListingsFromHtml(html);

    console.log(`[AS24] Pagina ${page}: trovati ${listings.length} annunci`);

    valuationCache.set(cacheKey, JSON.stringify(listings));

    return listings;
  } catch (error) {
    console.error('[AS24] Errore:', error);
    return [];
  }
}

/**
 * AutoScout24 Adapter
 */
export class AutoScout24Adapter implements DataSourceAdapter {
  name = 'autoscout24';
  priority = 1;
  requiresBrowser = false;

  async fetchListings(
    input: CarValuationInput,
    params: SearchParams
  ): Promise<CarListing[]> {
    const { yearMin, yearMax, kmMin, kmMax, maxPages = 5 } = params;
    const allListings: CarListing[] = [];
    const seenGuids = new Set<string>();

    const gearCodes = GEARBOX_SEARCH_CODES[input.gearbox] || ['M'];

    console.log(`[AS24] Ricerca multi-cambio: ${gearCodes.join(', ')} per ${input.gearbox}`);

    for (const gearCode of gearCodes) {
      for (let page = 1; page <= maxPages; page++) {
        const pageListings = await fetchPage(
          input,
          yearMin,
          yearMax,
          kmMin,
          kmMax,
          page,
          gearCode
        );

        let addedThisPage = 0;
        for (const listing of pageListings) {
          if (!seenGuids.has(listing.guid)) {
            seenGuids.add(listing.guid);
            allListings.push(listing);
            addedThisPage++;
          }
        }

        console.log(`[AS24] gear=${gearCode} pagina ${page}: ${pageListings.length} trovati, ${addedThisPage} nuovi`);

        if (pageListings.length < 10) break;

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[AS24] Totale annunci unici: ${allListings.length}`);
    return allListings;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.autoscout24.it', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const autoscout24Adapter = new AutoScout24Adapter();

// Export per retrocompatibilità con datasource.ts esistente
export { fetchPage as fetchListings };
export async function fetchListingsMultiPage(
  input: CarValuationInput,
  yearMin: number,
  yearMax: number,
  kmMin: number,
  kmMax: number,
  maxPages: number = 5
): Promise<CarListing[]> {
  return autoscout24Adapter.fetchListings(input, {
    yearMin,
    yearMax,
    kmMin,
    kmMax,
    maxPages,
  });
}

// Export per API fuels
export async function fetchAvailableFuels(
  makeId: number,
  modelId: number
): Promise<string[]> {
  const input: CarValuationInput = {
    brand: '',
    model: '',
    makeId,
    modelId,
    year: 2020,
    km: 50000,
    fuel: 'benzina',
    gearbox: 'manuale',
  };

  const currentYear = new Date().getFullYear();
  const yearMin = currentYear - 10;
  const yearMax = currentYear;

  const params = new URLSearchParams({
    'cy': 'I',
    'fregfrom': String(yearMin),
    'fregto': String(yearMax),
    'kmfrom': '0',
    'kmto': '200000',
    'gear': 'M',
    'sort': 'standard',
    'desc': '0',
    'atype': 'C',
    'ustate': 'N,U',
    'size': '20',
    'page': '1',
    'damaged_listing': 'exclude',
    'mmm': `${makeId}|${modelId}|`,
  });

  const url = `https://www.autoscout24.it/lst?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const html = await response.text();
    const listings = extractListingsFromHtml(html);

    const fuelCodes = new Set<string>();
    for (const listing of listings) {
      if (listing.fuelType) {
        fuelCodes.add(listing.fuelType.toUpperCase());
      }
    }

    return Array.from(fuelCodes).sort();
  } catch (error) {
    console.error('[AS24] Errore fetch fuels:', error);
    return [];
  }
}
