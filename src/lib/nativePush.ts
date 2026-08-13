import { isNative } from './native';
import { supabase } from '@/integrations/supabase/client';

/**
 * Register the device for native push notifications and persist the token
 * against the rider's record so backend functions can target it later via
 * FCM (Android) / APNs (iOS).
 *
 * Web is a no-op — the browser Notifications API is handled separately in
 * useRiderNotifications.
 */
export async function registerPushNotifications(riderId?: string): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return null;

    return new Promise<string | null>((resolve) => {
      const sub = PushNotifications.addListener('registration', async (token) => {
        sub.then((s) => s.remove());
        if (riderId) {
          // Stored on the rider row so edge functions can deliver targeted pushes.
          await supabase
            .from('riders')
            .update({ push_token: token.value } as never)
            .eq('id', riderId);
        }
        resolve(token.value);
      });
      PushNotifications.addListener('registrationError', () => resolve(null));
      PushNotifications.register();
    });
  } catch (e) {
    console.warn('Push registration failed', e);
    return null;
  }
}

export async function attachPushHandlers(
  onReceive?: (title: string, body: string) => void,
) {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    PushNotifications.addListener('pushNotificationReceived', (n) => {
      onReceive?.(n.title || 'Notification', n.body || '');
    });
  } catch {
    // ignore
  }
}