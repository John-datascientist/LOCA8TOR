const KEY = 'loca8tor-device-id';

function hashParts(parts: string[]): string {
  let h = 0;
  const input = parts.join('|');
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Generate a stable phone-level fingerprint using signals that are less likely
 * to change between refreshes, orientation changes, or browser chrome.
 */
function fingerprint(): string {
  try {
    const dimensions = [screen.width, screen.height].sort((a, b) => a - b).join('x');
    const parts = [
      navigator.language || '',
      dimensions,
      String(screen.colorDepth || ''),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      String(navigator.hardwareConcurrency ?? ''),
      // @ts-ignore — deviceMemory is non-standard but widely supported
      String(navigator.deviceMemory ?? ''),
      String(navigator.maxTouchPoints ?? ''),
    ];
    return hashParts(parts);
  } catch {
    return 'na';
  }
}

export function getStableDeviceId(): string | null {
  const fp = fingerprint();
  return fp === 'na' ? null : `dev_${fp}`;
}

export function getDeviceId(): string {
  const storedId = getStoredDeviceId();
  if (storedId) {
    return storedId;
  }

  const stableId = getStableDeviceId();
  const id = stableId || `dev_${Math.random().toString(36).substring(2, 14)}`;
  try {
    localStorage.setItem(KEY, id);
  } catch {}
  return id;
}

export function getStoredDeviceId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}