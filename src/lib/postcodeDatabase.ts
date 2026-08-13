import { supabase } from '@/integrations/supabase/client';
import { normalizeNigerianPostcodeDistrict, type PostcodeResult } from './postcodeGenerator';

export interface RiderLocationResult {
  rider_name: string;
  last_lat: number;
  last_lng: number;
  last_postcode: string;
  last_seen: string;
}

export async function searchRidersByPostcode(postcode: string): Promise<RiderLocationResult[]> {
  const { data } = await supabase
    .from('business_riders')
    .select('rider_name, last_lat, last_lng, last_postcode, last_seen')
    .ilike('last_postcode', `%${postcode}%`)
    .not('last_lat', 'is', null)
    .not('last_postcode', 'is', null)
    .limit(10);
  return (data || []).filter(r => r.last_lat && r.last_lng && r.last_postcode) as RiderLocationResult[];
}
import { getUserIp } from './ipAddress';

export async function addPostcodeToDB(item: PostcodeResult) {
  const ip = await getUserIp();
  // RLS requires non-empty postcode + state. Provide safe fallbacks so generations are never lost.
  const postcode = normalizeNigerianPostcodeDistrict((item.postcode || '').trim());
  const state = (item.state || item.country || 'Unknown').trim() || 'Unknown';
  if (!postcode || postcode === '...') {
    console.warn('Skipping postcode log: empty postcode', item);
    return;
  }
  const { error } = await supabase
    .from('postcodes')
    .insert({
      postcode,
      address: item.address || null,
      state,
      country: item.country || null,
      lga: item.lga || null,
      lat: item.lat,
      lng: item.lng,
      ip_address: ip,
    } as any);
  if (!error) {
    await supabase.rpc('increment_platform_stat', { key: 'total_postcodes', amount: 1 });
  } else {
    console.error('Failed to log postcode:', error, item);
  }
}

// Search Nominatim for real postcodes (UK, USA, Canada, etc.)
async function searchExternalPostcodes(query: string): Promise<PostcodeResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`
    );
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((item: any) => item.address?.postcode)
      .map((item: any) => {
        const addr = item.address || {};
        const state = addr.state || addr.county || '';
        const country = addr.country || '';
        const road = addr.road || '';
        const area = addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || '';
        const parts = [road, area, state].filter(Boolean);

        return {
          postcode: addr.postcode,
          state: state,
          areaCode: addr.postcode.split(' ')[0] || addr.postcode.slice(0, 2),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          address: parts.join(', ') || item.display_name?.split(',').slice(0, 3).join(',') || '',
          country,
          isGenerated: false,
        } as PostcodeResult;
      });
  } catch {
    return [];
  }
}

export async function searchPostcodes(query: string): Promise<PostcodeResult[]> {
  const q = query.trim();

  const mapRowToResult = (row: {
    postcode: string;
    state: string;
    address: string | null;
    country: string | null;
    lga: string | null;
    lat: number;
    lng: number;
  }): PostcodeResult => ({
    postcode: normalizeNigerianPostcodeDistrict(row.postcode),
    state: row.state,
    areaCode: normalizeNigerianPostcodeDistrict(row.postcode).substring(0, 2),
    address: row.address || undefined,
    country: row.country || undefined,
    lga: row.lga || undefined,
    lat: row.lat,
    lng: row.lng,
  });

  const postcodeLabelMatch = q.match(/postcode:\s*([^\n\r]+)/i);
  const extractedPostcode = normalizeNigerianPostcodeDistrict(
    (postcodeLabelMatch?.[1]?.trim() || q.match(/\b[A-Z]{1,3}\d[A-Z0-9]?\s\d[A-Z]{2}\b/i)?.[0] || '').toUpperCase()
  );

  const googleMapsCoordMatch = q.match(/maps\?q=([-\d.]+),([-\d.]+)/i);
  const genericCoordMatch = q.match(/([-\d.]+)\s*°?\s*[nNsS]?\s*[,]\s*([-\d.]+)\s*°?\s*[eEwW]?/);
  const coordMatch = googleMapsCoordMatch || genericCoordMatch;

  if (extractedPostcode) {
    const { data: exactPostcodeRows } = await supabase
      .from('postcodes')
      .select('id, postcode, address, state, country, lga, lat, lng, created_at')
      .ilike('postcode', extractedPostcode)
      .order('created_at', { ascending: true })
      .limit(1);

    if (exactPostcodeRows && exactPostcodeRows.length > 0) {
      return exactPostcodeRows.map(mapRowToResult);
    }
  }

  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);

    const { data: exactCoordRows } = await supabase
      .from('postcodes')
      .select('id, postcode, address, state, country, lga, lat, lng, created_at')
      .eq('lat', lat)
      .eq('lng', lng)
      .order('created_at', { ascending: true })
      .limit(1);

    if (exactCoordRows && exactCoordRows.length > 0) {
      return exactCoordRows.map(mapRowToResult);
    }

    const tolerance = 0.00005;
    const { data: nearbyRows } = await supabase
      .from('postcodes')
      .select('id, postcode, address, state, country, lga, lat, lng, created_at')
      .gte('lat', lat - tolerance)
      .lte('lat', lat + tolerance)
      .gte('lng', lng - tolerance)
      .lte('lng', lng + tolerance)
      .order('created_at', { ascending: true })
      .limit(20);

    if (nearbyRows && nearbyRows.length > 0) {
      const closestRow = nearbyRows.reduce((best, row) => {
        const bestDistance = Math.abs(best.lat - lat) + Math.abs(best.lng - lng);
        const rowDistance = Math.abs(row.lat - lat) + Math.abs(row.lng - lng);
        return rowDistance < bestDistance ? row : best;
      });

      return [mapRowToResult(closestRow)];
    }
  }

  let dbQuery = supabase
    .from('postcodes')
    .select('id, postcode, address, state, country, lga, lat, lng, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (q) {
    dbQuery = dbQuery.or(
      `postcode.ilike.%${q}%,address.ilike.%${q}%,state.ilike.%${q}%,lga.ilike.%${q}%,country.ilike.%${q}%`
    );
  }

  const { data, error } = await dbQuery;
  const dbResults: PostcodeResult[] = error || !data ? [] : data.map(mapRowToResult);

  // Admin-saved landmarks — search by company/place name, address or postcode.
  let landmarkResults: PostcodeResult[] = [];
  if (q && !coordMatch) {
    const { data: landmarks } = await supabase
      .from('admin_landmarks' as any)
      .select('name,address,postcode,state,country,lga,lat,lng')
      .or(`name.ilike.%${q}%,address.ilike.%${q}%,postcode.ilike.%${q}%`)
      .limit(10);
    if (landmarks) {
      landmarkResults = (landmarks as any[]).map((l) => ({
        postcode: normalizeNigerianPostcodeDistrict(l.postcode),
        state: l.state || '',
        areaCode: normalizeNigerianPostcodeDistrict(l.postcode || '').substring(0, 2),
        address: `${l.name} — ${l.address}`,
        country: l.country || undefined,
        lga: l.lga || undefined,
        lat: Number(l.lat),
        lng: Number(l.lng),
      }));
    }
  }

  let externalResults: PostcodeResult[] = [];
  if (q && !coordMatch) {
    externalResults = await searchExternalPostcodes(q);
  }

  // Landmarks first so a "Shoprite" search surfaces the saved landmark before
  // generic postcode matches.
  const merged: PostcodeResult[] = [];
  const seen = new Set<string>();
  for (const l of landmarkResults) {
    if (!seen.has(l.postcode)) { seen.add(l.postcode); merged.push(l); }
  }
  for (const r of dbResults) {
    if (!seen.has(r.postcode)) { seen.add(r.postcode); merged.push(r); }
  }
  for (const ext of externalResults) {
    if (!seen.has(ext.postcode)) {
      seen.add(ext.postcode);
      merged.push(ext);
    }
  }

  return merged;
}
