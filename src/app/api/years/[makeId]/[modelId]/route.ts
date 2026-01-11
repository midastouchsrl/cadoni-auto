/**
 * Model Production Years API
 * Returns valid production years for a specific make/model
 *
 * Strategy:
 * 1. Check static data first (instant, no scraping risk)
 * 2. If not found, fallback to AutoScout24 search to detect available years
 * 3. Cache results heavily (years don't change often)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getModelYears, hasModelYearData } from '@/lib/model-years';

// In-memory cache for fallback API results
const yearCache = new Map<string, { years: number[]; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Current year for calculations
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;  // Support vintage/classic cars

interface RouteParams {
  params: Promise<{
    makeId: string;
    modelId: string;
  }>;
}

/**
 * Fallback: Query AutoScout24 to find available years for a model
 * This makes a lightweight search request and extracts year info
 */
async function fetchYearsFromAutoScout(makeId: string, modelId: string): Promise<number[] | null> {
  try {
    // Use the search results page with year aggregation
    // This is a read-only search, minimal risk
    const url = `https://www.autoscout24.it/lst/${makeId}/${modelId}?atype=C&cy=I&desc=0&sort=standard&ustate=N%2CU`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.warn(`[Years API] AutoScout24 returned ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract __NEXT_DATA__ JSON which contains filter options
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);

    if (!nextDataMatch) {
      console.warn('[Years API] Could not find __NEXT_DATA__ in AutoScout24 response');
      return null;
    }

    const nextData = JSON.parse(nextDataMatch[1]);

    // Navigate to the year filter options
    // Path: props.pageProps.searchFilters.filters -> find yearFrom or year filter
    const filters = nextData?.props?.pageProps?.searchFilters?.filters;

    if (!filters || !Array.isArray(filters)) {
      console.warn('[Years API] Could not find filters in AutoScout24 data');
      return null;
    }

    // Find year filter (could be "fregfrom" or "year" depending on page)
    const yearFilter = filters.find(
      (f: { key?: string }) => f.key === 'fregfrom' || f.key === 'year' || f.key === 'fregto'
    );

    if (!yearFilter?.options || !Array.isArray(yearFilter.options)) {
      // Alternative: extract from search results - find min/max year in listings
      const listings = nextData?.props?.pageProps?.listings;

      if (listings && Array.isArray(listings) && listings.length > 0) {
        const years = new Set<number>();

        for (const listing of listings) {
          const year = listing?.vehicle?.firstRegistrationDate
            ? parseInt(listing.vehicle.firstRegistrationDate.substring(0, 4), 10)
            : listing?.vehicle?.year;

          if (year && year >= MIN_YEAR && year <= CURRENT_YEAR) {
            years.add(year);
          }
        }

        if (years.size > 0) {
          const minYear = Math.min(...years);
          const maxYear = Math.max(...years);

          // Generate full range from min to max
          const fullRange: number[] = [];
          for (let y = maxYear; y >= minYear; y--) {
            fullRange.push(y);
          }
          return fullRange;
        }
      }

      console.warn('[Years API] Could not extract year data from AutoScout24');
      return null;
    }

    // Extract years from filter options
    const years: number[] = [];
    for (const option of yearFilter.options) {
      const year = parseInt(option.value || option.label, 10);
      if (year && year >= MIN_YEAR && year <= CURRENT_YEAR) {
        years.push(year);
      }
    }

    // Sort descending (newest first)
    years.sort((a, b) => b - a);

    return years.length > 0 ? years : null;
  } catch (error) {
    console.error('[Years API] Error fetching from AutoScout24:', error);
    return null;
  }
}

/**
 * Get default years (fallback when nothing else works)
 */
function getDefaultYears(): number[] {
  const years: number[] = [];
  for (let year = CURRENT_YEAR; year >= MIN_YEAR; year--) {
    years.push(year);
  }
  return years;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { makeId, modelId } = await params;

  if (!makeId || !modelId) {
    return NextResponse.json(
      { error: true, message: 'makeId and modelId are required' },
      { status: 400 }
    );
  }

  const cacheKey = `${makeId}:${modelId}`;

  // 1. Check static data first (instant, no API calls)
  if (hasModelYearData(makeId, modelId)) {
    const years = getModelYears(makeId, modelId);
    return NextResponse.json({
      years,
      source: 'static',
      cached: false,
    });
  }

  // 2. Check in-memory cache for fallback results
  const cached = yearCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      years: cached.years,
      source: 'autoscout24',
      cached: true,
    });
  }

  // 3. Fallback: Query AutoScout24
  console.log(`[Years API] Fetching years from AutoScout24 for ${makeId}/${modelId}`);
  const autoScoutYears = await fetchYearsFromAutoScout(makeId, modelId);

  if (autoScoutYears && autoScoutYears.length > 0) {
    // Cache the result
    yearCache.set(cacheKey, {
      years: autoScoutYears,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      years: autoScoutYears,
      source: 'autoscout24',
      cached: false,
    });
  }

  // 4. Ultimate fallback: Return default years
  console.warn(`[Years API] No year data found for ${makeId}/${modelId}, using defaults`);
  const defaultYears = getDefaultYears();

  return NextResponse.json({
    years: defaultYears,
    source: 'default',
    cached: false,
  });
}
