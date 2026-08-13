import { isNative } from './native';

type Point = { lat: number; lng: number; ts: number };
type Listener = (p: Point) => void;

let watcherId: string | null = null;
let webWatchId: number | null = null;

/**
 * Start streaming the rider's GPS position even when the screen is off /
 * the app is backgrounded.
 *
 * Native: uses @capacitor-community/background-geolocation, which keeps a
 *   foreground service alive on Android and a significant-changes watcher
 *   on iOS.
 * Web:    falls back to navigator.geolocation.watchPosition (suspends when
 *   the tab is backgrounded — that's a browser limit, not ours).
 */
export async function startBackgroundTracking(onPoint: Listener): Promise<boolean> {
  if (isNative()) {
    try {
      const mod: any = await import('@capacitor-community/background-geolocation');
      const BackgroundGeolocation = mod.BackgroundGeolocation || mod.default;
      watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage:
            'Loca8tor is sharing your location with your business while you deliver.',
          backgroundTitle: 'Rider tracking active',
          requestPermissions: true,
          stale: false,
          distanceFilter: 25,
        },
        (location, error) => {
          if (error || !location) return;
          onPoint({
            lat: location.latitude,
            lng: location.longitude,
            ts: Date.now(),
          });
        },
      );
      return true;
    } catch (e) {
      console.warn('Background GPS unavailable, falling back to web watch', e);
    }
  }

  if (!('geolocation' in navigator)) return false;
  webWatchId = navigator.geolocation.watchPosition(
    (pos) =>
      onPoint({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        ts: pos.timestamp,
      }),
    () => {},
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
  );
  return true;
}

export async function stopBackgroundTracking(): Promise<void> {
  if (watcherId) {
    try {
      const mod: any = await import('@capacitor-community/background-geolocation');
      const BackgroundGeolocation = mod.BackgroundGeolocation || mod.default;
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
    } catch {
      // ignore
    }
    watcherId = null;
  }
  if (webWatchId !== null) {
    navigator.geolocation.clearWatch(webWatchId);
    webWatchId = null;
  }
}