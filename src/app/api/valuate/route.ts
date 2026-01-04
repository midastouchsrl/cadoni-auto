/**
 * API Route: POST /api/valuate
 * Endpoint principale per la valutazione auto
 */

import { NextRequest, NextResponse } from 'next/server';
import { CarValuationInput } from '@/lib/types';
import { validateInput, performValuation, isValuationError } from '@/lib/valuation';
import { getCacheHeaders } from '@/lib/cache';

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

    // Esegui valutazione
    const result = await performValuation(input as CarValuationInput);

    // Se errore, ritorna senza cache
    if (isValuationError(result)) {
      return NextResponse.json(result, { status: 422 });
    }

    // Successo: ritorna con cache headers
    return NextResponse.json(result, {
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
