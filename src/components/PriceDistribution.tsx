'use client';

/**
 * PriceDistribution Component
 * Premium visualization of price distribution band
 * User-friendly labels without technical jargon
 */

import { formatPrice } from '@/lib/robust-stats';

interface Props {
  min_clean: number;
  max_clean: number;
  p25: number;
  p50: number;
  p75: number;
}

export default function PriceDistribution({ min_clean, max_clean, p25, p50, p75 }: Props) {
  // Calculate positions as percentages
  const range = max_clean - min_clean;
  const p25Pos = ((p25 - min_clean) / range) * 100;
  const p50Pos = ((p50 - min_clean) / range) * 100;
  const p75Pos = ((p75 - min_clean) / range) * 100;

  return (
    <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-150">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Dove si posiziona il tuo veicolo
        </h3>
      </div>

      {/* Distribution bar */}
      <div className="relative">
        {/* Main track */}
        <div className="h-3 bg-[var(--obsidian-700)] rounded-full overflow-hidden">
          {/* Highlighted range */}
          <div
            className="absolute h-3 bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 rounded-full"
            style={{
              left: `${p25Pos}%`,
              width: `${p75Pos - p25Pos}%`,
            }}
          />
        </div>

        {/* Markers */}
        <div className="relative h-8 mt-1">
          {/* Min marker */}
          <div
            className="absolute flex flex-col items-center"
            style={{ left: `${p25Pos}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-0.5 h-3 bg-blue-400" />
            <div className="mt-1 text-center">
              <span className="text-[10px] text-blue-400 font-medium block">Min</span>
            </div>
          </div>

          {/* Central value marker */}
          <div
            className="absolute flex flex-col items-center z-10"
            style={{ left: `${p50Pos}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-1 h-4 bg-emerald-400 rounded-sm" />
            <div className="mt-0.5 text-center">
              <span className="text-[10px] text-emerald-400 font-bold block">Probabile</span>
            </div>
          </div>

          {/* Max marker */}
          <div
            className="absolute flex flex-col items-center"
            style={{ left: `${p75Pos}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-0.5 h-3 bg-amber-400" />
            <div className="mt-1 text-center">
              <span className="text-[10px] text-amber-400 font-medium block">Max</span>
            </div>
          </div>
        </div>

        {/* Price labels row */}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--obsidian-600)]">
          <div className="text-left">
            <span className="text-[10px] text-[var(--text-muted)] block">Estremo basso</span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">{formatPrice(min_clean)}</span>
          </div>

          <div className="flex-1 flex justify-center gap-6">
            <div className="text-center">
              <span className="text-xs font-semibold text-blue-400">{formatPrice(p25)}</span>
            </div>
            <div className="text-center px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm font-bold text-emerald-400">{formatPrice(p50)}</span>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-amber-400">{formatPrice(p75)}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[var(--text-muted)] block">Estremo alto</span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">{formatPrice(max_clean)}</span>
          </div>
        </div>
      </div>

      {/* Legend - simplified */}
      <div className="mt-4 p-3 rounded-lg bg-[var(--obsidian-800)] border border-[var(--obsidian-700)]">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <strong className="text-[var(--text-secondary)]">Fascia di prezzo consigliata:</strong>{' '}
          la maggior parte dei veicoli simili viene venduta in questo intervallo. È la fascia più realistica per il tuo veicolo.
        </p>
      </div>
    </div>
  );
}
