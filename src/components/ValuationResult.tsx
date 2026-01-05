'use client';

/**
 * VibeCar Valuation Result Display
 * Premium data-driven result visualization
 *
 * Design principles:
 * - Communicate authority without technical jargon
 * - Transform internal numbers into human language
 * - Tell the market story, not the algorithm
 * - Position VibeCar as neutral reference (partner-safe)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ValuationResult, ConfidenceLevel } from '@/lib/types';
import { formatPrice } from '@/lib/robust-stats';
import {
  trackEstimateCompleted,
  trackShareClicked,
  trackShareCompleted,
  getEstimateTimeMs,
} from '@/lib/analytics';
import ShareModal from './ShareModal';

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

/**
 * Semantic translations - NO technical terms exposed to user
 */
function getMarketDepth(samples: number): { label: string; description: string } {
  if (samples >= 40) {
    return {
      label: 'Ben rappresentato',
      description: 'Mercato ben rappresentato',
    };
  } else if (samples >= 20) {
    return {
      label: 'Sufficientemente rappresentato',
      description: 'Mercato sufficientemente rappresentato',
    };
  } else {
    return {
      label: 'Meno uniforme',
      description: 'Mercato meno uniforme',
    };
  }
}

function getPriceDispersion(iqrRatio: number): { label: string; description: string } {
  if (iqrRatio > 0.25) {
    return {
      label: 'Molto variabili',
      description: 'Prezzi molto variabili',
    };
  } else if (iqrRatio > 0.15) {
    return {
      label: 'Moderatamente variabili',
      description: 'Prezzi moderatamente variabili',
    };
  } else {
    return {
      label: 'Tendenzialmente allineati',
      description: 'Prezzi tendenzialmente allineati',
    };
  }
}

function getPrecisionLabel(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'alta':
      return 'Precisione stimata: elevata';
    case 'media':
      return 'Precisione stimata: buona';
    case 'bassa':
    default:
      return 'Precisione stimata: indicativa';
  }
}

function getPrecisionStyle(confidence: ConfidenceLevel) {
  switch (confidence) {
    case 'alta':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
      };
    case 'media':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
      };
    case 'bassa':
    default:
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        dot: 'bg-blue-400',
      };
  }
}

export default function ValuationResultDisplay({ result, input }: Props) {
  const [showShareModal, setShowShareModal] = useState(false);

  // Core values - semantic naming
  const centralValue = result.p50 || result.market_median;
  const rangeMin = result.p25 || result.range_min;
  const rangeMax = result.p75 || result.range_max;
  const observedMin = result.min_clean || result.range_min;
  const observedMax = result.max_clean || result.range_max;
  const professionalChannel = result.dealer_buy_price;

  // Semantic translations
  const marketDepth = getMarketDepth(result.samples);
  const priceDispersion = getPriceDispersion(result.iqr_ratio || 0);
  const precisionLabel = getPrecisionLabel(result.confidence);
  const precisionStyle = getPrecisionStyle(result.confidence);

  // Track estimate completion on mount
  useEffect(() => {
    trackEstimateCompleted({
      brand: input.brand,
      model: input.model,
      year: parseInt(input.year, 10),
      confidence: result.confidence,
      n_used: result.samples,
      n_total: result.samples_raw || result.samples,
      cached: result.cached,
      p25: rangeMin,
      p50: centralValue,
      p75: rangeMax,
      dealer_price: professionalChannel,
      dealer_gap: centralValue - professionalChannel,
      iqr_ratio: result.iqr_ratio || 0,
      time_to_result_ms: getEstimateTimeMs(),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Share tracking helper
  const handleShare = (type: 'link' | 'image' | 'whatsapp' | 'pdf') => {
    const trackingType = type === 'pdf' ? 'image' : type;
    const shareProps = {
      type: trackingType as 'link' | 'image' | 'whatsapp',
      brand: input.brand,
      model: input.model,
      year: parseInt(input.year, 10),
      confidence: result.confidence,
    };
    trackShareClicked(shareProps);
    return shareProps;
  };

  // Calculate positions for Market Range Band
  const totalRange = observedMax - observedMin;
  const rangeMinPos = ((rangeMin - observedMin) / totalRange) * 100;
  const rangeMaxPos = ((rangeMax - observedMin) / totalRange) * 100;
  const centralPos = ((centralValue - observedMin) / totalRange) * 100;
  const professionalPos = ((professionalChannel - observedMin) / totalRange) * 100;

  return (
    <div className="space-y-6">
      {/* Car info header - compact */}
      <div className="glass-card p-4 opacity-0 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate text-[var(--text-primary)]">
              {input.brand} {input.model}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span>{input.year}</span>
              <span className="w-1 h-1 rounded-full bg-[var(--obsidian-400)]" />
              <span>{input.km} km</span>
              <span className="w-1 h-1 rounded-full bg-[var(--obsidian-400)]" />
              <span className="capitalize">{input.fuel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          BLOCCO 1 — VALORE DI MERCATO (FOCUS ASSOLUTO)
          ============================================ */}
      <div className="glass-card p-6 md:p-8 opacity-0 animate-fade-in-up animate-delay-100">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-6 text-center">
          Valore di mercato
        </h3>

        {/* Central value - protagonist */}
        <div className="text-center mb-6">
          <div className="text-5xl md:text-6xl font-bold text-[var(--text-primary)]">
            {formatPrice(centralValue)}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-3 max-w-md mx-auto">
            Prezzo che meglio rappresenta il mercato per veicoli simili al tuo, oggi.
          </p>
        </div>

        {/* Range - context only */}
        <div className="mt-6 pt-6 border-t border-[var(--obsidian-600)]">
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-[var(--text-muted)]">Intervallo più probabile:</span>
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {formatPrice(rangeMin)} – {formatPrice(rangeMax)}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] text-center mt-2">
            È la fascia in cui il mercato tende a posizionarsi.
          </p>
        </div>
      </div>

      {/* ============================================
          BLOCCO 2 — ANDAMENTO DEI PREZZI (GRAFICO)
          ============================================ */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-150">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-5">
          Andamento dei prezzi sul mercato
        </h3>

        {/* Market Range Band */}
        <div className="relative py-4">
          {/* Background track - observed range */}
          <div className="h-2 bg-[var(--obsidian-700)] rounded-full relative">
            {/* Highlighted band - probable range */}
            <div
              className="absolute h-full bg-gradient-to-r from-[var(--obsidian-500)] via-emerald-500/50 to-[var(--obsidian-500)] rounded-full"
              style={{
                left: `${rangeMinPos}%`,
                width: `${rangeMaxPos - rangeMinPos}%`,
              }}
            />

            {/* Central value marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--obsidian-800)] shadow-lg"
              style={{ left: `${centralPos}%`, transform: 'translateX(-50%) translateY(-50%)' }}
            />
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-3 text-xs text-[var(--text-muted)]">
            <span>{formatPrice(observedMin)}</span>
            <span>{formatPrice(observedMax)}</span>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] mt-4 leading-relaxed">
          Questa visualizzazione mostra dove si collocano i prezzi per veicoli comparabili al tuo, evidenziando la fascia più coerente con il mercato.
        </p>
      </div>

      {/* ============================================
          BLOCCO 3 — LETTURA DEL MERCATO (SEMANTICA)
          ============================================ */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-200">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
          Lettura del mercato
        </h3>

        <div className="space-y-4">
          {/* Market reading - translated insights */}
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            {marketDepth.description}, con {priceDispersion.description.toLowerCase()}.
          </p>

          {/* Precision badge */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${precisionStyle.bg} ${precisionStyle.text} border ${precisionStyle.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${precisionStyle.dot}`} />
              {precisionLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================
          BLOCCO 4 — CANALI DI VENDITA (PARTNER-SAFE)
          ============================================ */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-250">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
          Canali di vendita
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-5">
          Canali diversi implicano condizioni diverse.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Mercato diretto */}
          <div className="p-4 rounded-xl bg-[var(--obsidian-700)] border border-[var(--obsidian-600)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">Mercato diretto</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 mb-2">
              {formatPrice(centralValue)}
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Vendita diretta tra privati o canali aperti, con maggiore variabilità di prezzo.
            </p>
          </div>

          {/* Card 2: Canale professionale */}
          <div className="p-4 rounded-xl bg-[var(--obsidian-700)] border border-[var(--obsidian-600)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                </svg>
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">Canale professionale</span>
            </div>
            <div className="text-2xl font-bold text-blue-400 mb-2">
              {formatPrice(professionalChannel)}
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Le valutazioni tramite canali professionali riflettono servizi, gestione della rivendita e tempi più rapidi.
            </p>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center mt-4">
          Il canale più adatto dipende dalle tue priorità.
        </p>
      </div>

      {/* ============================================
          BLOCCO 5 — CONFRONTO VISIVO DEI CANALI
          ============================================ */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-300">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
          Confronto canali
        </h3>

        {/* Channel Comparison Chart */}
        <div className="space-y-4">
          {/* Mercato diretto */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)]">Mercato diretto</span>
              <span className="text-xs font-medium text-emerald-400">{formatPrice(centralValue)}</span>
            </div>
            <div className="h-3 bg-[var(--obsidian-700)] rounded-full relative overflow-hidden">
              <div
                className="absolute h-full bg-emerald-500/30 rounded-full"
                style={{
                  left: `${rangeMinPos}%`,
                  width: `${rangeMaxPos - rangeMinPos}%`,
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-emerald-400 rounded-full"
                style={{ left: `${centralPos}%`, transform: 'translateX(-50%) translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Canale professionale */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)]">Canale professionale</span>
              <span className="text-xs font-medium text-blue-400">{formatPrice(professionalChannel)}</span>
            </div>
            <div className="h-3 bg-[var(--obsidian-700)] rounded-full relative overflow-hidden">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-400 rounded-full"
                style={{ left: `${professionalPos}%`, transform: 'translateX(-50%) translateY(-50%)' }}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
          Lo stesso veicolo può collocarsi in fasce diverse a seconda del canale scelto.
        </p>
      </div>

      {/* ============================================
          BLOCCO 6 — COME USARE QUESTA VALUTAZIONE
          ============================================ */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-350">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
          Come usare questa valutazione
        </h3>

        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm text-[var(--text-secondary)]">Per confrontare offerte o proposte ricevute</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm text-[var(--text-secondary)]">Per definire un prezzo coerente con il mercato</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm text-[var(--text-secondary)]">Per scegliere il canale di vendita più adatto alle tue esigenze</span>
          </li>
        </ul>
      </div>

      {/* ============================================
          BLOCCO 7 — CTA FINALI
          ============================================ */}
      <div className="space-y-3 opacity-0 animate-fade-in-up animate-delay-400">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Primary CTA */}
          <Link
            href="/"
            className="btn-primary flex items-center justify-center gap-2 py-3.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Nuova valutazione
          </Link>

          {/* Secondary CTA */}
          <button
            onClick={() => {
              handleShare('link');
              setShowShareModal(true);
            }}
            className="btn-secondary flex items-center justify-center gap-2 py-3.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Condividi risultato
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center">
          Utile per confronti, trattative o consulenze.
        </p>
      </div>

      {/* ============================================
          DISCLAIMER
          ============================================ */}
      <div className="p-4 rounded-xl bg-[var(--obsidian-800)] border border-[var(--obsidian-700)] opacity-0 animate-fade-in-up animate-delay-450">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed text-center">
          Valutazione indicativa basata su dati di mercato pubblicamente disponibili. Non costituisce offerta di acquisto.
        </p>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        carInfo={{
          brand: input.brand,
          model: input.model,
          year: input.year,
          km: input.km,
          fuel: input.fuel,
        }}
        valuation={{
          p25: rangeMin,
          p50: centralValue,
          p75: rangeMax,
          samples: result.samples,
          confidence: result.confidence,
        }}
        onShare={(type) => {
          const shareProps = handleShare(type);
          trackShareCompleted(shareProps);
        }}
      />
    </div>
  );
}
