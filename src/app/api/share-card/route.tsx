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
            top: '-300px',
            right: '-300px',
            width: '900px',
            height: '900px',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(45, 212, 191, 0.15) 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          }}
        />

        {/* Verification Badge - Top Right */}
        <div
          style={{
            position: 'absolute',
            top: '90px',
            right: '90px',
            display: 'flex',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${baseUrl}/images/brand/badge-dark.png`}
            width="120"
            height="120"
            alt=""
          />
        </div>

        {/* Header with logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '120px',
            paddingBottom: '60px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${baseUrl}/images/brand/logo-light.png`}
            height="84"
            alt="vibecar"
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 90px' }}>
          {/* Car info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '72px',
            }}
          >
            <span
              style={{
                color: '#9ca3af',
                fontSize: '36px',
                textTransform: 'uppercase',
                letterSpacing: '6px',
                marginBottom: '24px',
              }}
            >
              Valutazione
            </span>
            <span
              style={{
                color: 'white',
                fontSize: '84px',
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
                gap: '24px',
                marginTop: '30px',
              }}
            >
              <span style={{ color: '#94a3b8', fontSize: '42px' }}>{year}</span>
              <span style={{ color: '#475569', fontSize: '42px' }}>•</span>
              <span style={{ color: '#94a3b8', fontSize: '42px' }}>{formatKm(km)}</span>
              {fuel && (
                <>
                  <span style={{ color: '#475569', fontSize: '42px' }}>•</span>
                  <span style={{ color: '#94a3b8', fontSize: '42px', textTransform: 'capitalize' }}>{fuel}</span>
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
              padding: '72px 120px',
              borderRadius: '48px',
              background: `linear-gradient(135deg, ${BRAND_TEAL}, #14b8a6, #0d9488)`,
              marginBottom: '60px',
              boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.5)',
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '33px',
                textTransform: 'uppercase',
                letterSpacing: '5px',
                marginBottom: '18px',
              }}
            >
              Valore di mercato
            </span>
            <span
              style={{
                color: 'white',
                fontSize: '120px',
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
              gap: '72px',
              marginBottom: '72px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '30px', marginBottom: '6px' }}>Minimo</span>
              <span style={{ color: '#60a5fa', fontSize: '54px', fontWeight: 600 }}>{formatPrice(p25)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '30px', marginBottom: '6px' }}>Massimo</span>
              <span style={{ color: '#fbbf24', fontSize: '54px', fontWeight: 600 }}>{formatPrice(p75)}</span>
            </div>
          </div>

        </div>

        {/* Footer CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: '120px',
            paddingTop: '60px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              padding: '24px 48px',
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ color: '#94a3b8', fontSize: '36px' }}>Valuta anche la tua su</span>
            <span style={{ color: BRAND_TEAL, fontSize: '36px', fontWeight: 600 }}>vibecar.it</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1620,
      height: 2880,
    }
  );
}
