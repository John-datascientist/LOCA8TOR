import { useState, useEffect, useRef } from 'react';

interface RouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
}

export function useRoute(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number } | null
) {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const lastKey = useRef('');

  useEffect(() => {
    if (!from || !to) { setRoute(null); return; }
    
    // Only re-fetch if points changed significantly (>50m)
    const key = `${from.lat.toFixed(4)},${from.lng.toFixed(4)}-${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    const fetchRoute = async () => {
      setLoading(true);
      const endpoints = [
        `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
      ];
      let ok = false;
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          if (data.routes?.[0]) {
            const r = data.routes[0];
            setRoute({
              coordinates: r.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
              distanceKm: Math.round(r.distance / 100) / 10,
              durationMin: Math.round(r.duration / 60),
            });
            ok = true;
            break;
          }
        } catch { /* try next endpoint */ }
      }
      if (!ok) {
        // Final fallback: straight line so the map still renders something.
        setRoute({
          coordinates: [[from.lat, from.lng], [to.lat, to.lng]],
          distanceKm: 0,
          durationMin: 0,
        });
      }
      setLoading(false);
    };
    fetchRoute();
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  return { route, loading };
}
