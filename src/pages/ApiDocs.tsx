import { useState } from 'react';
import { Copy, Check, Code, Globe, Key, Zap, MapPin, ArrowRight, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

function CopyBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-[hsl(var(--secondary))] border border-border rounded-xl p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-foreground">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-background/80 border border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

const BASE = 'https://loca8tor.com/api/v1';

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/postcode',
    title: 'Generate Postcode',
    desc: 'Generate a Loca8tor postcode for any GPS coordinates in Nigeria. Checks for a postcode already issued within ~40m and reuses it, so the same location keeps the same postcode.',
    params: [
      { name: 'lat', type: 'number', required: true, desc: 'Latitude (Nigeria only, approx. 4-14)' },
      { name: 'lng', type: 'number', required: true, desc: 'Longitude (Nigeria only, approx. 2.7-14.7)' },
    ],
    response: `{
  "postcode": "LA42 7BK",
  "state": "Lagos",
  "country": "Nigeria",
  "lga": "Ikeja",
  "lat": 6.60126,
  "lng": 3.35149,
  "address": "Allen Avenue, Ikeja, Lagos"
}`,
    curl: `curl -X GET "${BASE}/postcode?lat=6.60126&lng=3.35149" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    js: `const response = await fetch(
  "${BASE}/postcode?lat=6.60126&lng=3.35149",
  { headers: { "Authorization": "Bearer YOUR_API_KEY" } }
);
const data = await response.json();
console.log(data.postcode); // "LA42 7BK"`,
    python: `import requests

response = requests.get(
    "${BASE}/postcode",
    params={"lat": 6.60126, "lng": 3.35149},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
data = response.json()
print(data["postcode"])  # "LA42 7BK"`,
  },
  {
    method: 'GET',
    path: '/api/v1/lookup',
    title: 'Lookup Postcode',
    desc: 'Reverse lookup a Loca8tor postcode to get its GPS coordinates and location details.',
    params: [
      { name: 'code', type: 'string', required: true, desc: 'The Loca8tor postcode (e.g. LA42 7BK)' },
    ],
    response: `{
  "postcode": "LA42 7BK",
  "lat": 6.60126,
  "lng": 3.35149,
  "state": "Lagos",
  "lga": "Ikeja",
  "country": "Nigeria",
  "address": "Allen Avenue, Ikeja, Lagos"
}`,
    curl: `curl -X GET "${BASE}/lookup?code=LA42%207BK" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    js: `const response = await fetch(
  "${BASE}/lookup?code=LA42%207BK",
  { headers: { "Authorization": "Bearer YOUR_API_KEY" } }
);
const data = await response.json();
console.log(data.lat, data.lng); // 6.60126, 3.35149`,
    python: `import requests

response = requests.get(
    "${BASE}/lookup",
    params={"code": "LA42 7BK"},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
data = response.json()
print(data["lat"], data["lng"])  # 6.60126 3.35149`,
  },
  {
    method: 'POST',
    path: '/api/v1/batch',
    title: 'Batch Generate',
    desc: 'Generate postcodes for multiple coordinates in a single request — counts as one API call regardless of batch size. Up to 100 coordinates per batch.',
    params: [
      { name: 'locations', type: 'array', required: true, desc: 'Array of {lat, lng} objects (max 100)' },
    ],
    response: `{
  "results": [
    { "postcode": "LA42 7BK", "lat": 6.60126, "lng": 3.35149, "state": "Lagos" },
    { "postcode": "AB09 2HN", "lat": 9.05822, "lng": 7.49116, "state": "FCT" }
  ],
  "count": 2
}`,
    curl: `curl -X POST "${BASE}/batch" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"locations": [{"lat": 6.60126, "lng": 3.35149}, {"lat": 9.05822, "lng": 7.49116}]}'`,
    js: `const response = await fetch("${BASE}/batch", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    locations: [
      { lat: 6.60126, lng: 3.35149 },
      { lat: 9.05822, lng: 7.49116 }
    ]
  })
});
const data = await response.json();
console.log(data.results);`,
    python: `import requests

response = requests.post(
    "${BASE}/batch",
    json={"locations": [
        {"lat": 6.60126, "lng": 3.35149},
        {"lat": 9.05822, "lng": 7.49116}
    ]},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
data = response.json()
print(data["results"])`,
  },
  {
    method: 'GET',
    path: '/api/v1/distance',
    title: 'Distance Calculator',
    desc: 'Straight-line (haversine) distance in km between two points.',
    params: [
      { name: 'fromLat', type: 'number', required: true, desc: 'Origin latitude' },
      { name: 'fromLng', type: 'number', required: true, desc: 'Origin longitude' },
      { name: 'toLat', type: 'number', required: true, desc: 'Destination latitude' },
      { name: 'toLng', type: 'number', required: true, desc: 'Destination longitude' },
    ],
    response: `{
  "distanceKm": 12.4,
  "distanceM": 12400,
  "unit": "straight-line"
}`,
    curl: `curl -X GET "${BASE}/distance?fromLat=6.6012&fromLng=3.3514&toLat=6.4550&toLng=3.3941" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    js: `const response = await fetch(
  "${BASE}/distance?fromLat=6.6012&fromLng=3.3514&toLat=6.4550&toLng=3.3941",
  { headers: { "Authorization": "Bearer YOUR_API_KEY" } }
);
const data = await response.json();
console.log(data.distanceKm);`,
    python: `import requests

response = requests.get(
    "${BASE}/distance",
    params={"fromLat": 6.6012, "fromLng": 3.3514, "toLat": 6.4550, "toLng": 3.3941},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json()["distanceKm"])`,
  },
  {
    method: 'GET',
    path: '/api/v1/route',
    title: 'Request a Route',
    desc: 'Turn-by-turn driving route between two points, with coordinates, distance, duration and step-by-step instructions.',
    params: [
      { name: 'fromLat', type: 'number', required: true, desc: 'Origin latitude' },
      { name: 'fromLng', type: 'number', required: true, desc: 'Origin longitude' },
      { name: 'toLat', type: 'number', required: true, desc: 'Destination latitude' },
      { name: 'toLng', type: 'number', required: true, desc: 'Destination longitude' },
    ],
    response: `{
  "coordinates": [[6.6012, 3.3514], ["..."]],
  "distanceKm": 14.2,
  "durationMin": 28,
  "isFallback": false,
  "steps": [
    { "instruction": "Head out onto Allen Avenue", "distanceM": 400, "durationS": 80 }
  ]
}`,
    curl: `curl -X GET "${BASE}/route?fromLat=6.6012&fromLng=3.3514&toLat=6.4550&toLng=3.3941" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    js: `const response = await fetch(
  "${BASE}/route?fromLat=6.6012&fromLng=3.3514&toLat=6.4550&toLng=3.3941",
  { headers: { "Authorization": "Bearer YOUR_API_KEY" } }
);
const data = await response.json();
console.log(data.distanceKm, data.steps.length);`,
    python: `import requests

response = requests.get(
    "${BASE}/route",
    params={"fromLat": 6.6012, "fromLng": 3.3514, "toLat": 6.4550, "toLng": 3.3941},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json()["distanceKm"])`,
  },
  {
    method: 'GET',
    path: '/api/v1/search',
    title: 'Search Postcodes',
    desc: 'Search previously-issued Loca8tor postcodes by postcode, address, state or LGA text.',
    params: [
      { name: 'query', type: 'string', required: true, desc: 'Search text, minimum 2 characters' },
      { name: 'limit', type: 'number', required: false, desc: 'Max results, 1-50 (default 20)' },
    ],
    response: `{
  "results": [
    { "postcode": "LA42 7BK", "lat": 6.60126, "lng": 3.35149, "state_name": "Lagos", "lga_name": "Ikeja", "address": "Allen Avenue" }
  ],
  "count": 1
}`,
    curl: `curl -X GET "${BASE}/search?query=Ikeja" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    js: `const response = await fetch(
  "${BASE}/search?query=Ikeja",
  { headers: { "Authorization": "Bearer YOUR_API_KEY" } }
);
const data = await response.json();
console.log(data.results);`,
    python: `import requests

response = requests.get(
    "${BASE}/search",
    params={"query": "Ikeja"},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json()["results"])`,
  },
  {
    method: 'GET',
    path: '/api/v1/fleet/riders',
    title: 'List Fleet Riders',
    desc: "List the authenticated business's own fleet riders and their current status — the same roster your business dashboard shows.",
    params: [],
    response: `{
  "riders": [
    { "id": "...", "rider_name": "John A.", "status": "active", "rider_live_status": "delivering", "vehicle_type": "bike", "last_lat": 6.6, "last_lng": 3.35, "last_postcode": "LA42 7BK", "last_seen": "2026-08-16T10:00:00Z" }
  ],
  "count": 1
}`,
    curl: `curl -X GET "${BASE}/fleet/riders" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    js: `const response = await fetch("${BASE}/fleet/riders", {
  headers: { "Authorization": "Bearer YOUR_API_KEY" }
});
const data = await response.json();
console.log(data.riders);`,
    python: `import requests

response = requests.get(
    "${BASE}/fleet/riders",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json()["riders"])`,
  },
  {
    method: 'GET',
    path: '/api/v1/fleet/riders/{id}/location',
    title: 'Rider Location',
    desc: "A single authorized rider's last known location — only returns data for riders in your own fleet who have location sharing enabled. This is polling-based (not push/webhook) for now: poll on an interval that matches how fresh you need the position to be.",
    params: [
      { name: 'id', type: 'string', required: true, desc: "The rider's id, from /fleet/riders" },
    ],
    response: `{
  "riderId": "...",
  "riderName": "John A.",
  "status": "delivering",
  "lat": 6.6,
  "lng": 3.35,
  "postcode": "LA42 7BK",
  "lastSeen": "2026-08-16T10:00:00Z"
}`,
    curl: `curl -X GET "${BASE}/fleet/riders/RIDER_ID/location" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    js: `const response = await fetch("${BASE}/fleet/riders/RIDER_ID/location", {
  headers: { "Authorization": "Bearer YOUR_API_KEY" }
});
const data = await response.json();
console.log(data.lat, data.lng);`,
    python: `import requests

response = requests.get(
    "${BASE}/fleet/riders/RIDER_ID/location",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json())`,
  },
  {
    method: 'POST',
    path: '/api/v1/deliveries',
    title: 'Create a Delivery',
    desc: "Creates a delivery/tracking under your business account. riderId is optional — omit it to create an unassigned delivery and assign a rider afterward with the assign endpoint below.",
    params: [
      { name: 'customerName', type: 'string', required: true, desc: 'Recipient name' },
      { name: 'customerPhone', type: 'string', required: false, desc: 'Recipient phone' },
      { name: 'fromPostcode', type: 'string', required: false, desc: 'Pickup postcode' },
      { name: 'toPostcode', type: 'string', required: false, desc: 'Drop-off postcode' },
      { name: 'pickupLat / pickupLng', type: 'number', required: false, desc: 'Pickup coordinates' },
      { name: 'dropoffLat / dropoffLng', type: 'number', required: false, desc: 'Drop-off coordinates' },
      { name: 'deliveryFee', type: 'number', required: false, desc: 'Fee in Naira' },
      { name: 'notes', type: 'string', required: false, desc: 'Free-text notes' },
      { name: 'riderId', type: 'string', required: false, desc: 'A rider id from /fleet/riders — assigns the delivery immediately if provided' },
    ],
    response: `{
  "id": "...",
  "shareCode": "TRK-...",
  "trackingUrl": "https://loca8tor.com/track/TRK-...",
  "status": "pending",
  "customerName": "Jane Doe",
  "riderId": null,
  "createdAt": "2026-08-19T10:00:00Z"
}`,
    curl: `curl -X POST "${BASE}/deliveries" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"customerName": "Jane Doe", "fromPostcode": "LA42 7BK", "toPostcode": "LA09 3CX"}'`,
    js: `const response = await fetch("${BASE}/deliveries", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    customerName: "Jane Doe",
    fromPostcode: "LA42 7BK",
    toPostcode: "LA09 3CX"
  })
});
const data = await response.json();
console.log(data.trackingUrl);`,
    python: `import requests

response = requests.post(
    "${BASE}/deliveries",
    json={"customerName": "Jane Doe", "fromPostcode": "LA42 7BK", "toPostcode": "LA09 3CX"},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json()["trackingUrl"])`,
  },
  {
    method: 'GET',
    path: '/api/v1/deliveries',
    title: 'List Deliveries',
    desc: 'Lists deliveries under your business account, most recent first.',
    params: [
      { name: 'status', type: 'string', required: false, desc: 'Filter by status (pending, accepted, picked_up, on_my_way_deliver, delivered, failed)' },
      { name: 'riderId', type: 'string', required: false, desc: 'Filter to one rider' },
      { name: 'limit', type: 'number', required: false, desc: 'Max results, 1-100 (default 20)' },
    ],
    response: `{
  "deliveries": [
    { "id": "...", "status": "delivered", "customerName": "Jane Doe", "riderId": "..." }
  ],
  "count": 1
}`,
    curl: `curl -X GET "${BASE}/deliveries?status=delivered" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    js: `const response = await fetch("${BASE}/deliveries?status=delivered", {
  headers: { "Authorization": "Bearer YOUR_API_KEY" }
});
const data = await response.json();
console.log(data.deliveries);`,
    python: `import requests

response = requests.get(
    "${BASE}/deliveries",
    params={"status": "delivered"},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json()["deliveries"])`,
  },
  {
    method: 'GET',
    path: '/api/v1/deliveries/{id}',
    title: 'Get a Delivery',
    desc: 'Fetches a single delivery by id.',
    params: [
      { name: 'id', type: 'string', required: true, desc: "The delivery's id" },
    ],
    response: `{
  "id": "...",
  "status": "on_my_way_deliver",
  "customerName": "Jane Doe",
  "riderId": "...",
  "riderName": "Chinedu O."
}`,
    curl: `curl -X GET "${BASE}/deliveries/DELIVERY_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    js: `const response = await fetch("${BASE}/deliveries/DELIVERY_ID", {
  headers: { "Authorization": "Bearer YOUR_API_KEY" }
});
const data = await response.json();
console.log(data.status);`,
    python: `import requests

response = requests.get(
    "${BASE}/deliveries/DELIVERY_ID",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json()["status"])`,
  },
  {
    method: 'PATCH',
    path: '/api/v1/deliveries/{id}/status',
    title: 'Update Delivery Status',
    desc: 'Updates a delivery\'s status. Marking it delivered records the completion time and updates the assigned rider\'s delivery counters, same as the in-app rider flow.',
    params: [
      { name: 'id', type: 'string', required: true, desc: "The delivery's id" },
      { name: 'status', type: 'string', required: true, desc: 'One of: pending, accepted, picked_up, on_my_way_deliver, delivered, failed' },
    ],
    response: `{
  "id": "...",
  "status": "delivered",
  "deliveredAt": "2026-08-19T10:20:00Z"
}`,
    curl: `curl -X PATCH "${BASE}/deliveries/DELIVERY_ID/status" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "delivered"}'`,
    js: `const response = await fetch("${BASE}/deliveries/DELIVERY_ID/status", {
  method: "PATCH",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ status: "delivered" })
});
const data = await response.json();
console.log(data.status);`,
    python: `import requests

response = requests.patch(
    "${BASE}/deliveries/DELIVERY_ID/status",
    json={"status": "delivered"},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json()["status"])`,
  },
  {
    method: 'POST',
    path: '/api/v1/deliveries/{id}/assign',
    title: 'Assign a Rider',
    desc: 'Assigns (or reassigns) a rider/driver from your own fleet to a delivery.',
    params: [
      { name: 'id', type: 'string', required: true, desc: "The delivery's id" },
      { name: 'riderId', type: 'string', required: true, desc: 'A rider id from /fleet/riders' },
    ],
    response: `{
  "id": "...",
  "riderId": "...",
  "riderName": "Chinedu O.",
  "status": "pending"
}`,
    curl: `curl -X POST "${BASE}/deliveries/DELIVERY_ID/assign" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"riderId": "RIDER_ID"}'`,
    js: `const response = await fetch("${BASE}/deliveries/DELIVERY_ID/assign", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ riderId: "RIDER_ID" })
});
const data = await response.json();
console.log(data.riderName);`,
    python: `import requests

response = requests.post(
    "${BASE}/deliveries/DELIVERY_ID/assign",
    json={"riderId": "RIDER_ID"},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json()["riderName"])`,
  },
];

const plans = [
  { plan: 'API Starter', calls: '5,000 / month', batch: '100 per request', support: 'Email' },
  { plan: 'API Growth', calls: '25,000 / month', batch: '100 per request', support: 'Priority email' },
  { plan: 'API Scale', calls: '100,000 / month', batch: '100 per request', support: 'Priority email' },
  { plan: 'Enterprise', calls: 'Custom', batch: 'Custom', support: 'Dedicated' },
];

export default function ApiDocs() {
  const [activeTab, setActiveTab] = useState<'curl' | 'js' | 'python'>('js');
  const [expandedEndpoint, setExpandedEndpoint] = useState(0);

  return (
    <>
    <SEO
      title="Loca8tor API Docs — Postcode & Geolocation Endpoints"
      description="Developer documentation for the Loca8tor API: generate postcodes, look up addresses, and integrate Nigerian and global geolocation into your apps."
      path="/api-docs"
    />
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-5 overflow-hidden border-b border-border">
        <div className="grid-bg" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 max-w-[900px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[12px] font-bold text-primary uppercase tracking-wider mb-6">
            <Code className="w-3.5 h-3.5" /> API Reference
          </div>
          <h1 className="font-heading text-[clamp(32px,5vw,56px)] font-black leading-[1.05] tracking-[-2px]">
            Loca8tor <span className="text-primary">API</span>
          </h1>
          <p className="text-muted-foreground text-[15px] mt-4 max-w-xl">
            Integrate street-level postcode generation into your app. Generate, lookup, and batch-process Loca8tor codes with a simple REST API.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to="/api"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold text-sm rounded-lg hover:brightness-110 transition-all glow-lime"
            >
              <Tag className="w-4 h-4" /> See API Pricing
            </Link>
            <a
              href="#endpoints"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-foreground font-heading font-semibold text-sm rounded-lg border border-border hover:border-primary/30 transition-all"
            >
              View Endpoints <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <p className="text-[12px] text-muted-foreground mt-5">
            The API is a separate product from our fleet management plans — plans start at <span className="text-primary font-bold">₦30,000/mo for 5,000 calls</span>.
          </p>
        </div>
      </section>

      {/* Quick start */}
      <section className="py-14 px-5 border-b border-border">
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-heading text-xl font-bold mb-6">Quick Start</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { step: '1', icon: <Key className="w-5 h-5" />, title: 'Get API Key', desc: 'Sign up as a business and generate your API key from the dashboard.' },
              { step: '2', icon: <Code className="w-5 h-5" />, title: 'Make a Request', desc: 'Send coordinates to our API and receive a deterministic postcode.' },
              { step: '3', icon: <Globe className="w-5 h-5" />, title: 'Integrate', desc: 'Use postcodes in your delivery, logistics, or mapping application.' },
            ].map(s => (
              <div key={s.step} className="bg-card border border-border rounded-xl p-6 relative">
                <div className="font-heading text-5xl font-black text-primary/[0.08] absolute top-2 right-3">{s.step}</div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">{s.icon}</div>
                <h3 className="font-heading text-sm font-bold mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="py-14 px-5 border-b border-border">
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-heading text-xl font-bold mb-4">Authentication</h2>
          <p className="text-sm text-muted-foreground mb-5">
            All API requests require a Bearer token in the <code className="bg-secondary px-1.5 py-0.5 rounded text-primary text-xs font-mono">Authorization</code> header.
          </p>
          <CopyBlock code={`Authorization: Bearer YOUR_API_KEY`} />
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-4 flex gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">Keep your API key secure</p>
              <p className="text-xs text-muted-foreground mt-1">Never expose your API key in client-side code. Use it only in server-to-server requests or backend functions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section id="endpoints" className="py-14 px-5 border-b border-border">
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-heading text-xl font-bold mb-6">Endpoints</h2>

          {/* Language tabs */}
          <div className="flex gap-1 mb-6 bg-secondary rounded-lg p-1 w-fit">
            {(['js', 'python', 'curl'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'js' ? 'JavaScript' : t === 'python' ? 'Python' : 'cURL'}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {endpoints.map((ep, i) => (
              <div key={ep.path} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedEndpoint(expandedEndpoint === i ? -1 : i)}
                  className="w-full flex items-center gap-3 p-5 text-left hover:bg-secondary/50 transition-colors"
                >
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono ${
                    ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-foreground font-semibold">{ep.path}</code>
                  <span className="text-sm text-muted-foreground ml-auto hidden sm:inline">{ep.title}</span>
                </button>

                {expandedEndpoint === i && (
                  <div className="border-t border-border p-5 space-y-5">
                    <p className="text-sm text-muted-foreground">{ep.desc}</p>

                    {/* Parameters */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Parameters</h4>
                      <div className="space-y-2">
                        {ep.params.map(p => (
                          <div key={p.name} className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
                            <code className="text-xs font-mono font-bold text-primary">{p.name}</code>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">{p.type}</span>
                            {p.required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold">required</span>}
                            <span className="text-xs text-muted-foreground ml-auto">{p.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Code example */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Example Request</h4>
                      <CopyBlock code={activeTab === 'curl' ? ep.curl : activeTab === 'python' ? ep.python : ep.js} />
                    </div>

                    {/* Response */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Response</h4>
                      <CopyBlock code={ep.response} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans & quotas */}
      <section className="py-14 px-5 border-b border-border">
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-heading text-xl font-bold mb-6">Plans &amp; Quotas</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Calls are counted per calendar month. Once you reach your plan's quota, further requests return a <code className="bg-secondary px-1.5 py-0.5 rounded text-primary text-xs font-mono">429</code> until the quota resets or you upgrade.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-heading font-bold text-foreground">Plan</th>
                  <th className="text-left py-3 px-4 font-heading font-bold text-foreground">Calls / month</th>
                  <th className="text-left py-3 px-4 font-heading font-bold text-foreground">Batch Size</th>
                  <th className="text-left py-3 px-4 font-heading font-bold text-foreground">Support</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(r => (
                  <tr key={r.plan} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">{r.plan}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{r.calls}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{r.batch}</td>
                    <td className="py-3 px-4 text-muted-foreground">{r.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Error codes */}
      <section className="py-14 px-5 border-b border-border">
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-heading text-xl font-bold mb-6">Error Codes</h2>
          <div className="space-y-2">
            {[
              { code: '400', desc: 'Bad Request — Missing or invalid parameters' },
              { code: '401', desc: 'Unauthorized — Invalid or missing API key' },
              { code: '403', desc: 'Forbidden — API key lacks required permissions' },
              { code: '429', desc: 'Too Many Requests — Rate limit exceeded' },
              { code: '500', desc: 'Internal Server Error — Try again later' },
            ].map(e => (
              <div key={e.code} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                <span className="font-mono font-bold text-sm text-destructive w-10">{e.code}</span>
                <span className="text-sm text-muted-foreground">{e.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10">
          <MapPin className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="font-heading text-[clamp(24px,4vw,40px)] font-black tracking-[-1px]">
            Ready to Integrate?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mt-3 text-sm">
            Sign up for a business account to get your API key. Start generating postcodes in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <Link
              to="/signup?type=business"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-heading font-bold text-sm rounded-lg hover:brightness-110 glow-lime transition-all"
            >
              <Key className="w-4 h-4" /> Get API Key
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-secondary text-foreground font-heading font-semibold text-sm rounded-lg border border-border hover:border-primary/30 transition-all"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center">
        <p className="text-[10px] text-muted-foreground">
          © {new Date().getFullYear()} Loca8tor · Workerholics Solutions Ltd, United Kingdom
        </p>
      </footer>
    </div>
    </>
  );
}
