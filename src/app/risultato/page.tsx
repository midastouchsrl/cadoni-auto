'use client';

/**
 * VibeCar Results Page
 * Premium valuation results display
 * Supports loading from:
 * - sessionStorage (normal flow)
 * - URL parameter ?sid=<estimate_id> (shared link)
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ValuationResultDisplay from '@/components/ValuationResult';
import ThemeToggle from '@/components/ThemeToggle';
import { ValuationResult } from '@/lib/types';

export default function RisultatoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [input, setInput] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharedView, setIsSharedView] = useState(false);

  useEffect(() => {
    const loadResult = async () => {
      // Check for shared estimate ID in URL
      const sid = searchParams.get('sid');

      if (sid) {
        // Load from API (shared link)
        setIsSharedView(true);
        try {
          const response = await fetch(`/api/estimate/${sid}`);
          const data = await response.json();

          if (data.error) {
            setError(data.message || 'Valutazione non trovata');
            setLoading(false);
            return;
          }

          // Set result and input from API response
          setResult(data);
          setInput(data.input);
          setLoading(false);
        } catch (err) {
          console.error('Error loading shared estimate:', err);
          setError('Impossibile caricare la valutazione');
          setLoading(false);
        }
        return;
      }

      // Load from sessionStorage (normal flow)
      const storedResult = sessionStorage.getItem('vibecar_result');
      const storedInput = sessionStorage.getItem('vibecar_input');

      if (!storedResult || !storedInput) {
        router.replace('/');
        return;
      }

      try {
        setResult(JSON.parse(storedResult));
        setInput(JSON.parse(storedInput));
        setLoading(false);
      } catch {
        router.replace('/');
      }
    };

    loadResult();
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* Background orbs - brand teal */}
        <div className="gradient-orb gradient-orb-teal w-[500px] h-[500px] top-[20%] right-[10%] fixed" />

        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 animate-pulse-glow" />
            <div className="absolute inset-0 rounded-2xl bg-[var(--obsidian-800)] m-[2px] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-400 animate-spin"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </div>
          </div>
          <p className="text-[var(--text-secondary)]">Caricamento risultati...</p>
        </div>
      </div>
    );
  }

  // Error state (shared estimate not found)
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="gradient-orb gradient-orb-teal w-[500px] h-[500px] top-[20%] right-[10%] fixed" />

        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Valutazione non disponibile</h2>
          <p className="text-[var(--text-secondary)] mb-6">{error}</p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Fai una nuova valutazione
          </Link>
        </div>
      </div>
    );
  }

  if (!result || !input) {
    return null;
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background orbs - brand teal */}
      <div className="gradient-orb gradient-orb-teal w-[600px] h-[600px] -top-[200px] -right-[200px] fixed" />
      <div className="gradient-orb gradient-orb-teal-muted w-[400px] h-[400px] bottom-[10%] -left-[100px] fixed" />

      {/* Header */}
      <header className="relative py-6 border-b border-[var(--obsidian-700)]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
            >
              <svg
                className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              <span className="text-sm font-medium">Nuova valutazione</span>
            </Link>

            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/brand/logo regular light@600x.png"
                alt="vibecar"
                className="h-6 dark:block hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/brand/logo regular@600x.png"
                alt="vibecar"
                className="h-6 dark:hidden block"
              />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 md:py-12">
        <div className="opacity-0 animate-fade-in-up">
          <ValuationResultDisplay
            result={result}
            input={input as { brand: string; model: string; year: string; km: string; fuel: string; gearbox: string; condition: string }}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-8 border-t border-[var(--obsidian-700)] mt-auto">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Logo - left */}
            <div className="flex flex-col items-center md:items-start gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/brand/logo regular light@600x.png"
                alt="vibecar"
                className="h-6 dark:block hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/brand/logo regular@600x.png"
                alt="vibecar"
                className="h-6 dark:hidden block"
              />
              <span className="text-xs text-[var(--text-muted)]">&copy; 2026 VibeCar</span>
            </div>

            {/* Disclaimer - center */}
            <div className="text-xs text-[var(--text-muted)] text-center">
              <p>
                Valutazione indicativa basata su dati di mercato pubblicamente disponibili.<br className="hidden sm:inline" />
                Non costituisce offerta di acquisto.
              </p>
              <a
                href="/privacy-policy"
                className="inline-block mt-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors underline"
              >
                Privacy Policy
              </a>
            </div>

            {/* Developer credits - right */}
            <p className="text-xs text-[var(--text-muted)] tracking-[0.15em] uppercase text-center md:text-right">
              Made with intention by{' '}
              <a
                href="https://www.midastouch.it"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C9A962] hover:text-[#D4B978] transition-colors"
              >
                Midas Touch
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
