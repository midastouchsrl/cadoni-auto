'use client';

/**
 * VibeCar Valuation Result Display
 * Premium result visualization with analytics tracking
 */

import { useEffect } from 'react';
import { ValuationResult } from '@/lib/types';
import { formatPrice, formatNumber } from '@/lib/robust-stats';
import {
  trackEstimateCompleted,
  trackShareClicked,
  trackShareCompleted,
  getEstimateTimeMs,
  generateShareUrl,
} from '@/lib/analytics';
import LeadForm from './LeadForm';

/**
 * Format date in Italian format
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

interface Props {
  result: ValuationResult;
  input: {
    brand: string;
    model: string;
    year: string;
    km: string;
    fuel: string;
    gearbox: string;
    condition: string;
  };
}

export default function ValuationResultDisplay({ result, input }: Props) {
  // Track estimate completion on mount
  useEffect(() => {
    const p50 = result.p50 || result.market_median;
    const dealerPrice = result.dealer_buy_price;
    trackEstimateCompleted({
      brand: input.brand,
      model: input.model,
      year: parseInt(input.year, 10),
      confidence: result.confidence,
      n_used: result.samples,
      n_total: result.samples_raw || result.samples,
      cached: result.cached,
      p25: result.p25 || result.range_min,
      p50,
      p75: result.p75 || result.range_max,
      dealer_price: dealerPrice,
      dealer_gap: p50 - dealerPrice,
      iqr_ratio: result.iqr_ratio || 0,
      time_to_result_ms: getEstimateTimeMs(),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Share tracking helper
  const handleShare = (type: 'link' | 'image' | 'whatsapp') => {
    const shareProps = {
      type,
      brand: input.brand,
      model: input.model,
      year: parseInt(input.year, 10),
      confidence: result.confidence,
    };
    trackShareClicked(shareProps);
    return shareProps;
  };

  const confidenceBadge = {
    alta: {
      bg: 'bg-[var(--success-muted)]',
      border: 'border-[var(--success)]/30',
      text: 'text-[var(--success)]',
      label: 'Alta affidabilità',
      dot: 'bg-[var(--success)]',
    },
    media: {
      bg: 'bg-[var(--warning-muted)]',
      border: 'border-[var(--warning)]/30',
      text: 'text-[var(--warning)]',
      label: 'Media affidabilità',
      dot: 'bg-[var(--warning)]',
    },
    bassa: {
      bg: 'bg-[var(--error-muted)]',
      border: 'border-[var(--error)]/30',
      text: 'text-[var(--error)]',
      label: 'Bassa affidabilità',
      dot: 'bg-[var(--error)]',
    },
  }[result.confidence];

  return (
    <div className="space-y-6">
      {/* Car info header */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate text-[var(--text-primary)]">
              {input.brand} {input.model}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-[var(--text-secondary)]">
              <span>{input.year}</span>
              <span className="w-1 h-1 rounded-full bg-[var(--obsidian-400)]" />
              <span>{input.km} km</span>
              <span className="w-1 h-1 rounded-full bg-[var(--obsidian-400)]" />
              <span className="capitalize">{input.fuel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main value card - Modern gradient design */}
      <div className="relative overflow-hidden rounded-2xl opacity-0 animate-fade-in-up animate-delay-100 border border-[var(--glass-border)]">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')] opacity-[0.06]" />

        <div className="relative p-6 md:p-8">
          {/* Top label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
            <p className="text-white/80 text-sm font-medium uppercase tracking-widest">
              Valore stimato
            </p>
          </div>

          {/* Price range */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 md:gap-6">
              <div className="text-center">
                <span className="block text-white/60 text-xs uppercase tracking-wide mb-1">Min</span>
                <span className="text-2xl md:text-4xl font-bold text-white">
                  {formatPrice(result.range_min)}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-white/40 text-2xl">—</span>
              </div>
              <div className="text-center">
                <span className="block text-white/60 text-xs uppercase tracking-wide mb-1">Max</span>
                <span className="text-2xl md:text-4xl font-bold text-white">
                  {formatPrice(result.range_max)}
                </span>
              </div>
            </div>

            {/* Median */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
                <span className="text-sm text-white/70">Mediana:</span>
                <span className="font-bold text-white">{formatPrice(result.market_median)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Percentile visualization */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-150">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
          Distribuzione prezzi
        </h3>
        <div className="relative h-12 bg-[var(--obsidian-700)] rounded-lg overflow-hidden">
          {/* Gradient bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 opacity-30" />

          {/* P25 marker */}
          <div className="absolute left-[25%] top-0 bottom-0 w-0.5 bg-blue-400" />
          <div className="absolute left-[25%] -translate-x-1/2 -top-1 text-[10px] text-blue-400">P25</div>

          {/* P50 marker (median) */}
          <div className="absolute left-[50%] top-0 bottom-0 w-1 bg-emerald-400" />
          <div className="absolute left-[50%] -translate-x-1/2 -top-1 text-[10px] text-emerald-400 font-bold">P50</div>

          {/* P75 marker */}
          <div className="absolute left-[75%] top-0 bottom-0 w-0.5 bg-amber-400" />
          <div className="absolute left-[75%] -translate-x-1/2 -top-1 text-[10px] text-amber-400">P75</div>

          {/* Price labels */}
          <div className="absolute left-[25%] -translate-x-1/2 bottom-1 text-xs font-medium text-white">
            {formatPrice(result.p25 || result.range_min)}
          </div>
          <div className="absolute left-[50%] -translate-x-1/2 bottom-1 text-xs font-bold text-white">
            {formatPrice(result.p50 || result.market_median)}
          </div>
          <div className="absolute left-[75%] -translate-x-1/2 bottom-1 text-xs font-medium text-white">
            {formatPrice(result.p75 || result.range_max)}
          </div>
        </div>
      </div>

      {/* Cosa fare adesso - Action guide */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-175">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cosa fare adesso
        </h3>
        <div className="space-y-3">
          {/* Prezzo annuncio consigliato */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-400">Prezzo annuncio</p>
                <p className="text-xs text-[var(--text-muted)]">Pubblica a questo prezzo per attirare acquirenti</p>
              </div>
            </div>
            <span className="text-lg font-bold text-amber-400">{formatPrice(result.p75 || result.range_max)}</span>
          </div>

          {/* Prezzo vendita probabile */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-400">Vendita probabile</p>
                <p className="text-xs text-[var(--text-muted)]">Prezzo realistico dopo trattativa</p>
              </div>
            </div>
            <span className="text-lg font-bold text-emerald-400">{formatPrice(result.p50 || result.market_median)}</span>
          </div>

          {/* Prezzo minimo */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-400">Minimo accettabile</p>
                <p className="text-xs text-[var(--text-muted)]">Non scendere sotto questa soglia</p>
              </div>
            </div>
            <span className="text-lg font-bold text-blue-400">{formatPrice(result.p25 || result.range_min)}</span>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-0 animate-fade-in-up animate-delay-200">
        {/* Dealer price */}
        <div className="glass-card p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#6366f1]/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-[#818cf8]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-[var(--text-muted)]">Prezzo dealer</p>
              <p className="text-xl font-bold text-[#818cf8] mt-1">
                {formatPrice(result.dealer_buy_price)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                Stima del prezzo che un concessionario potrebbe offrirti
              </p>
            </div>
          </div>
        </div>

        {/* Sample size */}
        <div className="glass-card p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-[var(--text-muted)]">Annunci analizzati</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {result.samples}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${confidenceBadge.bg} ${confidenceBadge.text} border ${confidenceBadge.border}`}
                  title={`Variabilita: ${((result.iqr_ratio || 0) * 100).toFixed(0)}%`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${confidenceBadge.dot}`} />
                  {confidenceBadge.label}
                </span>
              </div>
              {/* Dealer/Private breakdown */}
              {(result.n_dealers !== undefined || result.n_private !== undefined) && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {result.n_dealers || 0} concessionari, {result.n_private || 0} privati
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-300">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Come è stata calcolata
            </h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              {result.explanation}
            </p>
            {/* Timestamp */}
            {result.updated_at && (
              <p className="text-xs text-[var(--text-muted)] mt-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Aggiornato il {formatDate(result.updated_at)}
                  {result.cached && <span className="ml-1 opacity-70">(da cache)</span>}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search details */}
      <details className="glass-card group opacity-0 animate-fade-in-up animate-delay-400">
        <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-between">
          <span>Dettagli ricerca</span>
          <svg
            className="w-4 h-4 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </summary>
        <div className="px-5 pb-5 pt-2 border-t border-[var(--obsidian-600)]">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-[var(--text-muted)]">Anni cercati:</dt>
            <dd className="text-[var(--text-primary)]">
              {result.computed_from.year_window[0]} - {result.computed_from.year_window[1]}
            </dd>

            <dt className="text-[var(--text-muted)]">Range km:</dt>
            <dd className="text-[var(--text-primary)]">
              {formatNumber(result.computed_from.km_window[0])} - {formatNumber(result.computed_from.km_window[1])}
            </dd>

            {result.samples_raw && result.samples_raw !== result.samples && (
              <>
                <dt className="text-[var(--text-muted)]">Annunci grezzi:</dt>
                <dd className="text-[var(--text-primary)]">
                  {result.samples_raw} (filtrati a {result.samples})
                </dd>
              </>
            )}

            {result.iqr_ratio !== undefined && (
              <>
                <dt className="text-[var(--text-muted)]">Variabilità (IQR):</dt>
                <dd className="text-[var(--text-primary)]">
                  {(result.iqr_ratio * 100).toFixed(1)}%
                </dd>
              </>
            )}
          </dl>
        </div>
      </details>

      {/* Share section */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-450">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Condividi valutazione
        </h3>
        <div className="flex flex-wrap gap-3">
          {/* Copy link button */}
          <button
            onClick={() => {
              const shareProps = handleShare('link');
              const shareUrl = generateShareUrl();
              navigator.clipboard.writeText(shareUrl);
              trackShareCompleted(shareProps);
              alert('Link copiato!');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--obsidian-600)] hover:bg-[var(--obsidian-500)] border border-[var(--obsidian-500)] text-sm font-medium text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.193-9.193a4.5 4.5 0 00-6.364 6.364l4.5 4.5a4.5 4.5 0 006.364 0l1.757-1.757" />
            </svg>
            Copia link
          </button>

          {/* Download image button */}
          <button
            onClick={() => {
              const shareProps = handleShare('image');
              const ogUrl = `/api/og?brand=${encodeURIComponent(input.brand)}&model=${encodeURIComponent(input.model)}&year=${input.year}&p50=${result.p50 || result.market_median}&p25=${result.p25 || result.range_min}&p75=${result.p75 || result.range_max}&samples=${result.samples}&confidence=${result.confidence}`;
              window.open(ogUrl, '_blank');
              trackShareCompleted(shareProps);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Scarica immagine
          </button>

          {/* WhatsApp share */}
          <button
            onClick={() => {
              const shareProps = handleShare('whatsapp');
              const shareUrl = generateShareUrl();
              const text = `Ho valutato la mia ${input.brand} ${input.model} (${input.year}) su VibeCar: ${formatPrice(result.p50 || result.market_median)} (range ${formatPrice(result.p25 || result.range_min)} - ${formatPrice(result.p75 || result.range_max)})`;
              const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
              window.open(url, '_blank');
              trackShareCompleted(shareProps);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-sm font-medium text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>
        </div>
      </div>

      {/* Lead Form - GDPR compliant contact request */}
      <LeadForm
        confidence={result.confidence}
        dealerGap={(result.p50 || result.market_median) - result.dealer_buy_price}
        cached={result.cached}
      />

      {/* Disclaimer */}
      <div className="p-4 rounded-xl bg-[var(--obsidian-800)] border border-[var(--obsidian-700)] opacity-0 animate-fade-in-up animate-delay-550">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <strong className="text-[var(--text-secondary)]">Disclaimer:</strong> Questa valutazione è puramente indicativa
          e basata su dati pubblici di mercato. Il valore effettivo può variare
          in base alle condizioni specifiche del veicolo, optional, storico
          manutenzioni e altri fattori. Non costituisce un&apos;offerta di acquisto.
        </p>
      </div>
    </div>
  );
}
