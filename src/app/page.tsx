/**
 * VibeCar Homepage
 * Premium car valuation experience
 */

import ValuationForm from '@/components/ValuationForm';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background gradient orbs - brand teal */}
      <div className="gradient-orb gradient-orb-teal w-[600px] h-[600px] -top-[200px] -right-[200px] fixed" />
      <div className="gradient-orb gradient-orb-teal-muted w-[400px] h-[400px] top-[60%] -left-[100px] fixed" />

      {/* Hero Section */}
      <section className="relative pt-8 pb-16 md:pt-16 md:pb-28">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header with Logo and Theme Toggle */}
          <div className="flex items-center justify-between mb-12 md:mb-20 opacity-0 animate-fade-in-up">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/brand/logo regular light@600x.png"
                alt="vibecar"
                className="h-10 dark:block hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/brand/logo regular@600x.png"
                alt="vibecar"
                className="h-10 dark:hidden block"
              />
            </div>
            <ThemeToggle />
          </div>

          {/* Headline */}
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-[1.1] opacity-0 animate-fade-in-up animate-delay-100">
              Quanto vale{' '}
              <span className="text-gradient-brand">davvero</span>{' '}
              la tua auto?
            </h1>

            <p className="text-xl md:text-2xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-6 opacity-0 animate-fade-in-up animate-delay-200">
              Stima basata su veicoli simili al tuo, con un intervallo di prezzo chiaro.
            </p>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--text-muted)] opacity-0 animate-fade-in-up animate-delay-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                <span>Aggiornato sul mercato attuale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Nessuna registrazione</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="relative pb-16 md:pb-24">
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-6">
          <div className="glass-card p-6 md:p-8 lg:p-10 opacity-0 animate-fade-in-up animate-delay-400">
            {/* Form header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Inserisci i dati</h2>
                <p className="text-sm text-[var(--text-muted)]">Compila i campi per ottenere una stima indicativa del valore del tuo veicolo.</p>
              </div>
            </div>

            <ValuationForm />
          </div>
        </div>
      </section>

      {/* Features - Inline layout */}
      <section className="relative py-12 md:py-16 border-t border-[var(--obsidian-700)]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {/* Feature 1 */}
            <div className="flex items-center gap-3 opacity-0 animate-fade-in-up animate-delay-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--obsidian-600)] to-[var(--obsidian-700)] border border-[var(--obsidian-500)] flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              </div>
              <span className="font-medium text-[var(--text-primary)]">Istantaneo</span>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-3 opacity-0 animate-fade-in-up animate-delay-200">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--obsidian-600)] to-[var(--obsidian-700)] border border-[var(--obsidian-500)] flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-[var(--success)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
              </div>
              <span className="font-medium text-[var(--text-primary)]">Affidabile</span>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-3 opacity-0 animate-fade-in-up animate-delay-300">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--obsidian-600)] to-[var(--obsidian-700)] border border-[var(--obsidian-500)] flex items-center justify-center flex-shrink-0">
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
                    d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                  />
                </svg>
              </div>
              <span className="font-medium text-[var(--text-primary)]">Gratuito</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 border-t border-[var(--obsidian-700)]">
        <div className="max-w-5xl mx-auto px-6">
          {/* Main footer row - 3 columns on desktop */}
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
