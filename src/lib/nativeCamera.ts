import { isNative } from './native';

/**
 * Capture an image. On native (iOS/Android via Capacitor) this opens the
 * native camera UI; on web it falls back to a hidden <input type="file"
 * accept="image/*" capture="environment"> picker.
 *
 * Returns a File the existing upload pipeline can consume.
 */
export async function captureProofPhoto(): Promise<File | null> {
  if (isNative()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: false,
      });
      if (!photo.base64String) return null;
      const ext = photo.format || 'jpg';
      const bin = atob(photo.base64String);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new File([bytes], `proof-${Date.now()}.${ext}`, { type: `image/${ext}` });
    } catch (e) {
      console.warn('Native camera failed, falling back to web picker', e);
    }
  }
  // Web fallback using a transient input element
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}