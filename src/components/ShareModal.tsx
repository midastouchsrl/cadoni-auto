'use client';

/**
 * ShareModal Component
 * Practical sharing options for car valuation results
 *
 * Real use cases:
 * - Send to potential buyer
 * - Use in negotiations with dealer
 * - Get advice from friends/family
 * - Save for personal records
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatPrice } from '@/lib/robust-stats';
import { generateShareUrl, getEstimateContext } from '@/lib/analytics';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  carInfo: {
    brand: string;
    model: string;
    year: string;
    km: string;
    fuel: string;
  };
  valuation: {
    p25: number;
    p50: number;
    p75: number;
    samples: number;
    confidence: string;
  };
  onShare: (type: 'link' | 'image' | 'whatsapp' | 'pdf') => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  carInfo,
  valuation,
  onShare,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setDownloading(null);
    }
  }, [isOpen]);

  // Handle body scroll lock and escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // For SSR safety, check if we're in browser
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const estimateContext = getEstimateContext();
  const estimateId = estimateContext?.estimate_id || 'unknown';

  const handleCopyLink = async () => {
    const shareUrl = generateShareUrl();
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    onShare('link');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = async () => {
    setDownloading('image');
    onShare('image');

    const params = new URLSearchParams({
      brand: carInfo.brand,
      model: carInfo.model,
      year: carInfo.year,
      km: carInfo.km,
      fuel: carInfo.fuel,
      p25: valuation.p25.toString(),
      p50: valuation.p50.toString(),
      p75: valuation.p75.toString(),
      samples: valuation.samples.toString(),
      confidence: valuation.confidence,
      estimate_id: estimateId,
    });

    try {
      const response = await fetch(`/api/share-card?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('image')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Empty response');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `valutazione-${carInfo.brand}-${carInfo.model}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Errore nel download. Riprova.');
    }

    setDownloading(null);
  };

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    onShare('pdf');

    const params = new URLSearchParams({
      brand: carInfo.brand,
      model: carInfo.model,
      year: carInfo.year,
      km: carInfo.km,
      fuel: carInfo.fuel,
      p25: valuation.p25.toString(),
      p50: valuation.p50.toString(),
      p75: valuation.p75.toString(),
      samples: valuation.samples.toString(),
      confidence: valuation.confidence,
      estimate_id: estimateId,
    });

    try {
      const response = await fetch(`/api/share-pdf?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('image')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Empty response');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${carInfo.brand}-${carInfo.model}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('Errore nel download. Riprova.');
    }

    setDownloading(null);
  };

  const handleWhatsApp = () => {
    onShare('whatsapp');
    const shareUrl = generateShareUrl();
    const text = `Ciao! Ti invio la valutazione della ${carInfo.brand} ${carInfo.model} (${carInfo.year}, ${carInfo.km} km):\n\n` +
      `Valore di mercato: ${formatPrice(valuation.p50)}\n` +
      `Range: ${formatPrice(valuation.p25)} - ${formatPrice(valuation.p75)}\n\n` +
      `Valutazione completa:`;
    const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
    window.open(url, '_blank');
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[var(--obsidian-800)] rounded-2xl border border-[var(--obsidian-600)] shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-[var(--obsidian-600)] bg-[var(--obsidian-800)] rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Condividi valutazione
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--obsidian-600)] transition-colors"
            aria-label="Chiudi"
          >
            <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
          <div className="p-4 space-y-3">
            {/* Summary card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {carInfo.brand} {carInfo.model}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {carInfo.year} · {carInfo.km} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-400">
                    {formatPrice(valuation.p50)}
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp - Primary action for sending to interested buyer */}
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">Invia su WhatsApp</p>
                <p className="text-xs text-white/70">Condividi con un potenziale acquirente</p>
              </div>
              <svg className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--obsidian-700)] hover:bg-[var(--obsidian-600)] border border-[var(--obsidian-500)] transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                {copied ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.193-9.193a4.5 4.5 0 00-6.364 6.364l4.5 4.5a4.5 4.5 0 006.364 0l1.757-1.757" />
                  </svg>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {copied ? 'Link copiato!' : 'Copia link'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Incolla dove preferisci</p>
              </div>
              {!copied && (
                <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-[var(--obsidian-600)]" />
              <span className="text-xs text-[var(--text-muted)]">Salva per te</span>
              <div className="flex-1 h-px bg-[var(--obsidian-600)]" />
            </div>

            {/* Download options */}
            <div className="grid grid-cols-2 gap-3">
              {/* Image */}
              <button
                onClick={handleDownloadImage}
                disabled={downloading === 'image'}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--obsidian-700)] hover:bg-[var(--obsidian-600)] border border-[var(--obsidian-500)] transition-colors disabled:opacity-50"
              >
                {downloading === 'image' ? (
                  <svg className="animate-spin h-6 w-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                )}
                <span className="text-xs font-medium text-[var(--text-primary)]">Immagine</span>
                <span className="text-[10px] text-[var(--text-muted)]">Da inviare in chat</span>
              </button>

              {/* PDF */}
              <button
                onClick={handleDownloadPDF}
                disabled={downloading === 'pdf'}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--obsidian-700)] hover:bg-[var(--obsidian-600)] border border-[var(--obsidian-500)] transition-colors disabled:opacity-50"
              >
                {downloading === 'pdf' ? (
                  <svg className="animate-spin h-6 w-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                )}
                <span className="text-xs font-medium text-[var(--text-primary)]">Report</span>
                <span className="text-[10px] text-[var(--text-muted)]">Per trattative</span>
              </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
