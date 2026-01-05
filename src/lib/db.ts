/**
 * Database client per Neon Postgres
 * Gestisce connessione e query per cache aggregati
 */

import { neon } from '@neondatabase/serverless';

// Tipo per connessione
type NeonClient = ReturnType<typeof neon>;

let sql: NeonClient | null = null;

/**
 * Ottiene client database (singleton)
 */
export function getDb(): NeonClient {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    sql = neon(databaseUrl);
  }
  return sql;
}

/**
 * Interfaccia per record cache
 */
export interface QueryStatsRecord {
  query_hash: string;
  filters_json: Record<string, unknown>;
  source: string;
  n_listings: number;
  p25: number;
  p50: number;
  p75: number;
  min_clean: number;
  max_clean: number;
  iqr_ratio: number;
  n_dealers: number;
  n_private: number;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

/**
 * Input per nuovo record cache
 */
export interface QueryStatsInput {
  queryHash: string;
  filters: Record<string, unknown>;
  source?: string;
  nListings: number;
  p25: number;
  p50: number;
  p75: number;
  minClean: number;
  maxClean: number;
  iqrRatio: number;
  nDealers?: number;
  nPrivate?: number;
  ttlHours?: number;
}

/**
 * Cerca record in cache
 */
export async function getCachedStats(
  queryHash: string
): Promise<QueryStatsRecord | null> {
  const db = getDb();

  const result = await db`
    SELECT *
    FROM query_stats
    WHERE query_hash = ${queryHash}
      AND expires_at > NOW()
    LIMIT 1
  ` as unknown as QueryStatsRecord[];

  if (!result || result.length === 0) {
    return null;
  }

  return result[0];
}

/**
 * Salva/aggiorna record in cache
 */
export async function upsertStats(input: QueryStatsInput): Promise<void> {
  const db = getDb();
  const ttlHours = input.ttlHours ?? 24;

  // Calcola expires_at in JS per evitare problemi con parametri bind
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await db`
    INSERT INTO query_stats (
      query_hash,
      filters_json,
      source,
      n_listings,
      p25,
      p50,
      p75,
      min_clean,
      max_clean,
      iqr_ratio,
      n_dealers,
      n_private,
      updated_at,
      expires_at
    ) VALUES (
      ${input.queryHash},
      ${JSON.stringify(input.filters)},
      ${input.source ?? 'autoscout24'},
      ${input.nListings},
      ${input.p25},
      ${input.p50},
      ${input.p75},
      ${input.minClean},
      ${input.maxClean},
      ${input.iqrRatio},
      ${input.nDealers ?? 0},
      ${input.nPrivate ?? 0},
      NOW(),
      ${expiresAt}
    )
    ON CONFLICT (query_hash) DO UPDATE SET
      filters_json = EXCLUDED.filters_json,
      n_listings = EXCLUDED.n_listings,
      p25 = EXCLUDED.p25,
      p50 = EXCLUDED.p50,
      p75 = EXCLUDED.p75,
      min_clean = EXCLUDED.min_clean,
      max_clean = EXCLUDED.max_clean,
      iqr_ratio = EXCLUDED.iqr_ratio,
      n_dealers = EXCLUDED.n_dealers,
      n_private = EXCLUDED.n_private,
      updated_at = NOW(),
      expires_at = ${expiresAt}
  `;
}

/**
 * Log richiesta scraping (per analytics/debug)
 */
export async function logScrape(
  source: string,
  endpoint: string,
  statusCode: number,
  responseTimeMs: number
): Promise<void> {
  const db = getDb();

  await db`
    INSERT INTO scrape_log (source, endpoint, status_code, response_time_ms)
    VALUES (${source}, ${endpoint}, ${statusCode}, ${responseTimeMs})
  `;
}

/**
 * Pulisce cache scaduta
 */
export async function cleanExpiredCache(): Promise<number> {
  const db = getDb();

  const result = await db`
    DELETE FROM query_stats
    WHERE expires_at < NOW()
    RETURNING query_hash
  ` as unknown as { query_hash: string }[];

  return result?.length ?? 0;
}

/**
 * Verifica se DB e disponibile
 */
export async function checkDbConnection(): Promise<boolean> {
  try {
    const db = getDb();
    await db`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
