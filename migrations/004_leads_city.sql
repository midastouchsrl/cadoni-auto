-- Migration: 004_leads_city
-- Description: Add city field to leads table for refined geographic data
-- Created: 2026-01-05

ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT NULL;

-- Index for geographic analysis
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
