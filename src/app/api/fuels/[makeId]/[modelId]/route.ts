/**
 * API Endpoint: Alimentazioni disponibili per modello
 * GET /api/fuels/:makeId/:modelId
 *
 * Restituisce le alimentazioni effettivamente disponibili per un dato modello
 * basandosi sugli annunci reali di AutoScout24
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAvailableFuels } from '@/lib/datasource';
import { FUEL_CODE_TO_LABEL } from '@/lib/config';

interface RouteParams {
  params: Promise<{
    makeId: string;
    modelId: string;
  }>;
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
    // Recupera i codici carburante disponibili
    const fuelCodes = await fetchAvailableFuels(makeIdNum, modelIdNum);

    // Converti i codici in oggetti con value/label
    const fuels = fuelCodes
      .map((code) => {
        const mapping = FUEL_CODE_TO_LABEL[code];
        if (mapping) {
          return { value: mapping.value, label: mapping.label, code };
        }
        // Codice sconosciuto - skippa
        console.warn(`[Fuels API] Codice carburante sconosciuto: ${code}`);
        return null;
      })
      .filter((f): f is { value: string; label: string; code: string } => f !== null);

    // Se non troviamo alimentazioni, restituisci lista vuota (il frontend userà i default)
    if (fuels.length === 0) {
      console.log(`[Fuels API] Nessuna alimentazione trovata per make=${makeIdNum}, model=${modelIdNum}`);
    }

    return NextResponse.json({
      makeId: makeIdNum,
      modelId: modelIdNum,
      fuels,
      count: fuels.length,
    });
  } catch (error) {
    console.error('[Fuels API] Errore:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle alimentazioni' },
      { status: 500 }
    );
  }
}
