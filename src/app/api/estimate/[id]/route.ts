/**
 * API Route: GET /api/estimate/[id]
 * Recupera una valutazione salvata per ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEstimateById } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: true, message: 'ID non valido' },
        { status: 400 }
      );
    }

    const estimate = await getEstimateById(id);

    if (!estimate) {
      return NextResponse.json(
        { error: true, message: 'Valutazione non trovata' },
        { status: 404 }
      );
    }

    // Transform DB record to API response format
    const filters = estimate.filters_json as {
      brand?: string;
      model?: string;
      year?: number;
      km?: number;
      fuel?: string;
      gearbox?: string;
      condition?: string;
      region?: string;
    };

    // Build response matching ValuationResult interface
    const response = {
      // Result data
      p25: estimate.p25,
      p50: estimate.p50,
      p75: estimate.p75,
      market_median: estimate.p50,
      range_min: estimate.p25,
      range_max: estimate.p75,
      min_clean: estimate.p25,
      max_clean: estimate.p75,
      dealer_buy_price: estimate.dealer_price,
      samples: estimate.n_used,
      samples_raw: estimate.n_total,
      confidence: estimate.confidence,
      iqr_ratio: estimate.iqr_ratio,
      cached: true, // Always true when loading from DB
      estimate_id: estimate.estimate_id,
      created_at: estimate.created_at,
      // Input data for display
      input: {
        brand: filters.brand || '',
        model: filters.model || '',
        year: String(filters.year || ''),
        km: String(filters.km || ''),
        fuel: filters.fuel || '',
        gearbox: filters.gearbox || '',
        condition: filters.condition || 'normale',
        region: filters.region || '',
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache 1 hour
      },
    });
  } catch (error) {
    console.error('[API Estimate] Error:', error);
    return NextResponse.json(
      { error: true, message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
