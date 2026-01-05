/**
 * Subito.it Data Source Adapter
 * Fonte secondaria per arricchire dati quando AutoScout24 ha pochi risultati
 *
 * IMPORTANTE: Questo adapter richiede Playwright (browser headless)
 * e deve essere usato SOLO in contesti background/worker, MAI in API routes
 */

import { CarListing, CarValuationInput, FuelType, GearboxType } from '../types';
import { valuationCache, generateCacheKey } from '../cache';
import { DataSourceAdapter, SearchParams } from './types';

// Pool di User-Agent realistici per evitare detection
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Mapping marche Subito.it (usano slug diversi)
const BRAND_SLUGS: Record<string, string> = {
  'abarth': 'abarth',
  'alfa romeo': 'alfa-romeo',
  'audi': 'audi',
  'bmw': 'bmw',
  'fiat': 'fiat',
  'ford': 'ford',
  'honda': 'honda',
  'hyundai': 'hyundai',
  'jeep': 'jeep',
  'kia': 'kia',
  'lancia': 'lancia',
  'mazda': 'mazda',
  'mercedes-benz': 'mercedes',
  'mini': 'mini',
  'nissan': 'nissan',
  'opel': 'opel',
  'peugeot': 'peugeot',
  'porsche': 'porsche',
  'renault': 'renault',
  'seat': 'seat',
  'skoda': 'skoda',
  'smart': 'smart',
  'toyota': 'toyota',
  'volkswagen': 'volkswagen',
  'volvo': 'volvo',
};

// Mapping alimentazione Subito.it
const FUEL_MAP: Record<FuelType, string> = {
  'benzina': 'benzina',
  'diesel': 'diesel',
  'gpl': 'gpl',
  'metano': 'metano',
  'ibrida': 'ibrida',
  'elettrica': 'elettrica',
};

// Mapping cambio
const GEARBOX_MAP: Record<GearboxType, string> = {
  'manuale': 'manuale',
  'automatico': 'automatico',
};

/**
 * Ottieni User-Agent random
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Costruisce URL ricerca Subito.it
 */
function buildSearchUrl(
  input: CarValuationInput,
  params: SearchParams
): string {
  const baseUrl = 'https://www.subito.it/annunci-italia/vendita/auto/';

  const queryParams = new URLSearchParams();

  // Query testuale (marca + modello)
  const brand = input.brand.toLowerCase();
  const model = input.model.toLowerCase();
  queryParams.set('q', `${brand} ${model}`);

  // Filtri anno
  queryParams.set('ys', String(params.yearMin)); // year start
  queryParams.set('ye', String(params.yearMax)); // year end

  // Filtri km (Subito usa km direttamente)
  queryParams.set('kms', String(params.kmMin)); // km start
  queryParams.set('kme', String(params.kmMax)); // km end

  // Ordinamento per rilevanza
  queryParams.set('order', 'datedesc');

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Parsing listing da HTML Subito.it
 * Subito usa struttura JSON-LD embedded nella pagina
 */
function parseListingsFromHtml(html: string): CarListing[] {
  const listings: CarListing[] = [];
  const seenIds = new Set<string>();

  try {
    // Cerca JSON-LD con dati annunci
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonContent = match.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
          const data = JSON.parse(jsonContent);

          // Cerca ItemList con offerte
          if (data['@type'] === 'ItemList' && data.itemListElement) {
            for (const item of data.itemListElement) {
              if (item.item && item.item['@type'] === 'Car') {
                const car = item.item;
                const id = car['@id'] || `subito-${Date.now()}-${Math.random()}`;

                if (seenIds.has(id)) continue;
                seenIds.add(id);

                const price = car.offers?.price || 0;
                if (price < 500 || price > 500000) continue;

                const mileage = car.mileageFromOdometer?.value || 0;
                const year = car.vehicleModelDate ? parseInt(car.vehicleModelDate, 10) : 0;

                listings.push({
                  guid: `subito-${id}`,
                  price: typeof price === 'number' ? price : parseInt(price, 10),
                  mileage: typeof mileage === 'number' ? mileage : parseInt(mileage, 10),
                  firstRegistration: year ? `01-${year}` : '',
                  fuelType: car.fuelType || '',
                  sellerType: 'p', // Subito è prevalentemente privati
                  source: 'subito',
                  year,
                  km: typeof mileage === 'number' ? mileage : parseInt(mileage, 10),
                });
              }
            }
          }
        } catch {
          // JSON parsing failed, try next
        }
      }
    }

    // Fallback: parsing DOM (più fragile ma backup)
    if (listings.length === 0) {
      // Pattern per estrarre prezzi da data attributes o classi note
      const pricePattern = /data-price="(\d+)"/g;
      const titlePattern = /data-item-id="([^"]+)"/g;

      let priceMatch;
      const prices: number[] = [];
      while ((priceMatch = pricePattern.exec(html)) !== null) {
        prices.push(parseInt(priceMatch[1], 10));
      }

      // Se troviamo prezzi, crea listing base
      for (const price of prices) {
        if (price >= 500 && price <= 500000) {
          const id = `subito-fallback-${price}-${Math.random().toString(36).slice(2, 6)}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            listings.push({
              guid: id,
              price,
              mileage: 0,
              firstRegistration: '',
              fuelType: '',
              sellerType: 'p',
              source: 'subito',
              year: 0,
              km: 0,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[Subito] Errore parsing:', error);
  }

  return listings;
}

/**
 * Subito.it Adapter
 * Richiede Playwright per rendering JavaScript
 */
export class SubitoAdapter implements DataSourceAdapter {
  name = 'subito';
  priority = 2; // Secondario
  requiresBrowser = true; // Richiede Playwright

  private playwright: typeof import('playwright') | null = null;
  private browser: import('playwright').Browser | null = null;

  /**
   * Inizializza Playwright (lazy loading)
   */
  private async initPlaywright(): Promise<void> {
    if (this.playwright) return;

    try {
      // Dynamic import per evitare errori in contesti browser
      this.playwright = await import('playwright');
      console.log('[Subito] Playwright caricato');
    } catch (error) {
      console.error('[Subito] Errore caricamento Playwright:', error);
      throw new Error('Playwright non disponibile');
    }
  }

  /**
   * Ottieni browser (riusa se possibile)
   */
  private async getBrowser(): Promise<import('playwright').Browser> {
    await this.initPlaywright();

    if (!this.browser || !this.browser.isConnected()) {
      console.log('[Subito] Avvio browser headless...');
      this.browser = await this.playwright!.chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }

    return this.browser;
  }

  /**
   * Chiudi browser
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[Subito] Browser chiuso');
    }
  }

  async fetchListings(
    input: CarValuationInput,
    params: SearchParams
  ): Promise<CarListing[]> {
    // Check cache first
    const cacheKey = generateCacheKey({
      source: 'subito',
      brand: input.brand.toLowerCase(),
      model: input.model.toLowerCase(),
      yearMin: params.yearMin,
      yearMax: params.yearMax,
      kmMin: params.kmMin,
      kmMax: params.kmMax,
      fuel: input.fuel,
      gearbox: input.gearbox,
    });

    const cached = valuationCache.get(cacheKey);
    if (cached) {
      console.log('[Subito] Cache hit');
      return JSON.parse(cached) as CarListing[];
    }

    console.log('[Subito] Avvio scraping con Playwright...');

    let context: import('playwright').BrowserContext | null = null;
    let page: import('playwright').Page | null = null;

    try {
      const browser = await this.getBrowser();
      const userAgent = getRandomUserAgent();

      context = await browser.newContext({
        userAgent,
        viewport: { width: 1920, height: 1080 },
        locale: 'it-IT',
      });

      page = await context.newPage();

      // Blocca risorse non necessarie per velocizzare
      await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico}', route => route.abort());
      await page.route('**/*google*', route => route.abort());
      await page.route('**/*facebook*', route => route.abort());
      await page.route('**/*analytics*', route => route.abort());

      const url = buildSearchUrl(input, params);
      console.log('[Subito] Navigazione a:', url);

      // Naviga con timeout esteso
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Attendi un po' per rendering JavaScript
      await page.waitForTimeout(2000 + Math.random() * 2000);

      // Prova ad accettare cookie se presente
      try {
        const cookieButton = page.locator('button:has-text("Accetta"), button:has-text("Accetto")');
        if (await cookieButton.isVisible({ timeout: 2000 })) {
          await cookieButton.click();
          await page.waitForTimeout(500);
        }
      } catch {
        // Cookie banner non presente o già accettato
      }

      // Ottieni HTML renderizzato
      const html = await page.content();
      const listings = parseListingsFromHtml(html);

      console.log(`[Subito] Trovati ${listings.length} annunci`);

      // Salva in cache
      if (listings.length > 0) {
        valuationCache.set(cacheKey, JSON.stringify(listings));
      }

      return listings;
    } catch (error) {
      console.error('[Subito] Errore scraping:', error);
      return [];
    } finally {
      // Cleanup
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.initPlaywright();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const subitoAdapter = new SubitoAdapter();
