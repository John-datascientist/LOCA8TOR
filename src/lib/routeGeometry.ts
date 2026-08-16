interface LatLng {
  lat: number;
  lng: number;
}

// Meter-precision haversine distance — vehicleSpeed.ts's haversineKm rounds
// to 0.1km, too coarse for off-route detection at street scale.
function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Distance in meters from `point` to the closest point on segment a-b, via a
// local equirectangular (flat-earth) projection — accurate enough at the
// segment scale this is used for (tens to low hundreds of meters) and far
// cheaper than exact great-circle point-to-arc math.
function distanceToSegmentM(point: LatLng, a: LatLng, b: LatLng): number {
  const kx = Math.cos(point.lat * Math.PI / 180); // longitude scale factor at this latitude
  const toXY = (p: LatLng) => ({ x: p.lng * kx, y: p.lat });
  const P = toXY(point), A = toXY(a), B = toXY(b);

  const dx = B.x - A.x, dy = B.y - A.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((P.x - A.x) * dx + (P.y - A.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closest: LatLng = { lat: A.y + t * dy, lng: (A.x + t * dx) / kx };
  return haversineM(point, closest);
}

/**
 * Shortest distance in meters from `point` to any segment of `polyline` (an
 * array of [lat, lng] pairs). Used to detect when a rider has drifted off
 * the planned route.
 */
export function distanceToPolylineM(point: LatLng, polyline: [number, number][]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    return haversineM(point, { lat: polyline[0][0], lng: polyline[0][1] });
  }
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = { lat: polyline[i][0], lng: polyline[i][1] };
    const b = { lat: polyline[i + 1][0], lng: polyline[i + 1][1] };
    const d = distanceToSegmentM(point, a, b);
    if (d < min) min = d;
  }
  return min;
}
