/**
 * Subito.it Data Source Adapter
 * Fonte secondaria per arricchire dati quando AutoScout24 ha pochi risultati
 *
 * IMPORTANTE: Questo adapter richiede Playwright (browser headless)
 * e deve essere usato SOLO in contesti background/worker, MAI in API routes
 *
 * Usa stealth mode per evitare detection anti-bot
 */

import { CarListing, CarValuationInput, FuelType, GearboxType } from '../types';
import { valuationCache, generateCacheKey } from '../cache';
import { DataSourceAdapter, SearchParams } from './types';

// Pool di User-Agent realistici (Chrome 120+ su diversi OS)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
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
 * Delay random per comportamento umano
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
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

  // Ordinamento per data
  queryParams.set('order', 'datedesc');

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Parsing listing da HTML Subito.it
 * Estrae dati dagli elementi della lista risultati
 */
function parseListingsFromHtml(html: string): CarListing[] {
  const listings: CarListing[] = [];
  const seenIds = new Set<string>();

  try {
    // Metodo 1: Cerca JSON-LD con dati annunci
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
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

    // Metodo 2: Pattern regex per estrarre prezzi da struttura HTML nota
    if (listings.length === 0) {
      // Pattern per item cards di Subito.it
      // Cerca prezzi nel formato €X.XXX o X.XXX €
      const pricePattern = /€\s*([\d.]+)|(\d{1,3}(?:\.\d{3})*)\s*€/g;
      let priceMatch;
      const prices: number[] = [];

      while ((priceMatch = pricePattern.exec(html)) !== null) {
        const priceStr = (priceMatch[1] || priceMatch[2]).replace(/\./g, '');
        const price = parseInt(priceStr, 10);
        if (price >= 500 && price <= 500000) {
          prices.push(price);
        }
      }

      // Rimuovi duplicati e crea listing
      const uniquePrices = [...new Set(prices)];
      console.log(`[Subito] Trovati ${uniquePrices.length} prezzi unici via regex`);

      for (const price of uniquePrices.slice(0, 50)) { // Max 50 per evitare falsi positivi
        const id = `subito-fallback-${price}-${Math.random().toString(36).slice(2, 8)}`;
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

    // Metodo 3: Cerca data-urn (ID annuncio Subito)
    if (listings.length === 0) {
      const urnPattern = /data-urn="urn:ad:(\d+)"/g;
      let urnMatch;
      const urns: string[] = [];

      while ((urnMatch = urnPattern.exec(html)) !== null) {
        urns.push(urnMatch[1]);
      }

      console.log(`[Subito] Trovati ${urns.length} annunci via data-urn`);
    }
  } catch (error) {
    console.error('[Subito] Errore parsing:', error);
  }

  return listings;
}

/**
 * Subito.it Adapter con Stealth Mode
 * Richiede Playwright per rendering JavaScript
 */
export class SubitoAdapter implements DataSourceAdapter {
  name = 'subito';
  priority = 2; // Secondario
  requiresBrowser = true; // Richiede Playwright

  private playwrightExtra: typeof import('playwright-extra') | null = null;
  private stealthPlugin: ReturnType<typeof import('puppeteer-extra-plugin-stealth')> | null = null;
  private browser: import('playwright').Browser | null = null;

  /**
   * Inizializza Playwright (standard, stealth via settings)
   */
  private async initPlaywright(): Promise<void> {
    if (this.playwrightExtra) return;

    try {
      // Usa playwright standard con impostazioni stealth manuali
      const playwright = await import('playwright');
      this.playwrightExtra = { chromium: playwright.chromium } as typeof import('playwright-extra');
      console.log('[Subito] Playwright caricato');
    } catch (error) {
      console.error('[Subito] Errore caricamento playwright:', error);
      throw error;
    }
  }

  /**
   * Ottieni browser con stealth settings
   */
  private async getBrowser(): Promise<import('playwright').Browser> {
    await this.initPlaywright();

    if (!this.browser || !this.browser.isConnected()) {
      console.log('[Subito] Avvio browser stealth...');

      // Args per massimizzare stealth
      const stealthArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        // Stealth args
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
      ];

      this.browser = await this.playwrightExtra!.chromium.launch({
        headless: true,
        args: stealthArgs,
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

    console.log('[Subito] Avvio scraping stealth...');

    let context: import('playwright').BrowserContext | null = null;
    let page: import('playwright').Page | null = null;

    try {
      const browser = await this.getBrowser();
      const userAgent = getRandomUserAgent();

      // Context con settings realistici
      context = await browser.newContext({
        userAgent,
        viewport: { width: 1920, height: 1080 },
        locale: 'it-IT',
        timezoneId: 'Europe/Rome',
        // Headers extra per sembrare un browser reale
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'max-age=0',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      page = await context.newPage();

      // Override navigator.webdriver
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        // Override permissions
        const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
        window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
            : originalQuery(parameters);
      });

      // Blocca solo tracker, non risorse che potrebbero essere necessarie per il rendering
      await page.route('**/*google-analytics*', route => route.abort());
      await page.route('**/*googletagmanager*', route => route.abort());
      await page.route('**/*facebook*', route => route.abort());
      await page.route('**/*doubleclick*', route => route.abort());

      // Visita homepage auto per sembrare navigazione naturale
      console.log('[Subito] Visita homepage auto...');
      await page.goto('https://www.subito.it/annunci-italia/vendita/auto/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Delay umano
      await randomDelay(2000, 4000);

      // Accetta cookies se presente
      try {
        const cookieButton = page.locator('button:has-text("Accetta"), button:has-text("Accetto"), #didomi-notice-agree-button, [data-testid="accept-button"]');
        if (await cookieButton.isVisible({ timeout: 3000 })) {
          await cookieButton.click();
          console.log('[Subito] Cookie accettato');
          await randomDelay(1000, 2000);
        }
      } catch {
        // Cookie banner non presente
      }

      // Check per Access Denied sulla homepage
      let pageTitle = await page.title();
      if (pageTitle.includes('Access Denied') || pageTitle.includes('Blocked')) {
        console.error('[Subito] Homepage bloccata da anti-bot');
        return [];
      }

      console.log('[Subito] Homepage caricata, titolo:', pageTitle);

      // Ora usa la barra di ricerca invece di URL diretta
      console.log('[Subito] Ricerca:', `${input.brand} ${input.model}`);

      // Trova input ricerca e inserisci query
      const searchInput = page.locator('input[type="search"], input[placeholder*="Cerca"], input[name="q"]').first();
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.click();
        await randomDelay(300, 600);
        await searchInput.fill(`${input.brand} ${input.model}`);
        await randomDelay(500, 1000);
        await page.keyboard.press('Enter');
        console.log('[Subito] Ricerca inviata');
      } else {
        // Fallback: naviga con URL ma da pagina già visitata
        console.log('[Subito] Input ricerca non trovato, uso URL');
        const url = buildSearchUrl(input, params);
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
      }

      // Attendi caricamento risultati
      await randomDelay(3000, 5000);

      // Delay per rendering JavaScript
      await randomDelay(2000, 4000);

      // Scroll per simulare comportamento umano e caricare lazy content
      await page.evaluate(() => {
        window.scrollTo({ top: 500, behavior: 'smooth' });
      });
      await randomDelay(1000, 2000);

      await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      await randomDelay(500, 1000);

      // Check per Access Denied
      pageTitle = await page.title();
      if (pageTitle.includes('Access Denied') || pageTitle.includes('Blocked')) {
        console.error('[Subito] Ricerca bloccata da anti-bot');
        return [];
      }

      console.log('[Subito] Pagina risultati, titolo:', pageTitle);

      // Ottieni HTML renderizzato
      const html = await page.content();

      // Debug: salva HTML per analisi
      if (html.includes('Access Denied')) {
        console.error('[Subito] Pagina contiene Access Denied');
        return [];
      }

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
