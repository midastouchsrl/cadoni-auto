/**
 * Lead Submission API
 * GDPR-compliant contact form handler
 *
 * - Validates explicit consent
 * - Stores minimal PII
 * - Logs consent text and timestamp
 * - No IP/user-agent collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Consent text (must match frontend exactly)
const CONSENT_TEXT =
  "Acconsento a essere contattato da VibeCar e/o da operatori del settore automotive partner, esclusivamente per ricevere una valutazione o proposta relativa alla vendita del mio veicolo, come descritto nell'informativa privacy.";

interface LeadRequest {
  name: string;
  email: string;
  phone: string;
  message?: string;
  estimate_id: string;
  anon_id: string;
  consent_given: boolean;
}

// Basic email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Basic phone validation (Italian format)
function isValidPhone(phone: string): boolean {
  // Remove spaces, dashes, dots and check for 9-15 digits
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  return /^\+?[0-9]{9,15}$/.test(cleaned);
}

// Sanitize text input
function sanitize(text: string): string {
  return text.trim().slice(0, 500);
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json(
        { error: true, message: 'Compila tutti i campi obbligatori.' },
        { status: 400 }
      );
    }

    // Validate consent (GDPR requirement)
    if (!body.consent_given) {
      return NextResponse.json(
        { error: true, message: 'Il consenso è obbligatorio per procedere.' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        { error: true, message: 'Inserisci un indirizzo email valido.' },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!isValidPhone(body.phone)) {
      return NextResponse.json(
        { error: true, message: 'Inserisci un numero di telefono valido.' },
        { status: 400 }
      );
    }

    // Validate estimate_id and anon_id
    if (!body.estimate_id || !body.anon_id) {
      return NextResponse.json(
        { error: true, message: 'Dati di sessione mancanti. Ricarica la pagina.' },
        { status: 400 }
      );
    }

    // Get database connection
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('[Lead API] DATABASE_URL not configured');
      return NextResponse.json(
        { error: true, message: 'Errore di configurazione. Riprova più tardi.' },
        { status: 500 }
      );
    }

    const sql = neon(databaseUrl);

    // Insert lead with GDPR consent logging
    const consentTimestamp = new Date().toISOString();

    await sql`
      INSERT INTO leads (
        estimate_id,
        anon_id,
        name,
        email,
        phone,
        message,
        consent_given,
        consent_text,
        consent_timestamp,
        source,
        status
      ) VALUES (
        ${body.estimate_id},
        ${body.anon_id},
        ${sanitize(body.name)},
        ${body.email.toLowerCase().trim()},
        ${body.phone.replace(/[\s\-\.]/g, '')},
        ${body.message ? sanitize(body.message) : null},
        ${body.consent_given},
        ${CONSENT_TEXT},
        ${consentTimestamp},
        'vibecar',
        'new'
      )
    `;

    console.log(`[Lead API] Lead saved for estimate ${body.estimate_id}`);

    return NextResponse.json({
      success: true,
      message: 'Richiesta inviata con successo! Ti contatteremo presto.',
    });
  } catch (error) {
    console.error('[Lead API] Error:', error);
    return NextResponse.json(
      { error: true, message: "Errore durante l'invio. Riprova." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API Contact attiva. Usa POST per inviare una richiesta.',
  });
}
