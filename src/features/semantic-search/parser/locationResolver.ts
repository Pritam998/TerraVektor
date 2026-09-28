/**
 * Location resolver - extracts and normalizes geographic locations
 */

import {
  LOCATION_ALIASES,
  AOI_PRESETS,
  LOCATION_PREFIXES
} from './vocabulary';

export interface LocationResult {
  location: string | null;
  aoi: [number, number, number, number] | null;
  confidence: number;
}

export function resolveLocation(query: string): LocationResult {
  const lowerQuery = query.toLowerCase().trim();

  // Remove location prefixes to isolate the location name
  let searchQuery = lowerQuery;
  for (const prefix of LOCATION_PREFIXES) {
    const prefixPattern = new RegExp(`\\b${prefix}\\s+`, 'i');
    searchQuery = searchQuery.replace(prefixPattern, '');
  }

  // Try to match location aliases
  for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
    // Check for exact word match (not substring)
    const pattern = new RegExp(`\\b${alias}\\b`, 'i');
    if (pattern.test(lowerQuery)) {
      const aoi = AOI_PRESETS[canonical];
      if (aoi) {
        return {
          location: canonical.charAt(0).toUpperCase() + canonical.slice(1),
          aoi,
          confidence: 1.0
        };
      }
    }
  }

  // Try to match location with variations (e.g., "Pune region", "Pune area")
  for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
    const patterns = [
      new RegExp(`\\b${alias}\\s+region\\b`, 'i'),
      new RegExp(`\\b${alias}\\s+area\\b`, 'i'),
      new RegExp(`\\b${alias}\\s+city\\b`, 'i'),
      new RegExp(`\\b${alias}\\s+zone\\b`, 'i')
    ];

    for (const pattern of patterns) {
      if (pattern.test(lowerQuery)) {
        const aoi = AOI_PRESETS[canonical];
        if (aoi) {
          return {
            location: canonical.charAt(0).toUpperCase() + canonical.slice(1),
            aoi,
            confidence: 0.9
          };
        }
      }
    }
  }

  return {
    location: null,
    aoi: null,
    confidence: 0.0
  };
}

export function getSupportedLocations(): string[] {
  return Object.keys(AOI_PRESETS).map(
    loc => loc.charAt(0).toUpperCase() + loc.slice(1)
  );
}
