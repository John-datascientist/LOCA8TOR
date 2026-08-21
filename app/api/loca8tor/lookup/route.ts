import { NextResponse, type NextRequest } from "next/server";

/**
 * Verifies a Nigerian postcode actually exists in Loca8tor's records (not
 * just correctly formatted) and returns its real coordinates. Must stay a
 * server route: LOCA8TOR_API_KEY is a live secret key and must never reach
 * the browser.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code || !code.trim()) {
    return NextResponse.json({ error: "code query parameter is required." }, { status: 400 });
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
    upstream = await fetch(`${baseUrl}/lookup?code=${encodeURIComponent(code.trim())}`, {
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
    if (upstream.status === 404) {
      return NextResponse.json(
        { error: "That postcode wasn't found in Loca8tor's records." },
        { status: 404 }
      );
    }
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
