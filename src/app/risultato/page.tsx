'use client';

/**
 * VibeCar Results Page
 * Premium valuation results display
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ValuationResultDisplay from '@/components/ValuationResult';
import ContactForm from '@/components/ContactForm';
import ThemeToggle from '@/components/ThemeToggle';
import { ValuationResult } from '@/lib/types';

export default function RisultatoPage() {
  const router = useRouter();
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [input, setInput] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* Background orbs */}
        <div className="gradient-orb gradient-orb-purple w-[500px] h-[500px] top-[20%] right-[10%] fixed opacity-20" />

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

  if (!result || !input) {
    return null;
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background orbs */}
      <div className="gradient-orb gradient-orb-purple w-[600px] h-[600px] -top-[200px] -right-[200px] fixed opacity-25" />
      <div className="gradient-orb gradient-orb-purple w-[400px] h-[400px] bottom-[10%] -left-[100px] fixed opacity-15" />

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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold">VibeCar</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 md:py-12">
        <div className="opacity-0 animate-fade-in-up">
          <h1 className="text-2xl md:text-3xl font-bold mb-8">
            Risultato valutazione
          </h1>

          <ValuationResultDisplay
            result={result}
            input={input as { brand: string; model: string; year: string; km: string; fuel: string; gearbox: string; condition: string }}
          />

          {/* Contact Form */}
          <div className="mt-10">
            <ContactForm
              carInfo={{
                brand: input.brand,
                model: input.model,
                year: input.year,
                km: input.km,
              }}
              valuation={{
                range_min: result.range_min,
                range_max: result.range_max,
              }}
            />
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in-up animate-delay-500">
            <Link
              href="/"
              className="btn-secondary flex-1 text-center"
            >
              Nuova valutazione
            </Link>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `Valutazione ${input.brand} ${input.model}`,
                    text: `Valore stimato: ${result.range_min.toLocaleString('it-IT')}€ - ${result.range_max.toLocaleString('it-IT')}€`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(
                    `${input.brand} ${input.model} ${input.year} - Valore: ${result.range_min.toLocaleString('it-IT')}€ - ${result.range_max.toLocaleString('it-IT')}€`
                  );
                  alert('Copiato negli appunti!');
                }
              }}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                />
              </svg>
              Condividi
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-6 border-t border-[var(--obsidian-800)] mt-auto">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            VibeCar - Valutazione indicativa basata su dati pubblici di mercato
          </p>
        </div>
      </footer>
    </main>
  );
}
