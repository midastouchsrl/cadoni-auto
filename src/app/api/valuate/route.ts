/**
 * API Route: POST /api/valuate
 * Endpoint principale per la valutazione auto
 */

import { NextRequest, NextResponse } from 'next/server';
import { CarValuationInput, ValuationResult } from '@/lib/types';
import { validateInput } from '@/lib/valuation';
import { getOrComputeEstimate, isEstimateError } from '@/lib/estimate';
import { getCacheHeaders } from '@/lib/cache';
import { saveEstimate } from '@/lib/db';
import { generateQueryHash } from '@/lib/robust-stats';

export async function POST(request: NextRequest) {
  try {
    // Parse body
    const body = await request.json();

    // Costruisci input
    const input: Partial<CarValuationInput> = {
      brand: body.brand,
      model: body.model,
      makeId: body.makeId ? parseInt(body.makeId, 10) : undefined,
      modelId: body.modelId ? parseInt(body.modelId, 10) : undefined,
      year: parseInt(body.year, 10),
      km: parseInt(body.km, 10),
      fuel: body.fuel,
      gearbox: body.gearbox,
      condition: body.condition || 'normale',
    };

    // Campi opzionali per tracciamento e persistenza
    const estimateId = body.estimate_id;
    const anonId = body.anon_id;
    const originRef = body.origin_ref;
    const originSid = body.origin_sid;
    const region = body.region;

    // Valida input
    const validation = validateInput(input);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: true,
          message: 'Dati non validi',
          suggestion: validation.errors.join('. '),
        },
        { status: 400 }
      );
    }

    // Esegui valutazione con nuovo servizio
    const result = await getOrComputeEstimate(input as CarValuationInput);

    // Se errore, ritorna senza cache
    if (isEstimateError(result)) {
      return NextResponse.json(result, { status: 422 });
    }

    // Cast to ValuationResult for type safety
    const valuationResult = result as ValuationResult;

    // Salva estimate nel DB se abbiamo estimate_id e anon_id
    if (estimateId && anonId) {
      try {
        const queryHash = generateQueryHash({
          brand: (input.brand || '').toLowerCase(),
          model: (input.model || '').toLowerCase(),
          yearMin: input.year! - 1,
          yearMax: input.year! + 1,
          kmMin: Math.max(0, input.km! - Math.round(input.km! * 0.15)),
          kmMax: input.km! + Math.round(input.km! * 0.15),
          fuel: input.fuel,
          gearbox: input.gearbox,
        });

        await saveEstimate({
          estimateId,
          anonId,
          queryHash,
          filters: {
            brand: input.brand,
            model: input.model,
            year: input.year,
            km: input.km,
            fuel: input.fuel,
            gearbox: input.gearbox,
            condition: input.condition,
            region: region || null,
          },
          nTotal: valuationResult.samples_raw || valuationResult.samples,
          nUsed: valuationResult.samples,
          confidence: valuationResult.confidence,
          cached: valuationResult.cached,
          p25: valuationResult.p25,
          p50: valuationResult.p50,
          p75: valuationResult.p75,
          dealerPrice: valuationResult.dealer_buy_price,
          dealerGap: valuationResult.p50 - valuationResult.dealer_buy_price,
          iqrRatio: valuationResult.iqr_ratio || 0,
          originRef,
          originSid,
        });

        console.log(`[API] Estimate ${estimateId} salvato nel DB`);
      } catch (dbError) {
        // Non bloccare la risposta se il salvataggio fallisce
        console.warn('[API] Errore salvataggio estimate:', dbError);
      }
    }

    // Aggiungi estimate_id alla risposta se fornito
    const responseData = estimateId
      ? { ...valuationResult, estimate_id: estimateId }
      : valuationResult;

    // Successo: ritorna con cache headers
    return NextResponse.json(responseData, {
      status: 200,
      headers: getCacheHeaders(),
    });
  } catch (error) {
    console.error('[API] Errore:', error);

    return NextResponse.json(
      {
        error: true,
        message: 'Errore interno del server',
        suggestion: 'Riprova tra qualche istante.',
      },
      { status: 500 }
    );
  }
}

// Gestisci anche GET per test semplici
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API VibeCar attiva. Usa POST con i parametri del veicolo.',
    example: {
      brand: 'Fiat',
      model: 'Panda',
      year: 2020,
      km: 50000,
      fuel: 'benzina',
      gearbox: 'manuale',
      condition: 'normale',
    },
  });
}
