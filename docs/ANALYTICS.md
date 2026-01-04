# VibeCar Analytics Documentation

## Overview

VibeCar utilizza uno stack analytics privacy-first per monitorare crescita, viralità e qualità del prodotto.

**Stack:**
- **Plausible** - Web analytics (no cookies, GDPR compliant)
- **PostHog** - Event tracking dettagliato
- **Vercel Analytics** - Performance monitoring
- **Sentry** - Error tracking

---

## Events Tracked

### Plausible Goals (Web Analytics)

| Goal | Trigger | Props |
|------|---------|-------|
| `estimate_completed` | Valutazione completata | `confidence`, `cached` |
| `share_clicked` | Click su bottone share | `type` |
| `share_image_downloaded` | Download immagine social | - |

### PostHog Events (Detailed Analytics)

| Event | Trigger | Properties |
|-------|---------|------------|
| `start_estimate` | Submit form valutazione | `brand`, `model`, `year`, `km_range`, `fuel`, `gearbox` |
| `estimate_completed` | Risultato mostrato | `brand`, `model`, `year`, `confidence`, `n_used`, `cached`, `p50_range`, `fallback_step`, `time_to_result_ms` |
| `estimate_cached` | Risultato da cache | `cached: true` |
| `estimate_failed` | Nessun risultato | `brand`, `model`, `year`, `reason` |
| `fallback_triggered` | Ricerca ampliata | `step`, `brand`, `model` |
| `share_clicked` | Click share button | `type`, `brand`, `model`, `year`, `confidence` |
| `share_completed` | Share effettuato | `type`, `brand`, `model` |
| `recalculation_clicked` | Click "Ricalcola" | `brand`, `model`, `year` |
| `viral_visit` | Visita da link condiviso | `source`, `referrer_domain` |
| `utm_visit` | Visita con UTM params | `utm_source`, `utm_medium` |
| `error_occurred` | Errore client | `error`, context |

---

## Funnel Definition

```
Home → Start Estimate → Estimate Completed → Share Clicked → Share Completed
```

**Steps:**
1. `start_estimate` - Utente inizia valutazione
2. `estimate_completed` - Valutazione completata con successo
3. `share_clicked` - Utente clicca su condividi
4. `share_completed` - Condivisione effettuata

---

## Key Metrics

### Share Rate
```
share_clicked / estimate_completed × 100
```
Percentuale di utenti che condividono la valutazione.

### Cache Hit Rate
```
estimate_cached / estimate_completed × 100
```
Percentuale di stime servite da cache (risparmio scraping).

### Fallback Rate
```
fallback_triggered / estimate_completed × 100
```
Percentuale di stime che richiedono ricerca ampliata.

### Time to Result (P50)
```
percentile(time_to_result_ms, 50)
```
Tempo mediano dalla submit alla visualizzazione risultato.

### Confidence Distribution
```
GROUP BY confidence → count
```
Distribuzione affidabilità: alta/media/bassa.

---

## Viral Metrics

### K-Factor (Viral Coefficient)

```
K = i × c
```

Dove:
- `i` = inviti medi per utente = `share_completed / estimate_completed`
- `c` = conversion rate = `estimate_completed[source=share] / viral_visit`

**Come misurarlo:**
1. Link condivisi includono `?ref=share`
2. `viral_visit` traccia arrivi da share
3. Se `viral_visit` → `estimate_completed`, è una conversione virale

**Target K-factor:**
- K < 1: Crescita sub-virale (serve paid acquisition)
- K = 1: Sostenibile
- K > 1: Crescita virale organica

### Repeat Usage Rate
```
users with >1 estimate / total users
```
Tracciabile via PostHog distinct_id (anonimo).

---

## Privacy & Data Minimization

### NO PII Collected

| ❌ Non tracciamo | ✅ Tracciamo invece |
|------------------|---------------------|
| Email | - |
| Nome | - |
| IP address | - |
| User ID | Anonymous session |
| Prezzo esatto | Range (es. "15-20k") |
| KM esatto | Range (es. "50-100k") |
| Targa/VIN | - |

### Privacy Measures

1. **Plausible**: No cookies, no tracking pixels, aggregated only
2. **PostHog**:
   - `persistence: 'memory'` (no cookies)
   - `autocapture: false` (solo eventi manuali)
   - `sanitize_properties` rimuove PII
3. **Sentry**: `beforeSend` rimuove IP/email
4. **Nessun cookie banner necessario**: tutto anonimo

### Data Anonymization

```typescript
// KM → Range
function getKmRange(km: number): string {
  if (km < 10000) return '0-10k';
  if (km < 30000) return '10-30k';
  // ...
}

// Prezzo → Range
function getPriceRange(price: number): string {
  if (price < 5000) return '0-5k';
  if (price < 10000) return '5-10k';
  // ...
}
```

---

## Setup Checklist

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=vibecar.it
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=vibecar
```

### Verification Checklist

- [ ] Plausible dashboard mostra page views
- [ ] PostHog riceve eventi `start_estimate`
- [ ] PostHog riceve eventi `estimate_completed`
- [ ] Share events tracciati correttamente
- [ ] Sentry cattura errori (test con `throw new Error`)
- [ ] Vercel Analytics attivo su dashboard
- [ ] Nessun PII nei payload (verificare in PostHog)
- [ ] Link condivisi includono `?ref=share`

---

## PostHog Dashboard Setup

### Recommended Insights

1. **Daily Active Valuations**
   - Event: `estimate_completed`
   - Breakdown: `confidence`

2. **Share Funnel**
   - Steps: `estimate_completed` → `share_clicked` → `share_completed`

3. **Cache Efficiency**
   - Event: `estimate_completed`
   - Filter: `cached = true`
   - Compare: total vs cached

4. **Viral Tracking**
   - Event: `viral_visit`
   - Breakdown: `referrer_domain`

5. **Error Rate**
   - Event: `estimate_failed`
   - Breakdown: `reason`

---

## Files

| File | Description |
|------|-------------|
| `src/lib/analytics.ts` | Core analytics module |
| `src/components/AnalyticsProvider.tsx` | React provider |
| `sentry.client.config.ts` | Sentry client config |
| `sentry.server.config.ts` | Sentry server config |
| `sentry.edge.config.ts` | Sentry edge config |
