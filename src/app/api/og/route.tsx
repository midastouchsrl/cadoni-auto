/**
 * OG Image Generator for VibeCar
 * Generates social share cards with valuation data
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
  const p50 = searchParams.get('p50') || '0';
  const p25 = searchParams.get('p25') || '0';
  const p75 = searchParams.get('p75') || '0';
  const samples = searchParams.get('samples') || '0';
  const confidence = searchParams.get('confidence') || 'media';

  // Format price
  const formatPrice = (price: string) => {
    const num = parseInt(price, 10);
    if (isNaN(num)) return '€ 0';
    return `€ ${num.toLocaleString('it-IT')}`;
  };

  // Precision config - marketing-friendly labels with brand colors
  const precisionConfig: Record<string, { bg: string; text: string; label: string }> = {
    alta: { bg: '#065f46', text: BRAND_TEAL, label: 'Precisione elevata' },
    media: { bg: '#854d0e', text: '#fbbf24', label: 'Buona precisione' },
    bassa: { bg: '#1e3a5f', text: '#60a5fa', label: 'Stima indicativa' },
  };

  const conf = precisionConfig[confidence] || precisionConfig.media;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, #0c1117 0%, ${BRAND_NAVY} 50%, #0c1117 100%)`,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${baseUrl}/images/brand/logo-light.png`}
            height="48"
            alt="vibecar"
          />
        </div>

        {/* Car info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span style={{ color: 'white', fontSize: '42px', fontWeight: 700 }}>
            {brand} {model}
          </span>
          <span style={{ color: '#9ca3af', fontSize: '24px', marginTop: '8px' }}>
            {year}
          </span>
        </div>

        {/* Price card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 64px',
            borderRadius: '24px',
            background: `linear-gradient(135deg, ${BRAND_TEAL}, #14b8a6, #0d9488)`,
            marginBottom: '24px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', marginBottom: '8px' }}>
            VALORE STIMATO
          </span>
          <span style={{ color: 'white', fontSize: '64px', fontWeight: 700 }}>
            {formatPrice(p50)}
          </span>
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px' }}>
              Min: {formatPrice(p25)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px' }}>
              Max: {formatPrice(p75)}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ color: '#9ca3af', fontSize: '16px' }}>Veicoli analizzati:</span>
            <span style={{ color: 'white', fontSize: '16px', fontWeight: 600 }}>{samples}</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              background: conf.bg,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                background: conf.text,
              }}
            />
            <span style={{ color: conf.text, fontSize: '16px', fontWeight: 500 }}>
              {conf.label}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
