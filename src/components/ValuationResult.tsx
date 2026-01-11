'use client';

/**
 * VibeCar Valuation Result - 2026 Edition
 *
 * Design principles:
 * - Multi-channel: clear buyer/seller perspectives
 * - Actionable copy: tell them what to DO, not what it IS
 * - Zero jargon: human language only
 * - Premium feel: space, typography, subtle animations
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
import PriceDistribution from './PriceDistribution';

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

type ViewMode = 'buying' | 'selling';

/**
 * Calculate multi-channel prices based on market median
 *
 * COEFFICIENTS DOCUMENTATION (Last verified: January 2026)
 *
 * Sources:
 * - AutoScout24: analisi empirica prezzi dealer vs privati
 * - Eurotax BLU/GIALLO: gap ~10% tra ritiro e vendita dealer
 * - comproautobrescia.com: dealer paga 20-25% sotto prezzi AutoScout24
 * - Sicurauto, alVolante, Frattin Auto: guide permuta vs vendita privato
 *
 * Key findings:
 * - Dealer/Private BUYING gap: 20-30% (auto €10k dealer = €7-8k privato)
 * - Dealer negotiation: 5-6% dal listino
 * - Private negotiation: 8-10% dal listino
 * - Ritiro diretto dealer: -25% dalla mediana (costi + margine)
 * - Permuta: -22% dalla mediana (+3% vs ritiro, incentivo acquisto)
 * - Vendita privato: -10% listino, -18% chiusura (dopo trattativa)
 *
 * VINCOLO CRITICO per VENDITA:
 * Annuncio privato > Chiusura privato > Permuta > Ritiro diretto
 */
function calculateChannelPrices(medianPrice: number) {
  // Segment detection (economy vs premium affects margins)
  const isEconomy = medianPrice < 15000;
  const isPremium = medianPrice > 30000;

  // ============================================
  // BUYING: quando l'utente COMPRA un'auto
  // ============================================
  // Gap dealer/privato: 20-25% (economy), 15-20% (premium)
  const dealerPrivateGap = isEconomy ? 0.22 : isPremium ? 0.15 : 0.18;
  const dealerNegotiation = isEconomy ? 0.05 : isPremium ? 0.07 : 0.06;
  const privateNegotiation = isEconomy ? 0.10 : isPremium ? 0.06 : 0.08;

  const buyDealerListing = medianPrice;
  const buyDealerFinal = Math.round(medianPrice * (1 - dealerNegotiation) / 50) * 50;
  const buyPrivateListing = Math.round(medianPrice * (1 - dealerPrivateGap) / 50) * 50;
  const buyPrivateFinal = Math.round(buyPrivateListing * (1 - privateNegotiation) / 50) * 50;

  // ============================================
  // SELLING: quando l'utente VENDE la sua auto
  // ============================================
  // IMPORTANTE: logica DIVERSA da buying!
  // Quando VENDI a privato, TU sei il venditore privato, quindi puoi
  // chiedere prezzi simili ad altri privati (vicino alla mediana)

  // Annuncio privato: -10% dalla mediana (competitivo ma realistico)
  const sellPrivateListing = Math.round(medianPrice * 0.90 / 50) * 50;
  // Chiusura realistica: -18% dalla mediana (dopo trattativa)
  const sellPrivateFinal = Math.round(medianPrice * 0.82 / 50) * 50;
  // Permuta: -22% (dealer guadagna anche sulla nuova auto)
  const sellTradeIn = Math.round(medianPrice * 0.78 / 50) * 50;
  // Ritiro diretto: -25% (dealer deve solo rivendere l'usata)
  const sellDealerOffer = Math.round(medianPrice * 0.75 / 50) * 50;

  return {
    buying: {
      dealer: { listing: buyDealerListing, final: buyDealerFinal },
      private: { listing: buyPrivateListing, final: buyPrivateFinal },
    },
    selling: {
      toPrivate: { listing: sellPrivateListing, realistic: sellPrivateFinal },
      toDealer: { offer: sellDealerOffer, tradeIn: sellTradeIn },
    },
    savings: {
      buyingPrivate: buyDealerFinal - buyPrivateFinal,
      sellingPrivate: sellPrivateFinal - sellDealerOffer,
    },
  };
}

function getConfidenceStyle(confidence: ConfidenceLevel) {
  switch (confidence) {
    case 'alta':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-500', label: 'Alta precisione' };
    case 'media':
      return { bg: 'bg-amber-500/15', text: 'text-amber-500', label: 'Buona precisione' };
    default:
      return { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Stima indicativa' };
  }
}

export default function ValuationResultDisplay({ result, input }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('buying');
  const [showShareModal, setShowShareModal] = useState(false);

  // Core values
  const centralValue = result.p50 || result.market_median;
  const rangeMin = result.p25 || result.range_min;
  const rangeMax = result.p75 || result.range_max;
  const professionalChannel = result.dealer_buy_price;

  // Calculate all channel prices
  const prices = calculateChannelPrices(centralValue);
  const confidenceStyle = getConfidenceStyle(result.confidence);

  // Track on mount
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

  return (
    <div className="space-y-5">

      {/* ============================================
          HERO: Vehicle + Central Value
          ============================================ */}
      <div className="relative opacity-0 animate-fade-in-up">
        {/* Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-cyan-500/30 to-teal-500/20 rounded-3xl blur-xl opacity-60" />

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10">
          {/* Top accent */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />

          <div className="p-6 md:p-8">
            {/* Vehicle badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{input.brand} {input.model}</div>
                  <div className="text-xs text-slate-400">{input.year} · {input.km} km · {input.fuel}</div>
                </div>
              </div>
            </div>

            {/* Hero price */}
            <div className="text-center mb-6">
              <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                {formatPrice(centralValue)}
              </div>
              <p className="text-sm text-slate-400">
                Valore di mercato · {result.samples} veicoli analizzati
              </p>
            </div>

            {/* Confidence badge */}
            <div className="flex flex-col items-center gap-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${confidenceStyle.bg}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${confidenceStyle.text} bg-current`} />
                <span className={`text-xs font-medium ${confidenceStyle.text}`}>{confidenceStyle.label}</span>
              </div>
              {/* Tactical suggestion for low confidence */}
              {result.confidence === 'bassa' && result.tactical_suggestion && (
                <p className="text-xs text-slate-400 text-center max-w-xs">
                  💡 {result.tactical_suggestion}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          TAB SWITCHER: Compro / Vendo
          ============================================ */}
      <div className="opacity-0 animate-fade-in-up animate-delay-100">
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('buying')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              viewMode === 'buying'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            Sto comprando
          </button>
          <button
            onClick={() => setViewMode('selling')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              viewMode === 'selling'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sto vendendo
          </button>
        </div>
      </div>

      {/* ============================================
          BUYING VIEW
          ============================================ */}
      {viewMode === 'buying' && (
        <div className="space-y-4 opacity-0 animate-fade-in-up animate-delay-150">

          {/* Two channel cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* DEALER CARD */}
            <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

              <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Da concessionario</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Garanzia inclusa</p>
                  </div>
                </div>

                {/* Prices */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Prezzo esposto</span>
                    <span className="text-lg font-semibold text-slate-600 dark:text-slate-300">{formatPrice(prices.buying.dealer.listing)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-900 dark:text-white font-medium">Pagherai circa</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatPrice(prices.buying.dealer.final)}</span>
                  </div>
                </div>

                {/* Pro/Con */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-300">Garanzia 12+ mesi, auto verificata</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-300">Prezzo più alto, meno margine trattativa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PRIVATE CARD */}
            <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 hover:border-emerald-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

              {/* Savings badge */}
              {prices.savings.buyingPrivate > 200 && (
                <div className="absolute top-4 right-4">
                  <div className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Risparmi {formatPrice(prices.savings.buyingPrivate)}
                    </span>
                  </div>
                </div>
              )}

              <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Da privato</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Prezzo più basso</p>
                  </div>
                </div>

                {/* Prices */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Prezzo annuncio</span>
                    <span className="text-lg font-semibold text-slate-600 dark:text-slate-300">{formatPrice(prices.buying.private.listing)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-900 dark:text-white font-medium">Pagherai circa</span>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(prices.buying.private.final)}</span>
                  </div>
                </div>

                {/* Pro/Con */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-300">Prezzo migliore, più trattabile</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-300">Nessuna garanzia, verifica l&apos;auto bene</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tip box */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Consiglio acquisto</h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                Offri il 10% in meno del prezzo esposto. Su un&apos;auto da privato, chiedi sempre il libretto tagliandi e fai un controllo dal meccanico prima di chiudere.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          SELLING VIEW
          ============================================ */}
      {viewMode === 'selling' && (
        <div className="space-y-4 opacity-0 animate-fade-in-up animate-delay-150">

          {/* Two channel cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* SELL TO PRIVATE */}
            <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 hover:border-emerald-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

              {/* Best value badge */}
              <div className="absolute top-4 right-4">
                <div className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Massimo ricavo</span>
                </div>
              </div>

              <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Vendi a privato</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Guadagno maggiore</p>
                  </div>
                </div>

                {/* Prices */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Metti annuncio a</span>
                    <span className="text-lg font-semibold text-slate-600 dark:text-slate-300">{formatPrice(prices.selling.toPrivate.listing)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-900 dark:text-white font-medium">Chiuderai a circa</span>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(prices.selling.toPrivate.realistic)}</span>
                  </div>
                </div>

                {/* Pro/Con */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      +{formatPrice(prices.savings.sellingPrivate)} rispetto al ritiro dealer
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-300">Richiede tempo (2-4 settimane) e gestione trattative</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SELL TO DEALER */}
            <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

              <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Vendi a concessionario</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Veloce e senza pensieri</p>
                  </div>
                </div>

                {/* Prices */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Offerta ritiro</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatPrice(prices.selling.toDealer.offer)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Con permuta</span>
                    <span className="text-lg font-semibold text-slate-600 dark:text-slate-300">{formatPrice(prices.selling.toDealer.tradeIn)}</span>
                  </div>
                </div>

                {/* Pro/Con */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-300">Vendita immediata, zero burocrazia</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-300">Offerta inferiore al mercato privati</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tip box */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-1">Consiglio vendita</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Foto di qualità e descrizione onesta accelerano la vendita. Chiedi almeno 3 preventivi da concessionari diversi prima di accettare.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          PRICE DISTRIBUTION
          ============================================ */}
      <PriceDistribution
        min_clean={result.min_clean || rangeMin * 0.85}
        max_clean={result.max_clean || rangeMax * 1.15}
        p25={rangeMin}
        p50={centralValue}
        p75={rangeMax}
      />

      {/* ============================================
          LEAD FORM
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
          CTA SECTION
          ============================================ */}
      <div className="space-y-3 opacity-0 animate-fade-in-up animate-delay-300">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="btn-secondary flex items-center justify-center gap-2 py-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Nuova ricerca
          </Link>
          <button
            onClick={() => {
              handleShare('link');
              setShowShareModal(true);
            }}
            className="btn-secondary flex items-center justify-center gap-2 py-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Condividi
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-center text-slate-400 dark:text-slate-500 opacity-0 animate-fade-in-up animate-delay-350">
        Stime basate su {result.samples} annunci attuali. Non costituisce offerta di acquisto.
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
