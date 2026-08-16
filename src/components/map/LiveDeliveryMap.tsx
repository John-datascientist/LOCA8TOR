import { useEffect, useRef, useMemo, type CSSProperties } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { bikeIcon, pickupIcon, dropoffIcon, vehicleIcon, VehicleType } from './BikeIcon';
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
   * camera to a close street-level zoom on the rider instead of framing
   * the whole rider-to-destination span. */
  navigationMode?: boolean;
}

// ~3m of movement, in degrees at typical latitudes — below this, GPS noise
// dominates and recomputing a bearing would just make the marker jitter in
// place instead of pointing anywhere meaningful.
const MIN_BEARING_MOVEMENT_DEG = 0.00003;

function SmoothRiderMarker({ lat, lng, icon }: { lat: number; lng: number; icon: L.DivIcon }) {
  const markerRef = useRef<L.Marker>(null);
  const prevPos = useRef<[number, number]>([lat, lng]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const start = prevPos.current;
    const end: [number, number] = [lat, lng];

    // Rotate the marker to face the direction of travel. Leaflet uses the
    // marker element's own transform for positioning, so rotating that
    // element directly would fight Leaflet's placement — instead rotate
    // just the icon's inner content div (the one BikeIcon.ts's HTML sets).
    if (Math.hypot(end[0] - start[0], end[1] - start[1]) > MIN_BEARING_MOVEMENT_DEG) {
      const bearing = bearingDeg({ lat: start[0], lng: start[1] }, { lat: end[0], lng: end[1] });
      const el = marker.getElement();
      const inner = el?.firstElementChild as HTMLElement | null;
      if (inner) inner.style.transform = `rotate(${bearing}deg)`;
    }

    const duration = 1500;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const newLat = start[0] + (end[0] - start[0]) * ease;
      const newLng = start[1] + (end[1] - start[1]) * ease;
      marker.setLatLng([newLat, newLng]);
      if (t < 1) requestAnimationFrame(animate);
      else prevPos.current = end;
    };
    requestAnimationFrame(animate);
  }, [lat, lng]);

  return <Marker ref={markerRef} position={[lat, lng]} icon={icon} />;
}

function MapFollower({ lat, lng, follow }: { lat: number; lng: number; follow: boolean }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng });

  useEffect(() => {
    if (!follow) return;
    if (Math.abs(lat - prevRef.current.lat) > 0.0001 || Math.abs(lng - prevRef.current.lng) > 0.0001) {
      map.panTo([lat, lng], { animate: true, duration: 1 });
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, follow, map]);

  return null;
}

function FitBounds({ points, disabled }: { points: [number, number][]; disabled?: boolean }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (disabled || fitted.current || points.length < 2) return;
    const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    fitted.current = true;
  }, [points, map, disabled]);

  return null;
}

// Street-level zoom to lock onto once a trip starts — framing the whole
// rider-to-destination span (what FitBounds does otherwise) is useless
// during actual turn-by-turn navigation, and can be wildly zoomed out if
// the destination is far away, defeating the point of a close-up nav view.
const NAV_ZOOM = 18;
// If the rider pinches/scrolls out mid-navigation and drops below this,
// snap back to NAV_ZOOM rather than leaving them stuck at a zoomed-out
// view for the rest of the trip.
const NAV_MIN_ZOOM = 17;

function NavigationCamera({ lat, lng, active }: { lat: number; lng: number; active: boolean }) {
  const map = useMap();
  const wasActive = useRef(false);

  useEffect(() => {
    // Only snap in once, right as navigation starts — MapFollower's panTo
    // handles keeping the rider centered after that, without fighting this
    // effect on every single GPS update.
    if (active && !wasActive.current) {
      map.flyTo([lat, lng], NAV_ZOOM, { animate: true, duration: 1.2 });
    }
    wasActive.current = active;
  }, [active, lat, lng, map]);

  useMapEvents({
    zoomend: () => {
      if (active && map.getZoom() < NAV_MIN_ZOOM) {
        map.setZoom(NAV_ZOOM);
      }
    },
  });

  return null;
}

// Root cause of the map going blank, confirmed with a real browser rather
// than guessed: this container's height:100% sat under a flex column item
// (.flex-1) whose own height comes purely from flex-grow, not an explicit
// CSS height. Percentage heights on a descendant of a flex item like that
// are a long-standing, well-documented cross-browser layout gotcha — the
// child can resolve to 0 height even though its parent measures a real,
// non-zero height (verified directly: getBoundingClientRect() on the
// parent read 838px while the map container inside it read 0px). Anchoring
// with absolute positioning + inset:0 instead of height/width:100%
// sidesteps that percentage-resolution ambiguity entirely and was verified
// to fix it (container measured 838px afterward, tile requests went from a
// 0-height sliver of 3 tiles to a proper 12-tile grid). This requires the
// immediate parent to have `position: relative` (or similar) — true at
// every current call site.
// minHeight is a belt-and-suspenders floor on top of the actual fix above —
// harmless when the parent already has real height (which it does, per the
// fix), but guards against an extreme edge case (e.g. a pathologically
// short viewport) leaving Leaflet with a near-zero container.
const MAP_FILL_STYLE: CSSProperties = { position: 'absolute', inset: 0, minHeight: 300 };

// Leaflet measures its container's size once, at the exact moment it
// mounts. The MAP_FILL_STYLE fix above makes that size deterministic, but
// this stays as cheap insurance against any other future resize (e.g. a
// mobile browser's address bar hiding/showing, or an orientation change)
// that the initial measurement wouldn't catch on its own.
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [map]);

  return null;
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
  // MapContainer's `center` prop only sets the *initial* view (react-leaflet
  // doesn't recenter on prop changes after mount — MapFollower below handles
  // live recentering) but still needs correct deps: an empty array froze
  // this at whatever riderLat/riderLng happened to be on the very first
  // render, which is wrong if that first render ever fires before a real
  // GPS fix is available.
  const center = useMemo<[number, number]>(() => [riderLat, riderLng], [riderLat, riderLng]);

  const fitPoints = useMemo(() => {
    const pts: [number, number][] = [[riderLat, riderLng]];
    if (pickupLat && pickupLng) pts.push([pickupLat, pickupLng]);
    if (dropoffLat && dropoffLng) pts.push([dropoffLat, dropoffLng]);
    return pts;
  }, [riderLat, riderLng, pickupLat, pickupLng, dropoffLat, dropoffLng]);

  return (
    <MapContainer center={center} zoom={15} scrollWheelZoom={true} zoomControl={false}
      style={MAP_FILL_STYLE} className="z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Route polyline */}
      {routeCoords && routeCoords.length > 1 && (
        <Polyline positions={routeCoords} pathOptions={{ color: 'hsl(221, 83%, 53%)', weight: 5, opacity: 0.8 }} />
      )}

      {/* Pickup marker */}
      {pickupLat && pickupLng && (
        <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
          <Popup><span className="font-bold text-sm">📦 Pickup</span></Popup>
        </Marker>
      )}

      {/* Dropoff marker */}
      {dropoffLat && dropoffLng && (
        <Marker position={[dropoffLat, dropoffLng]} icon={dropoffIcon}>
          <Popup><span className="font-bold text-sm">📍 Drop-off</span></Popup>
        </Marker>
      )}

      {/* Animated rider marker */}
      <SmoothRiderMarker lat={riderLat} lng={riderLng} icon={vehicleType ? vehicleIcon(vehicleType) : bikeIcon} />

      <MapFollower lat={riderLat} lng={riderLng} follow={followRider} />
      <FitBounds points={fitPoints} disabled={navigationMode} />
      <NavigationCamera lat={riderLat} lng={riderLng} active={navigationMode} />
      <MapResizeHandler />
    </MapContainer>
  );
}
