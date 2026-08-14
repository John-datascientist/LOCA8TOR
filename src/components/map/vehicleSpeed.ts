// Average real-world speeds used to estimate ETA from distance, since the
// free routing service only has a car ("driving") profile — its raw duration
// assumes car speeds, which rounds down to "0 min" on short bike trips and
// generally under/overestimates for other vehicle types. Distance from the
// route is still trustworthy (roads are roads); duration is recomputed here
// per vehicle instead.
const VEHICLE_SPEED_KMH: Record<string, number> = {
  bike: 15,   // bicycle
  car: 28,    // displays as Motorcycle
  bus: 22,    // displays as Van
  truck: 18,
};

export function estimateEtaMin(distanceKm: number, vehicleType: string | null | undefined): number {
  const speed = VEHICLE_SPEED_KMH[vehicleType || 'bike'] || VEHICLE_SPEED_KMH.bike;
  if (!distanceKm || distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}

// Straight-line (haversine) distance in km — used when the routing service
// is unreachable, so we still show a real (if approximate) distance/ETA
// instead of "0 km / 0 min".
export function haversineKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
