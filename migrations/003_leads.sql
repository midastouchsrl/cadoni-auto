-- Migration: 003_leads
-- Description: GDPR-compliant leads table for contact requests
-- Created: 2026-01-04

CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Attribution (links to estimate)
  estimate_id TEXT NOT NULL,
  anon_id TEXT NOT NULL,

  -- Contact info (minimal PII)
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NULL,

  -- GDPR compliance (explicit consent logging)
  consent_given BOOLEAN NOT NULL,
  consent_text TEXT NOT NULL,
  consent_timestamp TIMESTAMPTZ NOT NULL,

  -- Status tracking
  source TEXT NOT NULL DEFAULT 'vibecar',
  status TEXT NOT NULL DEFAULT 'new'
  -- Note: No IP, no user-agent, no unnecessary data
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_estimate_id ON leads(estimate_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
