/**
 * Share Card Generator for VibeCar
 * Generates story-format images (1080x1920) for Instagram Stories
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

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(180deg, #0c1117 0%, ${BRAND_NAVY} 50%, #0c1117 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorations - brand teal glow */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(45, 212, 191, 0.15) 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          }}
        />

        {/* Verification Badge - Top Right */}
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '60px',
            display: 'flex',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${baseUrl}/images/brand/badge-dark.png`}
            width="80"
            height="80"
            alt=""
          />
        </div>

        {/* Header with logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '80px',
            paddingBottom: '40px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${baseUrl}/images/brand/logo-light.png`}
            height="56"
            alt="vibecar"
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 60px' }}>
          {/* Car info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '48px',
            }}
          >
            <span
              style={{
                color: '#9ca3af',
                fontSize: '24px',
                textTransform: 'uppercase',
                letterSpacing: '4px',
                marginBottom: '16px',
              }}
            >
              Valutazione
            </span>
            <span
              style={{
                color: 'white',
                fontSize: '56px',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: 1.1,
              }}
            >
              {brand} {model}
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '20px',
              }}
            >
              <span style={{ color: '#94a3b8', fontSize: '28px' }}>{year}</span>
              <span style={{ color: '#475569', fontSize: '28px' }}>•</span>
              <span style={{ color: '#94a3b8', fontSize: '28px' }}>{formatKm(km)}</span>
              {fuel && (
                <>
                  <span style={{ color: '#475569', fontSize: '28px' }}>•</span>
                  <span style={{ color: '#94a3b8', fontSize: '28px', textTransform: 'capitalize' }}>{fuel}</span>
                </>
              )}
            </div>
          </div>

          {/* Main price card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 80px',
              borderRadius: '32px',
              background: `linear-gradient(135deg, ${BRAND_TEAL}, #14b8a6, #0d9488)`,
              marginBottom: '40px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '22px',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                marginBottom: '12px',
              }}
            >
              Valore di mercato
            </span>
            <span
              style={{
                color: 'white',
                fontSize: '80px',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {formatPrice(p50)}
            </span>
          </div>

          {/* Range */}
          <div
            style={{
              display: 'flex',
              gap: '48px',
              marginBottom: '48px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '20px', marginBottom: '4px' }}>Minimo</span>
              <span style={{ color: '#60a5fa', fontSize: '36px', fontWeight: 600 }}>{formatPrice(p25)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '20px', marginBottom: '4px' }}>Massimo</span>
              <span style={{ color: '#fbbf24', fontSize: '36px', fontWeight: 600 }}>{formatPrice(p75)}</span>
            </div>
          </div>

        </div>

        {/* Footer CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: '80px',
            paddingTop: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 32px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ color: '#94a3b8', fontSize: '24px' }}>Valuta anche la tua su</span>
            <span style={{ color: BRAND_TEAL, fontSize: '24px', fontWeight: 600 }}>vibecar.it</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  );
}
