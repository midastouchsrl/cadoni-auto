/**
 * API Endpoint: Varianti disponibili per modello
 * GET /api/variants/:makeId/:modelId
 *
 * Restituisce le varianti/versioni (modelLines) disponibili per un dato modello
 * basandosi sull'API taxonomy di AutoScout24
 */

import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{
    makeId: string;
    modelId: string;
  }>;
}

interface ModelLineResponse {
  id: number;
  name: string;
  slug?: string;
}

// Cache in-memory per le varianti (24h)
const variantsCache = new Map<string, { data: ModelLineResponse[]; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore

/**
 * Fetch varianti dall'API taxonomy di AutoScout24
 */
async function fetchVariantsFromTaxonomy(
  makeId: number,
  modelId: number
): Promise<ModelLineResponse[]> {
  const cacheKey = `variants-${makeId}-${modelId}`;
  const cached = variantsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Variants API] Cache hit per make=${makeId}, model=${modelId}`);
    return cached.data;
  }

  console.log(`[Variants API] Fetching variants per make=${makeId}, model=${modelId}`);

  try {
    // Prova prima l'API taxonomy
    const taxonomyUrl = `https://www.autoscout24.it/as24-home/api/taxonomy/cars/makes/${makeId}/models/${modelId}/modelLines`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(taxonomyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'it-IT,it;q=0.9',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();

      // L'API potrebbe restituire un array diretto o un oggetto con modelLines
      const modelLines: ModelLineResponse[] = Array.isArray(data)
        ? data.map((item: { id: number; name: string; slug?: string }) => ({
            id: item.id,
            name: item.name,
            slug: item.slug || item.name.toLowerCase().replace(/\s+/g, '-'),
          }))
        : (data.modelLines || []).map((item: { id: number; name: string; slug?: string }) => ({
            id: item.id,
            name: item.name,
            slug: item.slug || item.name.toLowerCase().replace(/\s+/g, '-'),
          }));

      // Cache il risultato
      variantsCache.set(cacheKey, {
        data: modelLines,
        timestamp: Date.now(),
      });

      console.log(`[Variants API] Trovate ${modelLines.length} varianti via taxonomy`);
      return modelLines;
    }

    console.log(`[Variants API] Taxonomy API returned ${response.status}, trying scraping fallback`);
  } catch (error) {
    console.error('[Variants API] Taxonomy API error:', error);
  }

  // Fallback: scraping della pagina filtri
  return await fetchVariantsFromScraping(makeId, modelId);
}

/**
 * Fallback: estrae varianti dalla pagina di ricerca AutoScout24
 */
async function fetchVariantsFromScraping(
  makeId: number,
  modelId: number
): Promise<ModelLineResponse[]> {
  try {
    const searchUrl = `https://www.autoscout24.it/lst?mmm=${makeId}|${modelId}|&cy=I`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'it-IT,it;q=0.9',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`[Variants API] Scraping fallback returned ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Cerca il pattern per le versioni nel filtro
    // Pattern: data-testid="filter-version" con checkbox items
    const variants: ModelLineResponse[] = [];

    // Regex per estrarre varianti dal filtro versione
    // Pattern tipico: ve_<slug> con label associata
    const versionPattern = /ve_([a-z0-9-]+)[^>]*>([^<]+)</gi;
    let match;

    while ((match = versionPattern.exec(html)) !== null) {
      const slug = match[1];
      const name = match[2].trim();

      if (name && slug && !variants.find(v => v.slug === slug)) {
        variants.push({
          id: 0, // Non abbiamo l'ID numerico dallo scraping
          name,
          slug,
        });
      }
    }

    // Pattern alternativo: cerca nei link filtro
    const linkPattern = /\/lst\/[^/]+\/[^/]+\/ve_([a-z0-9-]+)/gi;
    while ((match = linkPattern.exec(html)) !== null) {
      const slug = match[1];
      if (!variants.find(v => v.slug === slug)) {
        // Converti slug in nome leggibile
        const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        variants.push({
          id: 0,
          name,
          slug,
        });
      }
    }

    const cacheKey = `variants-${makeId}-${modelId}`;
    variantsCache.set(cacheKey, {
      data: variants,
      timestamp: Date.now(),
    });

    console.log(`[Variants API] Trovate ${variants.length} varianti via scraping`);
    return variants;
  } catch (error) {
    console.error('[Variants API] Scraping fallback error:', error);
    return [];
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { makeId, modelId } = await params;

  // Valida parametri
  const makeIdNum = parseInt(makeId, 10);
  const modelIdNum = parseInt(modelId, 10);

  if (isNaN(makeIdNum) || isNaN(modelIdNum)) {
    return NextResponse.json(
      { error: 'makeId e modelId devono essere numeri validi' },
      { status: 400 }
    );
  }

  try {
    const variants = await fetchVariantsFromTaxonomy(makeIdNum, modelIdNum);

    return NextResponse.json({
      makeId: makeIdNum,
      modelId: modelIdNum,
      variants: variants.map(v => ({
        id: v.id || v.slug,
        name: v.name,
        slug: v.slug,
      })),
      count: variants.length,
    });
  } catch (error) {
    console.error('[Variants API] Errore:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle varianti' },
      { status: 500 }
    );
  }
}
