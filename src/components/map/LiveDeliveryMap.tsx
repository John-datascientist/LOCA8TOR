import { useEffect, useRef, type CSSProperties } from 'react';
import { Map as MLMap, Marker as MLMarker, type StyleSpecification, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { vehicleMarkerHtml, pickupMarkerHtml, dropoffMarkerHtml, VehicleType } from './BikeIcon';
import { bearingDeg } from '@/lib/routeGeometry';

interface LiveDeliveryMapProps {
  riderLat: number;
  riderLng: number;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  routeCoords?: [number, number][];
  followRider?: boolean;
  vehicleType?: VehicleType | string | null;
  /** True while a turn-by-turn trip is actively in progress: locks the
   * camera to a close street-level zoom on the rider, tilts the camera,
   * and rotates the whole map so the rider's direction of travel always
   * points up the screen — the Uber/Google "driver view". Off, the map
   * behaves like a plain route preview: north-up, framed to show both
   * the rider and the destination. */
  navigationMode?: boolean;
}

// Below this much movement (degrees, ~3m at typical latitudes), GPS noise
// dominates and recomputing a heading would just make things jitter in
// place instead of pointing anywhere meaningful.
const MIN_MOVEMENT_DEG = 0.00003;

const NAV_ZOOM = 18;
// If the rider pinches/scrolls out mid-navigation and drops below this,
// snap back to NAV_ZOOM rather than leaving them stuck zoomed out for the
// rest of the trip.
const NAV_MIN_ZOOM = 17;
// Camera tilt during navigation — MapLibre supports this natively (unlike
// Leaflet, which needed a CSS-rotation hack for even flat heading-up
// rotation and can't tilt at all). Real 3D-extruded buildings would need
// a vector tile source; this still uses the same free OSM raster tiles as
// the rest of the app, so the tilt reveals flat imagery in perspective
// rather than true 3D geometry — a deliberate, disclosed tradeoff.
const NAV_PITCH = 60;

const VIEWPORT_STYLE: CSSProperties = { position: 'absolute', inset: 0, minHeight: 300 };

// OSM's raster XYZ tiles, wrapped as a MapLibre "raster" source. MapLibre
// is vector-tile-first but renders raster XYZ tiles fine; multiple `tiles`
// URLs (matching Leaflet's {s} subdomain rotation) let it spread requests
// across OSM's a/b/c tile servers.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const ROUTE_SOURCE_ID = 'route';
const ROUTE_LAYER_ID = 'route-line';

function markerElement(html: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return (wrapper.firstElementChild as HTMLElement) ?? wrapper;
}

function toGeoJSONLine(coords: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords.map(([lat, lng]) => [lng, lat]) },
  };
}

export default function LiveDeliveryMap({
  riderLat, riderLng,
  pickupLat, pickupLng,
  dropoffLat, dropoffLng,
  routeCoords,
  followRider = true,
  vehicleType,
  navigationMode = false,
}: LiveDeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const riderMarkerRef = useRef<MLMarker | null>(null);
  const pickupMarkerRef = useRef<MLMarker | null>(null);
  const dropoffMarkerRef = useRef<MLMarker | null>(null);
  const styleLoadedRef = useRef(false);
  const pendingRouteRef = useRef<[number, number][] | undefined>(routeCoords);

  const prevPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const headingRef = useRef(0);
  const wasNavigatingRef = useRef(false);
  const fittedRef = useRef(false);

  // --- Create the map once. Leaflet needed position:absolute + inset:0 on
  // its own container to fix a real container-sizing bug (documented at
  // length in this file's git history) — MapLibre's canvas-based renderer
  // reads its container size the same way, so the container div here
  // carries the identical fix. ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MLMap({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [riderLng, riderLat],
      zoom: 15,
      pitch: 0,
      bearing: 0,
    });
    mapRef.current = map;

    map.on('load', () => {
      styleLoadedRef.current = true;
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: toGeoJSONLine(pendingRouteRef.current ?? []),
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': 'hsl(221, 83%, 53%)', 'line-width': 5, 'line-opacity': 0.8 },
      });
    });

    map.on('zoomend', () => {
      if (wasNavigatingRef.current && map.getZoom() < NAV_MIN_ZOOM) {
        map.setZoom(NAV_ZOOM);
      }
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
      riderMarkerRef.current = null;
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      fittedRef.current = false;
    };
    // Intentionally mount-only: center/zoom below are only the *initial*
    // view, exactly like the old MapContainer's center/zoom props — all
    // live movement is handled by the effects below instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Rider marker: (re)created when the vehicle type changes, since
  // MapLibre markers don't support swapping their element's content
  // in place. ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    riderMarkerRef.current?.remove();
    const marker = new MLMarker({
      element: markerElement(vehicleMarkerHtml(vehicleType)),
      anchor: 'center',
      rotationAlignment: 'viewport',
      pitchAlignment: 'viewport',
    }).setLngLat([riderLng, riderLat]).addTo(map);
    riderMarkerRef.current = marker;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleType]);

  // --- Pickup / dropoff markers ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pickupMarkerRef.current?.remove();
    pickupMarkerRef.current = null;
    if (pickupLat && pickupLng) {
      pickupMarkerRef.current = new MLMarker({ element: markerElement(pickupMarkerHtml), anchor: 'bottom' })
        .setLngLat([pickupLng, pickupLat]).addTo(map);
    }
  }, [pickupLat, pickupLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    dropoffMarkerRef.current?.remove();
    dropoffMarkerRef.current = null;
    if (dropoffLat && dropoffLng) {
      dropoffMarkerRef.current = new MLMarker({ element: markerElement(dropoffMarkerHtml), anchor: 'bottom' })
        .setLngLat([dropoffLng, dropoffLat]).addTo(map);
    }
  }, [dropoffLat, dropoffLng]);

  // --- Route polyline ---
  useEffect(() => {
    pendingRouteRef.current = routeCoords;
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(toGeoJSONLine(routeCoords ?? []));
  }, [routeCoords]);

  // --- Initial route-preview framing: fit both rider and destination in
  // view, once — matches the old FitBounds behavior. Skipped entirely in
  // navigationMode, where a wide fit is exactly what we don't want. ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || navigationMode || fittedRef.current) return;
    const pts: [number, number][] = [[riderLat, riderLng]];
    if (pickupLat && pickupLng) pts.push([pickupLat, pickupLng]);
    if (dropoffLat && dropoffLng) pts.push([dropoffLat, dropoffLng]);
    if (pts.length < 2) return;
    const lngs = pts.map(p => p[1]);
    const lats = pts.map(p => p[0]);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 50, maxZoom: 16 },
    );
    fittedRef.current = true;
  }, [riderLat, riderLng, pickupLat, pickupLng, dropoffLat, dropoffLng, navigationMode]);

  // --- Rider position: smoothly animate the marker between GPS fixes,
  // track heading, and drive the camera (plain follow-pan in preview mode;
  // zoom/tilt/rotate-locked "driver view" in navigationMode). All three
  // react to the same GPS update, so they're combined into one effect
  // rather than three separately re-diffing the same position change. ---
  useEffect(() => {
    const map = mapRef.current;
    const marker = riderMarkerRef.current;
    if (!map || !marker) return;

    const prev = prevPosRef.current;
    const end = { lat: riderLat, lng: riderLng };
    const movedEnough = prev ? Math.hypot(end.lat - prev.lat, end.lng - prev.lng) > MIN_MOVEMENT_DEG : false;

    if (movedEnough && prev) {
      headingRef.current = bearingDeg(prev, end);
      // In navigationMode the *map* rotates to put heading up the screen
      // (below), so the marker's own rotation is fixed at 0 (viewport-
      // aligned = always pointing up) rather than the raw heading — this
      // is what keeps the vehicle icon fixed while the map spins beneath
      // it, matching Uber/Google's driver view.
      marker.setRotation(navigationMode ? 0 : headingRef.current);
    }

    // Move the marker straight to the new fix. MapLibre's own camera
    // animation (easeTo/panTo below) already provides the visual motion
    // during navigation; running a second, independent
    // requestAnimationFrame loop here to interpolate the marker's position
    // competed with that native animation for the browser's render-frame
    // scheduling and could stall it entirely.
    marker.setLngLat([riderLng, riderLat]);

    if (navigationMode) {
      if (!wasNavigatingRef.current) {
        // Just started: fly in from wherever the preview camera was.
        map.easeTo({ center: [riderLng, riderLat], zoom: NAV_ZOOM, pitch: NAV_PITCH, bearing: headingRef.current, duration: 1200 });
      } else {
        map.easeTo({ center: [riderLng, riderLat], bearing: headingRef.current, duration: 1000 });
      }
    } else if (followRider && movedEnough) {
      map.panTo([riderLng, riderLat], { duration: 1000 });
    }
    wasNavigatingRef.current = navigationMode;
    prevPosRef.current = end;
  }, [riderLat, riderLng, navigationMode, followRider]);

  return <div ref={containerRef} style={VIEWPORT_STYLE} className="z-0" />;
}
