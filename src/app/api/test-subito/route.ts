/**
 * Test endpoint per Subito.it adapter con stealth mode
 * Solo per debug/sviluppo - NON usare in produzione
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerSubitoAdapter, aggregateListingsSync } from '@/lib/datasources';
import { CarValuationInput } from '@/lib/types';
import { SearchParams } from '@/lib/datasources/types';

export async function GET(request: NextRequest) {
  // Solo in dev
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  // Parametri da query string o default
  const brand = searchParams.get('brand') || 'Fiat';
  const model = searchParams.get('model') || 'Panda';
  const year = parseInt(searchParams.get('year') || '2018', 10);

  console.log(`[Test Subito] Avvio test stealth per ${brand} ${model}...`);

  try {
    // Registra Subito adapter
    await registerSubitoAdapter();

    const input: CarValuationInput = {
      brand,
      model,
      year,
      mileage: 80000,
      fuel: 'benzina',
      gearbox: 'manuale',
    };

    const params: SearchParams = {
      yearMin: year - 1,
      yearMax: year + 1,
      kmMin: 40000,
      kmMax: 120000,
    };

    console.log('[Test Subito] Fetching da tutte le fonti con stealth...');

    // Usa aggregateListingsSync che chiama tutte le fonti
    const result = await aggregateListingsSync(input, params);

    console.log('[Test Subito] Risultato:', {
      totalListings: result.listings.length,
      sources: result.sources,
      enriched: result.enriched,
      fetchTimeMs: result.fetchTimeMs,
    });

    return NextResponse.json({
      success: true,
      input,
      params,
      result: {
        totalListings: result.listings.length,
        sources: result.sources,
        enriched: result.enriched,
        fetchTimeMs: result.fetchTimeMs,
        // Primi 10 listing per debug
        sampleListings: result.listings.slice(0, 10).map(l => ({
          price: l.price,
          year: l.year,
          km: l.km,
          source: l.source,
        })),
      },
    });
  } catch (error) {
    console.error('[Test Subito] Errore:', error);
    return NextResponse.json(
      { error: 'Test failed', details: String(error) },
      { status: 500 }
    );
  }
}
