import { describe, it, expect } from 'vitest';
import { distanceToPolylineM, bearingDeg } from './routeGeometry';

describe('distanceToPolylineM', () => {
  it('is ~0 for a point on the polyline', () => {
    const line: [number, number][] = [[6.45, 3.39], [6.46, 3.40]];
    expect(distanceToPolylineM({ lat: 6.45, lng: 3.39 }, line)).toBeLessThan(1);
  });

  it('is ~0 for a point on a segment midpoint', () => {
    const line: [number, number][] = [[6.45, 3.39], [6.46, 3.39]];
    expect(distanceToPolylineM({ lat: 6.455, lng: 3.39 }, line)).toBeLessThan(1);
  });

  it('measures perpendicular distance off a straight segment', () => {
    // ~0.001 deg lat ≈ 111m; point offset purely in longitude at the equator-ish latitude
    const line: [number, number][] = [[0, 0], [0, 1]];
    const d = distanceToPolylineM({ lat: 0.001, lng: 0.5 }, line);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });

  it('picks the nearest of multiple segments', () => {
    const line: [number, number][] = [[0, 0], [0, 1], [1, 1]];
    // Closest to the second segment (0,1)-(1,1), not the first
    const d = distanceToPolylineM({ lat: 0.5, lng: 1.001 }, line);
    expect(d).toBeLessThan(200);
  });

  it('returns Infinity for an empty polyline', () => {
    expect(distanceToPolylineM({ lat: 0, lng: 0 }, [])).toBe(Infinity);
  });

  it('falls back to point distance for a single-point polyline', () => {
    const d = distanceToPolylineM({ lat: 0, lng: 0 }, [[0, 0.001]]);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(150);
  });
});

describe('bearingDeg', () => {
  it('is ~0 (north) for due-north travel', () => {
    const b = bearingDeg({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(b).toBeLessThan(1);
  });

  it('is ~90 (east) for due-east travel', () => {
    const b = bearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(b).toBeGreaterThan(89);
    expect(b).toBeLessThan(91);
  });

  it('is ~180 (south) for due-south travel', () => {
    const b = bearingDeg({ lat: 1, lng: 0 }, { lat: 0, lng: 0 });
    expect(b).toBeGreaterThan(179);
    expect(b).toBeLessThan(181);
  });

  it('is ~270 (west) for due-west travel', () => {
    const b = bearingDeg({ lat: 0, lng: 1 }, { lat: 0, lng: 0 });
    expect(b).toBeGreaterThan(269);
    expect(b).toBeLessThan(271);
  });

  it('is always in [0, 360)', () => {
    const b = bearingDeg({ lat: 6.45, lng: 3.39 }, { lat: 6.44, lng: 3.38 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});
