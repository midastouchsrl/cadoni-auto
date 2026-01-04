/**
 * Privacy Policy Page
 * GDPR-compliant privacy information
 */

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | VibeCar',
  description: 'Informativa sulla privacy e trattamento dei dati personali di VibeCar.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--obsidian-900)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Torna alla home
        </Link>

        {/* Content */}
        <article className="glass-card p-8 space-y-8">
          <header>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Informativa sulla Privacy
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Ultimo aggiornamento: Gennaio 2026
            </p>
          </header>

          {/* Titolare */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              1. Titolare del trattamento
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Il titolare del trattamento dei dati personali è <strong>VibeCar</strong>.
              Per qualsiasi domanda relativa alla privacy, puoi contattarci all&apos;indirizzo:{' '}
              <a href="mailto:privacy@vibecar.it" className="text-blue-400 hover:underline">
                privacy@vibecar.it
              </a>
            </p>
          </section>

          {/* Dati raccolti */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              2. Dati che raccogliamo
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Quando utilizzi il nostro servizio di valutazione auto, non raccogliamo dati personali.
              La valutazione è completamente anonima.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Se decidi di richiedere un contatto, raccogliamo solo i dati strettamente necessari:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-1 ml-4">
              <li>Nome e cognome</li>
              <li>Indirizzo email</li>
              <li>Numero di telefono</li>
              <li>Eventuale messaggio (opzionale)</li>
            </ul>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              <strong>Non raccogliamo:</strong> indirizzo IP, user agent, dati di localizzazione,
              targa del veicolo, o altri dati non necessari.
            </p>
          </section>

          {/* Finalità */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              3. Finalità del trattamento
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              I dati raccolti tramite il form di contatto vengono utilizzati esclusivamente per:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-1 ml-4">
              <li>Ricontattarti per approfondire la valutazione del tuo veicolo</li>
              <li>Fornirti informazioni relative alla vendita della tua auto</li>
              <li>Metterti in contatto con operatori del settore automotive interessati</li>
            </ul>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Non utilizziamo i tuoi dati per marketing generico o finalità diverse
              da quelle specificate.
            </p>
          </section>

          {/* Destinatari */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              4. Destinatari dei dati
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              I tuoi dati potranno essere condivisi con:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-1 ml-4">
              <li>Il team VibeCar per gestire la tua richiesta</li>
              <li>
                Operatori del settore automotive partner (concessionari, rivenditori)
                interessati all&apos;acquisto del tuo veicolo
              </li>
            </ul>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              La condivisione avviene solo se hai fornito il consenso esplicito.
              Non vendiamo i tuoi dati a terzi per scopi di marketing.
            </p>
          </section>

          {/* Base giuridica */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              5. Base giuridica
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              La base giuridica per il trattamento dei tuoi dati è il <strong>consenso esplicito</strong>{' '}
              che fornisci al momento della compilazione del form di contatto
              (art. 6, par. 1, lett. a del GDPR).
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Il consenso è libero, specifico, informato e revocabile in qualsiasi momento.
            </p>
          </section>

          {/* Conservazione */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              6. Conservazione dei dati
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              I tuoi dati personali saranno conservati per un periodo massimo di <strong>12 mesi</strong>{' '}
              dalla data di raccolta, dopodiché verranno cancellati automaticamente.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Puoi richiedere la cancellazione anticipata in qualsiasi momento.
            </p>
          </section>

          {/* Diritti */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              7. I tuoi diritti
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              In base al GDPR, hai i seguenti diritti:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-1 ml-4">
              <li><strong>Accesso:</strong> sapere quali dati abbiamo su di te</li>
              <li><strong>Rettifica:</strong> correggere dati inesatti</li>
              <li><strong>Cancellazione:</strong> richiedere la cancellazione dei tuoi dati</li>
              <li><strong>Limitazione:</strong> limitare il trattamento in determinati casi</li>
              <li><strong>Portabilità:</strong> ricevere i tuoi dati in formato strutturato</li>
              <li><strong>Opposizione:</strong> opporti al trattamento</li>
              <li><strong>Revoca del consenso:</strong> ritirare il consenso in qualsiasi momento</li>
            </ul>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Per esercitare questi diritti, contattaci a:{' '}
              <a href="mailto:privacy@vibecar.it" className="text-blue-400 hover:underline">
                privacy@vibecar.it
              </a>
            </p>
          </section>

          {/* Cookie */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              8. Cookie e tracciamento
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              VibeCar utilizza solo strumenti di analytics anonimi e privacy-friendly:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-1 ml-4">
              <li>
                <strong>Plausible Analytics:</strong> statistiche aggregate senza cookie,
                senza tracciamento personale
              </li>
              <li>
                <strong>Identificatori anonimi:</strong> utilizziamo UUID casuali per
                migliorare il servizio, non collegabili alla tua identità
              </li>
            </ul>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Non utilizziamo cookie di profilazione o marketing.
              Non è necessario alcun banner cookie.
            </p>
          </section>

          {/* Contatti */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              9. Contatti
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Per qualsiasi domanda sulla privacy o per esercitare i tuoi diritti:
            </p>
            <div className="p-4 rounded-lg bg-[var(--obsidian-700)] border border-[var(--obsidian-600)]">
              <p className="text-[var(--text-primary)] font-medium">VibeCar</p>
              <p className="text-[var(--text-secondary)]">
                Email:{' '}
                <a href="mailto:privacy@vibecar.it" className="text-blue-400 hover:underline">
                  privacy@vibecar.it
                </a>
              </p>
            </div>
          </section>
        </article>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-[var(--text-muted)]">
          <p>&copy; 2026 VibeCar. Tutti i diritti riservati.</p>
        </footer>
      </div>
    </main>
  );
}
