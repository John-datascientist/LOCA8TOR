// The UK postcode bug: every cache (session map, IndexedDB, and the shared
// coordinate_postcode_cache table) rounded coordinates to 3dp — a ~110 m x
// ~70 m cell. Nigeria mints one postcode per ~100 m block so that bucket is
// correct there, but the UK returns REAL postcodes and a UK postcode unit is
// often one side of one street. Distinct units inside the same cell collapsed
// onto whichever was looked up first, and since the DB cache is shared, that
// answer was then served to every other user in the cell.
import { describe, it, expect } from 'vitest';
import { roundToCacheGrid } from './offlinePostcodeCache';

function key(country: string, p: { lat: number; lng: number }) {
  return `${country}|${roundToCacheGrid(country, p.lat)}|${roundToCacheGrid(country, p.lng)}`;
}

/** Old behaviour, kept so the regression test can show what changed. */
function oldKey(p: { lat: number; lng: number }) {
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return `${r(p.lat)}|${r(p.lng)}`;
}

function metresApart(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Two points in central London that sat inside the SAME old 3dp cell. At this
// separation they are routinely different postcode units.
const UK_A = { lat: 51.5028, lng: -0.127 };
const UK_B = { lat: 51.5033, lng: -0.1269 };

describe('coordinate cache grid', () => {
  it('the two UK fixtures really are ~50m apart', () => {
    const d = metresApart(UK_A, UK_B);
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(70);
  });

  it('regression: the old 3dp grid merged them into one cache cell', () => {
    expect(oldKey(UK_A)).toEqual(oldKey(UK_B));
  });

  it('now keeps them in separate cache cells', () => {
    expect(key('GB', UK_A)).not.toEqual(key('GB', UK_B));
  });

  it('still reuses one cell for GPS jitter at a standing position', () => {
    // A stationary phone drifts a couple of metres; that must not force a new
    // lookup, or every glance at the screen would hit Nominatim again.
    const base = { lat: 51.5035, lng: -0.127 };
    const jittered = { lat: 51.50352, lng: -0.12698 };
    expect(metresApart(base, jittered)).toBeLessThan(5);
    expect(key('GB', base)).toEqual(key('GB', jittered));
  });

  it('leaves Nigeria on its original ~110m grid', () => {
    // NG must keep bucketing coarsely: we generate one postcode per ~100m
    // BLOCK there, so a finer grid would mint duplicates for the same block.
    const a = { lat: 6.60126, lng: 3.35149 };
    const b = { lat: 6.60134, lng: 3.35143 };
    expect(metresApart(a, b)).toBeLessThan(20);
    expect(key('NG', a)).toEqual(key('NG', b));
    expect(roundToCacheGrid('NG', 6.60126)).toEqual(6.601);
  });

  it('rounds non-NG countries to 4dp', () => {
    expect(roundToCacheGrid('GB', 51.503541)).toEqual(51.5035);
    expect(roundToCacheGrid('US', -0.127683)).toEqual(-0.1277);
  });
});
