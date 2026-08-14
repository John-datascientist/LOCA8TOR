import { isNative } from './native';

type Point = { lat: number; lng: number };

/**
 * Foreground GPS watch that works both on the web (navigator.geolocation)
 * and inside the installed Capacitor app. Inside the native app the raw web
 * geolocation API is unreliable — on some devices it never triggers the OS
 * permission prompt and neither the success nor the error callback ever
 * fires, leaving callers stuck waiting forever. The @capacitor/geolocation
 * plugin talks to the real OS location API instead.
 *
 * Returns a stop() function to clean up (mirrors clearWatch).
 */
export async function watchLivePosition(
  onPoint: (p: Point) => void,
  onError: () => void,
): Promise<() => void> {
  if (isNative()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        perm = await Geolocation.requestPermissions();
      }
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        onError();
        return () => {};
      }
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000 },
        (position, err) => {
          if (err || !position) { onError(); return; }
          onPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
      );
      return () => { void Geolocation.clearWatch({ id: watchId }); };
    } catch (e) {
      console.warn('Native geolocation unavailable, falling back to web API', e);
    }
  }

  if (!('geolocation' in navigator)) { onError(); return () => {}; }
  const webId = navigator.geolocation.watchPosition(
    (pos) => onPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => onError(),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
  );
  return () => navigator.geolocation.clearWatch(webId);
}
