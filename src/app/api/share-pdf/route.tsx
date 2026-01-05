/**
 * Share PDF/Report Generator for VibeCar
 * Generates a document-style image (A4-like ratio) that can be saved/printed
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Brand colors from logo
const BRAND_NAVY = '#1e293b';
const BRAND_TEAL = '#2dd4bf';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const { searchParams } = url;

  // Get params from URL
  const brand = searchParams.get('brand') || 'Auto';
  const model = searchParams.get('model') || '';
  const year = searchParams.get('year') || '';
  const km = searchParams.get('km') || '0';
  const fuel = searchParams.get('fuel') || '';
  const p50 = searchParams.get('p50') || '0';
  const p25 = searchParams.get('p25') || '0';
  const p75 = searchParams.get('p75') || '0';
  const estimateId = searchParams.get('estimate_id') || '';

  // Format price
  const formatPrice = (price: string) => {
    const num = parseInt(price, 10);
    if (isNaN(num)) return '€ 0';
    return `€ ${num.toLocaleString('it-IT')}`;
  };

  // Format km
  const formatKm = (kmStr: string) => {
    const num = parseInt(kmStr.replace(/\D/g, ''), 10);
    if (isNaN(num)) return '0 km';
    return `${num.toLocaleString('it-IT')} km`;
  };

  // Date
  const today = new Date().toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // A4 ratio dimensions - high resolution for crisp output
  const width = 1620;
  const height = 2290;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          padding: '90px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '60px',
            paddingBottom: '36px',
            borderBottom: `3px solid ${BRAND_TEAL}`,
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/images/brand/logo-dark.png`}
              height="60"
              alt="vibecar"
            />
          </div>

          {/* Badge & Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Verification Badge */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/images/brand/badge-dark.png`}
              width="72"
              height="72"
              alt=""
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#6b7280', fontSize: '21px' }}>{today}</span>
              {estimateId && (
                <span style={{ color: '#9ca3af', fontSize: '18px', fontFamily: 'monospace' }}>
                  ID: {estimateId.slice(0, 8)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle info */}
        <div style={{ marginBottom: '60px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#9ca3af', fontSize: '21px', textTransform: 'uppercase', letterSpacing: '3px' }}>
            Veicolo valutato
          </span>
          <span style={{ color: '#111827', fontSize: '63px', fontWeight: 700, marginTop: '12px', marginBottom: '12px' }}>
            {brand} {model}
          </span>
          <div style={{ display: 'flex', gap: '36px', color: '#6b7280', fontSize: '27px' }}>
            <span>Anno: {year}</span>
            <span>Chilometraggio: {formatKm(km)}</span>
            {fuel && <span>Alimentazione: {fuel}</span>}
          </div>
        </div>

        {/* Main value card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '60px',
            borderRadius: '30px',
            background: 'linear-gradient(135deg, #f0fdfa, #ecfdf5)',
            border: `3px solid ${BRAND_TEAL}`,
            marginBottom: '48px',
          }}
        >
          <span style={{ color: BRAND_NAVY, fontSize: '24px', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '12px' }}>
            Valore di mercato stimato
          </span>
          <span style={{ color: '#0d9488', fontSize: '96px', fontWeight: 700, lineHeight: 1 }}>
            {formatPrice(p50)}
          </span>
          <div style={{ display: 'flex', gap: '48px', marginTop: '36px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#6b7280', fontSize: '21px' }}>Prezzo minimo</span>
              <span style={{ color: '#3b82f6', fontSize: '42px', fontWeight: 600 }}>{formatPrice(p25)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#6b7280', fontSize: '21px' }}>Prezzo massimo</span>
              <span style={{ color: '#f59e0b', fontSize: '42px', fontWeight: 600 }}>{formatPrice(p75)}</span>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div
          style={{
            padding: '36px',
            borderRadius: '24px',
            background: '#f9fafb',
            border: '2px solid #e5e7eb',
            marginBottom: '60px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ color: '#111827', fontSize: '24px', fontWeight: 600, marginBottom: '12px' }}>
            Come leggere questa valutazione
          </span>
          <span style={{ color: '#6b7280', fontSize: '21px', lineHeight: 1.6 }}>
            Il valore centrale rappresenta il prezzo di vendita più probabile per veicoli simili al tuo. L'intervallo minimo-massimo indica la fascia in cui la maggior parte dei veicoli viene venduta.
          </span>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#9ca3af', fontSize: '18px' }}>
              Valutazione generata automaticamente
            </span>
            <span style={{ color: '#9ca3af', fontSize: '18px' }}>
              Non costituisce un'offerta di acquisto
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: BRAND_TEAL, fontSize: '27px', fontWeight: 600 }}>vibecar.it</span>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
    }
  );
}
