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
import LeadForm from './LeadForm';

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

  // For channel comparison, use percentage relative to central value (100%)
  const professionalPct = (professionalChannel / centralValue) * 100;
  const marketDirectPct = 100; // centralValue is the reference (100%)

  return (
    <div className="space-y-6">
      {/* Car info header - compact */}
      <div className="glass-card p-4 opacity-0 animate-fade-in-up border-l-4 border-l-teal-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate text-gray-900 dark:text-white">
              {input.brand} {input.model}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
              <span>{input.year}</span>
              <span className="w-1 h-1 rounded-full bg-teal-500/50" />
              <span>{input.km} km</span>
              <span className="w-1 h-1 rounded-full bg-teal-500/50" />
              <span className="capitalize">{input.fuel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          BLOCCO 1 — HERO PRICE CARD (BRANDING FORTE)
          ============================================ */}
      <div className="relative opacity-0 animate-fade-in-up animate-delay-100">
        {/* Glow effect background */}
        <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/25 via-cyan-500/35 to-teal-500/25 rounded-[24px] blur-xl opacity-75" />

        {/* Main card */}
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-teal-900/95 via-teal-800/90 to-cyan-900/85 border border-teal-400/30">
          {/* Animated gradient border glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-400/15 to-transparent animate-[shimmer_3s_infinite]" style={{ backgroundSize: '200% 100%' }} />

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-300 to-transparent" />

          {/* Content */}
          <div className="relative p-6 md:p-8">
            {/* Header with brand badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-teal-400/15 border border-teal-400/40">
                <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                <span className="text-sm font-semibold text-teal-200 tracking-wide">VALUTAZIONE VIBECAR</span>
              </div>
            </div>

            {/* Central value - HERO */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                {/* Price glow */}
                <div className="absolute inset-0 text-6xl md:text-7xl font-bold text-teal-300 blur-2xl opacity-50">
                  {formatPrice(centralValue)}
                </div>
                {/* Main price */}
                <div className="relative text-6xl md:text-7xl font-bold text-white drop-shadow-[0_0_30px_rgba(94,234,212,0.4)]">
                  {formatPrice(centralValue)}
                </div>
              </div>
              <p className="text-base text-teal-100/70 mt-4 max-w-sm mx-auto">
                Valore di mercato stimato
              </p>
            </div>

            {/* Range bar visual - Multi-color gradient */}
            <div className="relative mb-6 pt-2">
              {/* Track container - allows markers to extend above/below */}
              <div className="relative h-3">
                {/* Background track */}
                <div className="absolute inset-0 rounded-full bg-slate-800/80 border border-slate-600/50" />

                {/* Multi-color gradient fill - blue to emerald to amber */}
                <div
                  className="absolute top-0 h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-500 rounded-full shadow-lg"
                  style={{
                    left: `${rangeMinPos}%`,
                    width: `${rangeMaxPos - rangeMinPos}%`,
                  }}
                />

                {/* Min marker (blue) */}
                <div
                  className="absolute top-1/2 w-2.5 h-4 bg-blue-400 rounded-sm border border-white/60 shadow-md"
                  style={{ left: `${rangeMinPos}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                />

                {/* Central marker (emerald) - larger, prominent */}
                <div
                  className="absolute top-1/2 w-4 h-5 bg-white rounded-sm shadow-[0_0_12px_rgba(52,211,153,0.7)] border-2 border-emerald-400 z-10"
                  style={{ left: `${centralPos}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                />

                {/* Max marker (amber) */}
                <div
                  className="absolute top-1/2 w-2.5 h-4 bg-amber-400 rounded-sm border border-white/60 shadow-md"
                  style={{ left: `${rangeMaxPos}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                />
              </div>

              {/* Range labels with colors */}
              <div className="flex justify-between items-start mt-5">
                <div className="text-left">
                  <div className="text-lg font-bold text-blue-300">{formatPrice(rangeMin)}</div>
                  <div className="text-xs text-blue-400/80">Vendita rapida</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-emerald-400/80">Valore di riferimento</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-300">{formatPrice(rangeMax)}</div>
                  <div className="text-xs text-amber-400/80">Massimo ottenibile</div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom decorative elements */}
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl" />
        </div>
      </div>

      {/* ============================================
          BLOCCO 2 — LETTURA DEL MERCATO (SEMANTICA)
          ============================================ */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-150 border-l-4 border-l-cyan-500/50">
        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Lettura del mercato
        </h3>

        <div className="space-y-4">
          {/* Market reading - translated insights */}
          <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
            {marketDepth.description}, con {priceDispersion.description.toLowerCase()}.
          </p>
        </div>
      </div>

      {/* ============================================
          BLOCCO 3 — CANALI DI VENDITA (PARTNER-SAFE)
          ============================================ */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-200 border-l-4 border-l-emerald-500/50">
        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
          </svg>
          Canali di vendita
        </h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
          Canali diversi implicano condizioni diverse.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Mercato diretto */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Mercato diretto</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              {formatPrice(centralValue)}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Vendita diretta tra privati o canali aperti, con maggiore variabilità di prezzo.
            </p>
          </div>

          {/* Card 2: Canale professionale */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Concessionari e rivenditori</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {formatPrice(professionalChannel)}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Vendita a concessionari o rivenditori professionisti. Offerta solitamente inferiore, ma con ritiro immediato e zero pensieri.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-4">
          Il canale più adatto dipende dalle tue priorità.
        </p>
      </div>

      {/* ============================================
          BLOCCO 4 — CONFRONTO VISIVO DEI CANALI
          ============================================ */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-250 border-l-4 border-l-blue-500/50">
        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Confronto canali
        </h3>

        {/* Channel Comparison Chart */}
        <div className="space-y-4">
          {/* Mercato diretto */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 dark:text-slate-300">Mercato diretto</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatPrice(centralValue)}</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700/50 rounded-full relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500/50 to-emerald-400/70 rounded-full"
                style={{ width: `${marketDirectPct}%` }}
              />
            </div>
          </div>

          {/* Concessionari e rivenditori */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 dark:text-slate-300">Concessionari e rivenditori</span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{formatPrice(professionalChannel)}</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700/50 rounded-full relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500/50 to-blue-400/70 rounded-full"
                style={{ width: `${professionalPct}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-slate-400 mt-4 text-center">
          Lo stesso veicolo può collocarsi in fasce diverse a seconda del canale scelto.
        </p>
      </div>

      {/* ============================================
          BLOCCO 5 — COME USARE QUESTA VALUTAZIONE
          ============================================ */}
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-300 border-l-4 border-l-amber-500/50">
        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          Come usare questa valutazione
        </h3>

        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-teal-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 dark:text-slate-300">Per confrontare offerte o proposte ricevute</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-teal-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 dark:text-slate-300">Per definire un prezzo coerente con il mercato</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-teal-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 dark:text-slate-300">Per scegliere il canale di vendita più adatto alle tue esigenze</span>
          </li>
        </ul>
      </div>

      {/* ============================================
          BLOCCO 6 — LEAD FORM (RICHIESTA CONTATTO)
          ============================================ */}
      <LeadForm
        confidence={result.confidence}
        dealerGap={centralValue - professionalChannel}
        cached={result.cached}
        carInfo={{
          brand: input.brand,
          model: input.model,
          year: input.year,
          valuation: formatPrice(centralValue),
        }}
      />

      {/* ============================================
          BLOCCO 7 — CTA FINALI
          ============================================ */}
      <div className="space-y-3 opacity-0 animate-fade-in-up animate-delay-350">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Nuova valutazione - secondary */}
          <Link
            href="/"
            className="btn-secondary flex items-center justify-center gap-2 py-3.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Nuova valutazione
          </Link>

          {/* Condividi - secondary */}
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

        <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
          Utile per confronti, trattative o consulenze.
        </p>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 dark:text-slate-400 text-center opacity-0 animate-fade-in-up animate-delay-400">
        Valutazione indicativa basata su dati di mercato pubblicamente disponibili. Non costituisce offerta di acquisto.
      </p>

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
