function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}

/** Requests the browser's current coordinates. Throws a plain Error with a readable message. */
export async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number }> {
  try {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new Error("Location isn't available in this browser.");
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
      });
    });

    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (err) {
    throw new Error(toErrorMessage(err, "Couldn't get your location."));
  }
}

/**
 * Resolves a postcode from coordinates via Loca8tor, through the
 * server-side proxy at /api/loca8tor/postcode (keeps the secret API key
 * off the client). Nigeria only, Loca8tor doesn't cover other countries
 * yet.
 */
export async function resolvePostcodeFromCoordinates(latitude: number, longitude: number): Promise<string> {
  try {
    const res = await fetch(`/api/loca8tor/postcode?lat=${latitude}&lng=${longitude}`);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error ?? "Couldn't resolve your postcode.");
    }

    const postcode: string | undefined =
      data?.postcode ?? data?.post_code ?? data?.data?.postcode ?? data?.result?.postcode;

    if (!postcode) {
      throw new Error("Couldn't read a postcode from Loca8tor's response.");
    }

    return postcode;
  } catch (err) {
    throw new Error(toErrorMessage(err, "Couldn't resolve your postcode."));
  }
}

/** Convenience wrapper: gets the browser's location, then resolves it to a postcode. */
export async function resolvePostcodeFromLocation(): Promise<string> {
  const { latitude, longitude } = await getCurrentCoordinates();
  return resolvePostcodeFromCoordinates(latitude, longitude);
}
