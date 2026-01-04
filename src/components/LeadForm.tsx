'use client';

/**
 * LeadForm Component
 * GDPR-compliant contact form for lead capture
 *
 * - Explicit consent checkbox (not pre-selected)
 * - Links to privacy policy
 * - Tracks analytics without PII
 */

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import {
  getAnonId,
  getEstimateContext,
  trackLeadFormOpened,
  trackLeadSubmitted,
  getDealerGapBucket,
} from '@/lib/analytics';

// Consent text (must match backend exactly)
const CONSENT_TEXT =
  "Acconsento a essere contattato da VibeCar e/o da operatori del settore automotive partner, esclusivamente per ricevere una valutazione o proposta relativa alla vendita del mio veicolo, come descritto nell'informativa privacy.";

interface LeadFormProps {
  confidence: string;
  dealerGap: number;
  cached: boolean;
}

export default function LeadForm({ confidence, dealerGap, cached }: LeadFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);

  // Track form opened
  useEffect(() => {
    if (isOpen) {
      trackLeadFormOpened({
        confidence,
        dealer_gap_bucket: getDealerGapBucket(dealerGap),
        cached,
      });
    }
  }, [isOpen, confidence, dealerGap, cached]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate consent
    if (!consent) {
      setError('Devi accettare il consenso per procedere.');
      return;
    }

    setLoading(true);

    try {
      const context = getEstimateContext();
      const anonId = getAnonId();

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          message: message || undefined,
          estimate_id: context?.estimate_id || 'unknown',
          anon_id: anonId,
          consent_given: consent,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.message);
        setLoading(false);
        return;
      }

      // Track success (no PII)
      trackLeadSubmitted({
        confidence,
        dealer_gap_bucket: getDealerGapBucket(dealerGap),
        cached,
      });

      setSuccess(true);
      setLoading(false);
    } catch {
      setError("Errore di connessione. Riprova.");
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="glass-card p-6 opacity-0 animate-fade-in-up">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Richiesta inviata!
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Ti contatteremo presto per approfondire la valutazione del tuo veicolo.
          </p>
        </div>
      </div>
    );
  }

  // Collapsed state
  if (!isOpen) {
    return (
      <div className="glass-card p-5 opacity-0 animate-fade-in-up animate-delay-500">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              Vuoi una valutazione reale o essere ricontattato?
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Lascia i tuoi dati e potrai essere contattato da VibeCar o da operatori del settore automotive per approfondire la vendita del tuo veicolo. Nessun impegno.
            </p>
            <button
              onClick={() => setIsOpen(true)}
              className="btn-primary text-sm px-5 py-2.5"
            >
              Richiedi contatto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expanded form state
  return (
    <div className="glass-card p-6 opacity-0 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Richiedi contatto
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-lg hover:bg-[var(--obsidian-600)] transition-colors"
          aria-label="Chiudi"
        >
          <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="lead-name" className="text-sm font-medium text-[var(--text-secondary)]">
            Nome e cognome <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="lead-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mario Rossi"
            required
            className="w-full"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="lead-email" className="text-sm font-medium text-[var(--text-secondary)]">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="lead-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mario.rossi@email.com"
            required
            className="w-full"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label htmlFor="lead-phone" className="text-sm font-medium text-[var(--text-secondary)]">
            Telefono <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            id="lead-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+39 333 1234567"
            required
            className="w-full"
          />
        </div>

        {/* Message (optional) */}
        <div className="space-y-1.5">
          <label htmlFor="lead-message" className="text-sm font-medium text-[var(--text-secondary)]">
            Messaggio <span className="text-[var(--text-muted)]">(opzionale)</span>
          </label>
          <textarea
            id="lead-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Scrivi qui eventuali note..."
            rows={3}
            className="w-full resize-none"
          />
        </div>

        {/* GDPR Consent Checkbox */}
        <div className="space-y-2 pt-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[var(--obsidian-400)] bg-[var(--obsidian-700)] text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {CONSENT_TEXT}{' '}
              <Link
                href="/privacy-policy"
                target="_blank"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Leggi l&apos;informativa privacy
              </Link>
              . <span className="text-red-400">*</span>
            </span>
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-[var(--error-muted)] border border-[var(--error)]/30">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !consent}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Invio in corso...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <span>Richiedi contatto</span>
            </>
          )}
        </button>

        {/* Privacy note */}
        <p className="text-xs text-[var(--text-muted)] text-center">
          I tuoi dati saranno trattati nel rispetto del GDPR.
        </p>
      </form>
    </div>
  );
}
