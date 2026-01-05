/**
 * Background Worker API Route
 * Elabora la coda di richieste per fonti secondarie (Subito.it)
 *
 * Chiamare con cron job: ogni 5 minuti
 * Vercel: vercel.json -> crons: [{ path: "/api/worker/process-queue", schedule: "0/5 * * * *" }]
 *
 * Protezione: richiede header Authorization con secret
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPendingRequests,
  registerSubitoAdapter,
  aggregateListingsSync,
} from '@/lib/datasources';
import { upsertStats, QueryStatsInput } from '@/lib/db';
import { computeRobustStats, generateQueryHash } from '@/lib/robust-stats';

// Secret per autorizzazione (imposta in .env)
const WORKER_SECRET = process.env.WORKER_SECRET || 'dev-secret-change-me';

// Max richieste da processare per invocazione (evita timeout)
const MAX_REQUESTS_PER_RUN = 5;

export async function GET(request: NextRequest) {
  // Verifica autorizzazione
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (providedSecret !== WORKER_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[Worker] Avvio elaborazione coda...');

  try {
    // Registra Subito adapter (richiede Playwright)
    await registerSubitoAdapter();

    // Ottieni richieste pending
    const pendingRequests = getPendingRequests();

    if (pendingRequests.length === 0) {
      console.log('[Worker] Nessuna richiesta in coda');
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending requests',
      });
    }

    console.log(`[Worker] ${pendingRequests.length} richieste in coda`);

    // Processa fino a MAX_REQUESTS_PER_RUN
    const toProcess = pendingRequests.slice(0, MAX_REQUESTS_PER_RUN);
    const results: { id: string; status: string; listings?: number }[] = [];

    for (const req of toProcess) {
      console.log(`[Worker] Elaboro richiesta ${req.id} per ${req.source}...`);

      try {
        // Fetch da tutte le fonti (sincrono, include Subito)
        const aggregated = await aggregateListingsSync(req.input, req.params);

        if (aggregated.listings.length > 0) {
          // Calcola statistiche
          const stats = computeRobustStats(aggregated.listings);

          if (stats && stats.nClean >= 3) {
            // Genera hash query per cache
            const queryHash = generateQueryHash({
              brand: req.input.brand.toLowerCase(),
              model: req.input.model.toLowerCase(),
              yearMin: req.params.yearMin,
              yearMax: req.params.yearMax,
              kmMin: req.params.kmMin,
              kmMax: req.params.kmMax,
              fuel: req.input.fuel,
              gearbox: req.input.gearbox,
            });

            // Salva in DB con fonte 'aggregated'
            const cacheInput: QueryStatsInput = {
              queryHash,
              filters: {
                brand: req.input.brand,
                model: req.input.model,
                yearMin: req.params.yearMin,
                yearMax: req.params.yearMax,
                kmMin: req.params.kmMin,
                kmMax: req.params.kmMax,
                fuel: req.input.fuel,
                gearbox: req.input.gearbox,
              },
              source: 'aggregated',
              nListings: stats.nClean,
              p25: stats.p25,
              p50: stats.p50,
              p75: stats.p75,
              minClean: stats.minClean,
              maxClean: stats.maxClean,
              iqrRatio: stats.iqrRatio,
              nDealers: stats.nDealers,
              nPrivate: stats.nPrivate,
              ttlHours: 24,
            };

            await upsertStats(cacheInput);
            console.log(`[Worker] Cache aggiornata per ${req.id}`);
          }
        }

        results.push({
          id: req.id,
          status: 'completed',
          listings: aggregated.listings.length,
        });

        // Rate limiting tra richieste
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Worker] Errore elaborazione ${req.id}:`, error);
        results.push({
          id: req.id,
          status: 'failed',
        });
      }
    }

    console.log(`[Worker] Completato: ${results.length} richieste elaborate`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      remaining: pendingRequests.length - results.length,
      results,
    });
  } catch (error) {
    console.error('[Worker] Errore generale:', error);
    return NextResponse.json(
      { error: 'Worker execution failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Anche POST per flessibilità
export async function POST(request: NextRequest) {
  return GET(request);
}
