import { useState, useEffect, useRef } from 'react';
import { haversineKm } from '@/lib/vehicleSpeed';
import { distanceToPolylineM } from '@/lib/routeGeometry';

export interface RouteStep {
  /** Human-readable instruction, e.g. "Turn left onto Ikorodu Road". */
  instruction: string;
  distanceM: number;
  durationS: number;
  maneuverType: string;
  maneuverModifier?: string;
  /** [lat, lng] of the maneuver point. */
  location: [number, number];
  streetName?: string;
}

export interface RouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  /** True when both routing services failed and this is a straight-line fallback. */
  isFallback?: boolean;
  /** Turn-by-turn steps. Empty on a straight-line fallback route. */
  steps: RouteStep[];
}

const TURN_TEXT: Record<string, string> = {
  uturn: 'Make a U-turn',
  'sharp right': 'Turn sharp right',
  right: 'Turn right',
  'slight right': 'Turn slightly right',
  straight: 'Continue straight',
  'slight left': 'Turn slightly left',
  left: 'Turn left',
  'sharp left': 'Turn sharp left',
};

function describeStep(step: any): string {
  const maneuver = step.maneuver || {};
  const type = maneuver.type as string;
  const modifier = maneuver.modifier as string | undefined;
  const name = step.name as string | undefined;
  const onward = name ? ` onto ${name}` : '';

  switch (type) {
    case 'depart':
      return `Head out${onward}`;
    case 'arrive':
      return modifier ? `Arrive at your destination, on the ${modifier}` : 'Arrive at your destination';
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn': {
      const exit = maneuver.exit ? ` and take exit ${maneuver.exit}` : '';
      return `Enter the roundabout${exit}`;
    }
    case 'merge':
      return `Merge${onward}`;
    case 'on ramp':
      return `Take the ramp${onward}`;
    case 'off ramp':
      return `Take the exit${onward}`;
    case 'fork':
      return modifier ? `Keep ${modifier}${onward}` : `Continue${onward}`;
    case 'end of road':
      return modifier ? `${TURN_TEXT[modifier] || 'Turn'} at the end of the road${onward}` : `Continue${onward}`;
    case 'new name':
      return `Continue${onward}`;
    case 'turn':
    default:
      return `${(modifier && TURN_TEXT[modifier]) || 'Continue'}${onward}`;
  }
}

// How far (meters) the rider needs to drift from the current route before
// it's treated as invalid and a fresh one is fetched.
const OFF_ROUTE_REROUTE_M = 60;
// Even while perfectly on-route, refresh periodically so ETA/remaining
// steps don't go stale over a long trip — but only after real progress,
// not on every ~10-20m of GPS movement. The existing route is still valid
// at that scale, so refetching that often would just hammer the free
// public routing servers for no benefit.
const PROGRESS_REROUTE_M = 250;

export function useRoute(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number } | null
) {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const currentRouteRef = useRef<RouteResult | null>(null);
  const lastFetchPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastDestKeyRef = useRef('');

  useEffect(() => {
    if (!from || !to) {
      setRoute(null);
      currentRouteRef.current = null;
      lastFetchPosRef.current = null;
      lastDestKeyRef.current = '';
      return;
    }

    const destKey = `${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
    const destChanged = destKey !== lastDestKeyRef.current;
    const current = currentRouteRef.current;

    const offRoute = !destChanged && current && !current.isFallback && current.coordinates.length > 1
      ? distanceToPolylineM(from, current.coordinates) > OFF_ROUTE_REROUTE_M
      : false;

    const movedFarEnough = !lastFetchPosRef.current
      || haversineKm(from, lastFetchPosRef.current) * 1000 > PROGRESS_REROUTE_M;

    // Refetch only when it's actually needed: no route yet, the
    // destination changed, the rider has drifted off the current route, or
    // enough real progress has been made that a refresh is worthwhile.
    if (current && !destChanged && !offRoute && !movedFarEnough) return;

    lastDestKeyRef.current = destKey;
    lastFetchPosRef.current = from;

    const fetchRoute = async () => {
      setLoading(true);
      const endpoints = [
        `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`,
      ];
      let ok = false;
      for (const url of endpoints) {
        try {
          // Public routing demo servers can hang instead of failing outright
          // on some networks — bound each attempt so we reach the straight-line
          // fallback quickly rather than leaving the caller waiting indefinitely.
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) continue;
          const data = await res.json();
          if (data.routes?.[0]) {
            const r = data.routes[0];
            const steps: RouteStep[] = (r.legs || []).flatMap((leg: any) =>
              (leg.steps || []).map((s: any): RouteStep => ({
                instruction: describeStep(s),
                distanceM: s.distance,
                durationS: s.duration,
                maneuverType: s.maneuver?.type,
                maneuverModifier: s.maneuver?.modifier,
                location: [s.maneuver.location[1], s.maneuver.location[0]],
                streetName: s.name || undefined,
              }))
            );
            const result: RouteResult = {
              coordinates: r.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
              distanceKm: Math.round(r.distance / 100) / 10,
              durationMin: Math.round(r.duration / 60),
              steps,
            };
            currentRouteRef.current = result;
            setRoute(result);
            ok = true;
            break;
          }
        } catch { /* try next endpoint */ }
      }
      if (!ok) {
        // Final fallback: straight line so the map still renders something,
        // with real (if approximate) straight-line distance rather than 0.
        const fallback: RouteResult = {
          coordinates: [[from.lat, from.lng], [to.lat, to.lng]],
          distanceKm: haversineKm(from, to),
          durationMin: 0,
          isFallback: true,
          steps: [],
        };
        currentRouteRef.current = fallback;
        setRoute(fallback);
      }
      setLoading(false);
    };
    fetchRoute();
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  return { route, loading };
}
