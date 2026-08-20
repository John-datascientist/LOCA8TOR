import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxies postcode-by-coordinates lookups to the Loca8tor API. This must
 * stay a server route: LOCA8TOR_API_KEY is a live secret key and must
 * never reach the browser.
 */
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return NextResponse.json(
      { error: "lat and lng query parameters are required and must be numbers." },
      { status: 400 }
    );
  }

  const apiKey = process.env.LOCA8TOR_API_KEY;
  const baseUrl = process.env.LOCA8TOR_API_BASE_URL;

  if (!apiKey || !baseUrl) {
    return NextResponse.json(
      { error: "Loca8tor API is not configured on the server." },
      { status: 500 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/postcode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the Loca8tor API." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await upstream.json().catch(() => null)
    : await upstream.text().catch(() => null);

  if (!upstream.ok) {
    if (upstream.status === 429) {
      return NextResponse.json(
        { error: "Loca8tor API monthly call limit reached. Try again later or upgrade your plan." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Loca8tor API request failed.", status: upstream.status, body },
      { status: upstream.status }
    );
  }

  return NextResponse.json(body);
}
