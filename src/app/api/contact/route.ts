/**
 * Lead Submission API
 * GDPR-compliant contact form handler
 *
 * - Validates explicit consent
 * - Stores minimal PII
 * - Logs consent text and timestamp
 * - Sends email notification via Brevo
 * - No IP/user-agent collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Consent text (must match frontend exactly)
const CONSENT_TEXT =
  "Acconsento a essere contattato da VibeCar e/o da operatori del settore automotive partner, esclusivamente per ricevere una valutazione o proposta relativa alla vendita del mio veicolo, come descritto nell'informativa privacy.";

// Email configuration
const NOTIFICATION_EMAIL = 'info@vibecar.it';
const SENDER_EMAIL = 'info@vibecar.it';
const SENDER_NAME = 'VibeCar';

interface LeadRequest {
  name: string;
  email: string;
  phone: string;
  city?: string;
  message?: string;
  estimate_id: string;
  anon_id: string;
  consent_given: boolean;
  // Optional: car info for email context
  car_info?: {
    brand: string;
    model: string;
    year: string;
    valuation: string;
  };
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

// Send email notification via Brevo REST API
async function sendEmailNotification(lead: {
  name: string;
  email: string;
  phone: string;
  city?: string;
  message?: string;
  estimate_id: string;
  car_info?: LeadRequest['car_info'];
}): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.warn('[Lead API] BREVO_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const carInfo = lead.car_info
      ? `${lead.car_info.brand} ${lead.car_info.model} (${lead.car_info.year}) - Valutazione: ${lead.car_info.valuation}`
      : 'Non disponibile';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #0d9488); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .field { margin-bottom: 16px; }
    .label { font-weight: 600; color: #374151; display: block; margin-bottom: 4px; }
    .value { color: #111827; }
    .footer { background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .cta { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Nuova richiesta di contatto</h1>
      <p style="margin: 8px 0 0; opacity: 0.9;">Un utente vuole essere ricontattato per la vendita della sua auto</p>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">Nome</span>
        <span class="value">${lead.name}</span>
      </div>
      <div class="field">
        <span class="label">Email</span>
        <span class="value"><a href="mailto:${lead.email}">${lead.email}</a></span>
      </div>
      <div class="field">
        <span class="label">Telefono</span>
        <span class="value"><a href="tel:${lead.phone}">${lead.phone}</a></span>
      </div>
      ${lead.city ? `
      <div class="field">
        <span class="label">Città</span>
        <span class="value">${lead.city}</span>
      </div>
      ` : ''}
      <div class="field">
        <span class="label">Veicolo valutato</span>
        <span class="value">${carInfo}</span>
      </div>
      ${lead.message ? `
      <div class="field">
        <span class="label">Messaggio</span>
        <span class="value">${lead.message}</span>
      </div>
      ` : ''}
      <div class="field">
        <span class="label">ID Stima</span>
        <span class="value" style="font-family: monospace; font-size: 12px;">${lead.estimate_id}</span>
      </div>
      <a href="tel:${lead.phone}" class="cta">Chiama ora</a>
    </div>
    <div class="footer">
      <p>Questa email è stata inviata automaticamente da VibeCar.</p>
      <p>L'utente ha acconsentito al trattamento dei dati secondo la privacy policy.</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Nuova richiesta di contatto VibeCar

Nome: ${lead.name}
Email: ${lead.email}
Telefono: ${lead.phone}
${lead.city ? `Città: ${lead.city}` : ''}
Veicolo: ${carInfo}
${lead.message ? `Messaggio: ${lead.message}` : ''}
ID Stima: ${lead.estimate_id}

---
L'utente ha acconsentito al trattamento dei dati secondo la privacy policy.
    `.trim();

    // Use Brevo REST API directly (more reliable in serverless)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: NOTIFICATION_EMAIL, name: 'VibeCar Team' }],
        replyTo: { email: lead.email, name: lead.name },
        subject: `[VibeCar] Nuova richiesta: ${lead.name}`,
        htmlContent: htmlContent,
        textContent: textContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[Lead API] Brevo API error: ${response.status} - ${errorData}`);
      return false;
    }

    const result = await response.json();
    console.log(`[Lead API] Email sent for ${lead.estimate_id}, messageId: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('[Lead API] Email send error:', error);
    return false;
  }
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
    const sanitizedName = sanitize(body.name);
    const sanitizedEmail = body.email.toLowerCase().trim();
    const sanitizedPhone = body.phone.replace(/[\s\-\.]/g, '');
    const sanitizedCity = body.city ? sanitize(body.city) : null;
    const sanitizedMessage = body.message ? sanitize(body.message) : null;

    await sql`
      INSERT INTO leads (
        estimate_id,
        anon_id,
        name,
        email,
        phone,
        city,
        message,
        consent_given,
        consent_text,
        consent_timestamp,
        source,
        status
      ) VALUES (
        ${body.estimate_id},
        ${body.anon_id},
        ${sanitizedName},
        ${sanitizedEmail},
        ${sanitizedPhone},
        ${sanitizedCity},
        ${sanitizedMessage},
        ${body.consent_given},
        ${CONSENT_TEXT},
        ${consentTimestamp},
        'vibecar',
        'new'
      )
    `;

    console.log(`[Lead API] Lead saved for estimate ${body.estimate_id}`);

    // Send email notification (await to ensure it completes in serverless)
    const emailSent = await sendEmailNotification({
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      city: sanitizedCity || undefined,
      message: sanitizedMessage || undefined,
      estimate_id: body.estimate_id,
      car_info: body.car_info,
    });

    if (!emailSent) {
      console.warn(`[Lead API] Email not sent for ${body.estimate_id}, but lead saved`);
    }

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
