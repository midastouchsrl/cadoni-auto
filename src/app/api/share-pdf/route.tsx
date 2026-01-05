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

  // A4 ratio dimensions optimized for quality
  const width = 1080;
  const height = 1527;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '40px',
            paddingBottom: '24px',
            borderBottom: `2px solid ${BRAND_TEAL}`,
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/images/brand/logo-dark.png`}
              height="40"
              alt="vibecar"
            />
          </div>

          {/* Badge & Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Verification Badge */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/images/brand/badge-dark.png`}
              width="48"
              height="48"
              alt=""
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>{today}</span>
              {estimateId && (
                <span style={{ color: '#9ca3af', fontSize: '12px', fontFamily: 'monospace' }}>
                  ID: {estimateId.slice(0, 8)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle info */}
        <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#9ca3af', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Veicolo valutato
          </span>
          <span style={{ color: '#111827', fontSize: '42px', fontWeight: 700, marginTop: '8px', marginBottom: '8px' }}>
            {brand} {model}
          </span>
          <div style={{ display: 'flex', gap: '24px', color: '#6b7280', fontSize: '18px' }}>
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
            padding: '40px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #f0fdfa, #ecfdf5)',
            border: `2px solid ${BRAND_TEAL}`,
            marginBottom: '32px',
          }}
        >
          <span style={{ color: BRAND_NAVY, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
            Valore di mercato stimato
          </span>
          <span style={{ color: '#0d9488', fontSize: '64px', fontWeight: 700, lineHeight: 1 }}>
            {formatPrice(p50)}
          </span>
          <div style={{ display: 'flex', gap: '32px', marginTop: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>Prezzo minimo</span>
              <span style={{ color: '#3b82f6', fontSize: '28px', fontWeight: 600 }}>{formatPrice(p25)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>Prezzo massimo</span>
              <span style={{ color: '#f59e0b', fontSize: '28px', fontWeight: 600 }}>{formatPrice(p75)}</span>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div
          style={{
            padding: '24px',
            borderRadius: '16px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            marginBottom: '40px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ color: '#111827', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            Come leggere questa valutazione
          </span>
          <span style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
            Il valore centrale rappresenta il prezzo di vendita più probabile per veicoli simili al tuo. L&apos;intervallo minimo-massimo indica la fascia in cui la maggior parte dei veicoli viene venduta.
          </span>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
              Valutazione generata automaticamente
            </span>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
              Non costituisce un&apos;offerta di acquisto
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: BRAND_TEAL, fontSize: '18px', fontWeight: 600 }}>vibecar.it</span>
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
