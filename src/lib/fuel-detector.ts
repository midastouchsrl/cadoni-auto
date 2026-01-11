/**
 * Smart Fuel Detection from Variant/Version Name
 * Auto-detects fuel type from version name keywords
 */

import { FuelType } from './types';

export interface FuelDetectionResult {
  detectedFuel: FuelType | null;
  confidence: 'high' | 'medium' | 'low';
  matchedKeyword: string | null;
}

// Keywords mapped to fuel types, ordered by specificity
const FUEL_KEYWORDS: Array<{
  pattern: RegExp;
  fuel: FuelType;
  confidence: 'high' | 'medium';
}> = [
  // Electric - high confidence
  { pattern: /\b(electric|elettric[ao]|ev|bev)\b/i, fuel: 'elettrica', confidence: 'high' },
  { pattern: /\be-(?:tron|2008|208|3008|c4|corsa|up|golf)\b/i, fuel: 'elettrica', confidence: 'high' },
  { pattern: /\bid\.?\s*\d/i, fuel: 'elettrica', confidence: 'high' },  // VW ID.3, ID.4 etc.

  // Hybrid - high confidence
  { pattern: /\b(hybrid|ibrid[ao]|hev|phev|plug-?in)\b/i, fuel: 'ibrida', confidence: 'high' },
  { pattern: /\be-?tech\b/i, fuel: 'ibrida', confidence: 'high' },  // Renault E-Tech
  { pattern: /\bmhev\b/i, fuel: 'ibrida', confidence: 'high' },  // Mild Hybrid

  // Diesel - high confidence (specific engine codes)
  { pattern: /\b(tdi|cdi|hdi|cdti|d4d|dci|blue?hdi|jtd[m]?|ddis|crdi|mjet|multijet)\b/i, fuel: 'diesel', confidence: 'high' },
  { pattern: /\beco?diesel\b/i, fuel: 'diesel', confidence: 'high' },
  { pattern: /\b\d+\.\d+\s*d\b/i, fuel: 'diesel', confidence: 'medium' },  // 2.0 D

  // Petrol - high confidence (specific engine codes)
  { pattern: /\b(tsi|tfsi|fsi|gti|vti|thp|puretech|firefly|multiair|vtec|skyactiv-g)\b/i, fuel: 'benzina', confidence: 'high' },
  { pattern: /\bturbo\s*benzina\b/i, fuel: 'benzina', confidence: 'high' },
  { pattern: /\b(t-gdi|gdi)\b/i, fuel: 'benzina', confidence: 'high' },  // Hyundai/Kia

  // GPL - high confidence
  { pattern: /\b(gpl|lpg|bi-?fuel|bifuel)\b/i, fuel: 'gpl', confidence: 'high' },
  { pattern: /\becofuel\b/i, fuel: 'gpl', confidence: 'medium' },

  // Metano/CNG - high confidence
  { pattern: /\b(cng|metano|natural\s*gas|gnc|ecofuel)\b/i, fuel: 'metano', confidence: 'high' },
  { pattern: /\btgi\b/i, fuel: 'metano', confidence: 'high' },  // VW TGI
  { pattern: /\bg-tec\b/i, fuel: 'metano', confidence: 'high' },  // Audi G-Tec
];

/**
 * Detects fuel type from a variant/version name
 * @param variantName - The variant or version name (e.g., "Golf GTI", "Panda Hybrid")
 * @returns Detection result with fuel type, confidence level, and matched keyword
 */
export function detectFuelFromVariant(variantName: string): FuelDetectionResult {
  if (!variantName) {
    return { detectedFuel: null, confidence: 'low', matchedKeyword: null };
  }

  const normalizedName = variantName.toLowerCase().trim();

  for (const { pattern, fuel, confidence } of FUEL_KEYWORDS) {
    const match = normalizedName.match(pattern);
    if (match) {
      return {
        detectedFuel: fuel,
        confidence,
        matchedKeyword: match[0].toUpperCase(),
      };
    }
  }

  return { detectedFuel: null, confidence: 'low', matchedKeyword: null };
}

/**
 * Checks if the detected fuel is valid for the given model's available fuels
 * @param detectedFuel - The detected fuel type
 * @param availableFuels - List of available fuels for the model
 * @returns True if the detected fuel is in the available fuels list
 */
export function isDetectedFuelValid(
  detectedFuel: FuelType | null,
  availableFuels: FuelType[]
): boolean {
  if (!detectedFuel) return false;
  return availableFuels.includes(detectedFuel);
}
