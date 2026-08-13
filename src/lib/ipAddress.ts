import { supabase } from '@/integrations/supabase/client';

let cachedIp: string | null = null;

export async function getUserIp(): Promise<string> {
  if (cachedIp) return cachedIp;

  try {
    const { data, error } = await supabase.functions.invoke('get-ip');
    if (!error && data?.ip) {
      cachedIp = data.ip;
      return data.ip;
    }
  } catch {}

  // Fallback: try external service
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const json = await res.json();
    if (json.ip) {
      cachedIp = json.ip;
      return json.ip;
    }
  } catch {}

  return 'unknown';
}
