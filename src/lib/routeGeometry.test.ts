import { describe, it, expect } from 'vitest';
import { distanceToPolylineM } from './routeGeometry';

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
