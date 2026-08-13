import { supabase } from '@/integrations/supabase/client';

/** Haversine distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Pick the nearest active rider with a recent GPS fix to a pickup point. */
export async function findNearestRider(
  businessId: string,
  pickup: { lat: number; lng: number },
  radiusKm: number,
) {
  const { data: riders } = await supabase.from('business_riders')
    .select('id, rider_name, last_lat, last_lng, last_seen, status')
    .eq('business_user_id', businessId)
    .eq('status', 'active')
    .not('last_lat', 'is', null);
  if (!riders?.length) return null;
  // Only riders seen in the last 15 minutes
  const cutoff = Date.now() - 15 * 60 * 1000;
  const candidates = riders.filter(r => r.last_seen && new Date(r.last_seen).getTime() > cutoff);
  let best: any = null; let bestD = Infinity;
  for (const r of candidates) {
    const d = distanceKm(pickup, { lat: r.last_lat!, lng: r.last_lng! });
    if (d <= radiusKm && d < bestD) { best = r; bestD = d; }
  }
  return best ? { ...best, distanceKm: bestD } : null;
}

/** Auto-assigns a pending delivery if business has it enabled. Returns assigned rider id or null. */
export async function tryAutoAssign(deliveryId: string) {
  const { data: del } = await supabase.from('delivery_trackings')
    .select('id, business_user_id, business_rider_id, status, pickup_lat, pickup_lng, customer_name')
    .eq('id', deliveryId).maybeSingle();
  if (!del || del.status !== 'pending' || del.business_rider_id) return null;
  if (del.pickup_lat == null || del.pickup_lng == null) return null;

  const { data: biz } = await supabase.from('riders')
    .select('auto_assign_enabled, auto_assign_radius_km')
    .eq('id', del.business_user_id).maybeSingle();
  if (!biz?.auto_assign_enabled) return null;

  const nearest = await findNearestRider(del.business_user_id, { lat: del.pickup_lat, lng: del.pickup_lng }, biz.auto_assign_radius_km || 10);
  if (!nearest) return null;

  await supabase.from('delivery_trackings')
    .update({ business_rider_id: nearest.id, rider_name: nearest.rider_name, status: 'assigned' })
    .eq('id', deliveryId);
  return nearest.id as string;
}