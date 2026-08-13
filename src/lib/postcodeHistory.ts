import { supabase } from '@/integrations/supabase/client';
import type { PostcodeResult } from '@/lib/postcodeGenerator';

export type HistorySource = 'generate' | 'search';

export interface PostcodeHistoryEntry extends PostcodeResult {
  id: string;
  source: HistorySource;
  created_at: string;
}

/**
 * Persist a postcode lookup to the signed-in user's cross-device history.
 * Silently no-ops when the user is not signed in (local history continues
 * to work as before via localStorage in the page component).
 */
export async function savePostcodeHistory(
  item: PostcodeResult,
  source: HistorySource = 'generate',
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Upsert by (user_id, postcode) — refresh created_at on repeat lookups so
    // the same place naturally floats to the top of the list.
    await supabase.from('postcode_history').upsert(
      {
        user_id: user.id,
        postcode: item.postcode,
        lat: item.lat,
        lng: item.lng,
        address: item.address ?? null,
        state: item.state ?? null,
        country: item.country ?? null,
        lga: item.lga ?? null,
        source,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,postcode' },
    );
  } catch (err) {
    console.warn('savePostcodeHistory failed', err);
  }
}

export async function fetchPostcodeHistory(): Promise<PostcodeHistoryEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('postcode_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.warn('fetchPostcodeHistory failed', error);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    postcode: r.postcode,
    lat: r.lat,
    lng: r.lng,
    address: r.address ?? undefined,
    state: r.state ?? '',
    country: r.country ?? undefined,
    lga: r.lga ?? undefined,
    areaCode: '',
    source: r.source as HistorySource,
    created_at: r.created_at,
  }));
}

export async function deletePostcodeHistoryEntry(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('postcode_history').delete().eq('id', id).eq('user_id', user.id);
}

export async function clearPostcodeHistory(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('postcode_history').delete().eq('user_id', user.id);
}
