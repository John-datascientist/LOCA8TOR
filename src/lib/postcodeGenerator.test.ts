import { describe, it, expect } from 'vitest';
import {
  detectCountry,
  generatePostcode,
  normalizeNigerianPostcodeDistrict,
  generateCodeFromArea,
  getStatesNG,
} from './postcodeGenerator';

// These test the real exported functions from postcodeGenerator.ts (not a
// reimplemented copy) — a previous version of this file tested a drifted
// duplicate of the algorithm and didn't catch real instability bugs.

describe('detectCountry', () => {
  it('classifies known coordinates correctly', () => {
    expect(detectCountry(6.5244, 3.3792)).toBe('NG'); // Lagos
    expect(detectCountry(51.5072, -0.1276)).toBe('UK'); // London
    expect(detectCountry(40.7128, -74.006)).toBe('US'); // New York
    expect(detectCountry(43.6532, -79.3832)).toBe('CA'); // Toronto
    expect(detectCountry(0, 0)).toBe('WORLD'); // null island
  });
});

describe('generatePostcode (Nigeria, sync grid-only)', () => {
  it('is deterministic: same coordinates always produce the same postcode', () => {
    const a = generatePostcode(6.5244, 3.3792);
    const b = generatePostcode(6.5244, 3.3792);
    expect(a.postcode).toBe(b.postcode);
  });

  it('absorbs small GPS jitter within the same ~100m block', () => {
    const a = generatePostcode(6.5244, 3.3792);
    const b = generatePostcode(6.52441, 3.37922); // a few metres away
    expect(a.postcode).toBe(b.postcode);
  });

  it('starts with the matched state area code', () => {
    const lagos = generatePostcode(6.5244, 3.3792);
    expect(lagos.areaCode).toBe('LA');
    expect(lagos.postcode.startsWith('LA')).toBe(true);
  });

  it('matches the XX## #XX postcode format', () => {
    const result = generatePostcode(6.5244, 3.3792);
    expect(result.postcode).toMatch(/^[A-Z]{2}\d{2} \d[A-Z]{2}$/);
  });

  it('flags the result as generated, not a real postal code', () => {
    const result = generatePostcode(6.5244, 3.3792);
    expect(result.isGenerated).toBe(true);
  });
});

describe('generatePostcode (non-Nigeria)', () => {
  // UK/US/CA have real postal systems — this sync/offline path must never
  // fabricate a fake postcode for them. Real ones only come from
  // generatePostcodeWithAddress's reverse-geocoding lookup.
  it('does not fabricate a postcode for UK/US/CA — returns a placeholder', () => {
    const uk = generatePostcode(51.5072, -0.1276);
    expect(uk.postcode).toBe('...');
    expect(uk.countryCode).toBe('UK');

    const us = generatePostcode(40.7128, -74.006);
    expect(us.postcode).toBe('...');
    expect(us.countryCode).toBe('US');

    const ca = generatePostcode(43.6532, -79.3832);
    expect(ca.postcode).toBe('...');
    expect(ca.countryCode).toBe('CA');
  });
});

describe('normalizeNigerianPostcodeDistrict', () => {
  it('rewrites a zero district to 01 for known state prefixes', () => {
    expect(normalizeNigerianPostcodeDistrict('LA00 5BC')).toBe('LA01 5BC');
  });

  it('leaves an already-valid postcode unchanged (aside from case/whitespace)', () => {
    expect(normalizeNigerianPostcodeDistrict('la12 3bc')).toBe('LA12 3BC');
  });

  it('leaves non-Nigerian-looking postcodes untouched apart from trim/case', () => {
    expect(normalizeNigerianPostcodeDistrict('sw1a 1aa')).toBe('SW1A 1AA');
  });
});

describe('generateCodeFromArea', () => {
  it('same state + area always produces the same code', () => {
    const a = generateCodeFromArea('Edo', 'Sapele Road');
    const b = generateCodeFromArea('Edo', 'Sapele Road');
    expect(a).toBe(b);
  });

  it('is case/whitespace-insensitive', () => {
    const a = generateCodeFromArea('Edo', 'Sapele Road');
    const b = generateCodeFromArea('Edo', '  sapele   road  ');
    expect(a).toBe(b);
  });

  it('different areas in the same state usually produce different codes', () => {
    const a = generateCodeFromArea('Edo', 'Sapele Road');
    const b = generateCodeFromArea('Edo', 'Airport Road');
    expect(a).not.toBe(b);
  });

  it('the same area name in different states produces different codes', () => {
    const a = generateCodeFromArea('Edo', 'Airport Road');
    const b = generateCodeFromArea('Lagos', 'Airport Road');
    expect(a).not.toBe(b);
  });
});

describe('getStatesNG', () => {
  it('returns all 36 states plus FCT, each with coordinates', () => {
    const states = getStatesNG();
    expect(states.length).toBe(37);
    for (const s of states) {
      expect(typeof s.lat).toBe('number');
      expect(typeof s.lng).toBe('number');
      expect(s.a).toMatch(/^[A-Z]{2}$/);
    }
  });
});
