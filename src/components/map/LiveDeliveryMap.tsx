import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { bikeIcon, pickupIcon, dropoffIcon, vehicleIcon, VehicleType } from './BikeIcon';

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
  /** Change this value (e.g. pass a screen/step flag) to force the map to
   * redraw itself — see MapRedrawTrigger below for why. */
  redrawTrigger?: unknown;
}

function SmoothRiderMarker({ lat, lng, icon }: { lat: number; lng: number; icon: L.DivIcon }) {
  const markerRef = useRef<L.Marker>(null);
  const prevPos = useRef<[number, number]>([lat, lng]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const start = prevPos.current;
    const end: [number, number] = [lat, lng];
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

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || points.length < 2) return;
    const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    fitted.current = true;
  }, [points, map]);

  return null;
}

// Leaflet measures its container's size once, when the map first mounts, and
// never notices afterward if that container is resized — e.g. this map's
// wrapper switching from a fixed h-[45vh] to flex-1 when a trip starts. Left
// unhandled, the map can render with a stale/zero size and appear blank
// (tiles positioned for a size that no longer matches the real container).
// A ResizeObserver on the container calls invalidateSize() any time it
// actually changes, which forces Leaflet to remeasure and redraw.
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    // Catch the very first layout too, in case it wasn't finalized yet on
    // the frame Leaflet used for its initial size measurement.
    const initial = setTimeout(() => map.invalidateSize(), 100);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => {
      clearTimeout(initial);
      ro.disconnect();
    };
  }, [map]);

  return null;
}

// Forces Leaflet to fully re-measure and repaint on demand. Fixes a browser
// compositing glitch, seen directly via user screenshot: a fully-rendered
// map (real streets, already loaded) went solid black the instant an
// unrelated sibling element nearby changed size — even though the map's own
// container never resized. invalidateSize() alone wasn't enough; toggling a
// transform to force the GPU layer to be torn down and rebuilt is the
// standard fix for this class of "stuck compositing layer" bug in Chromium.
function MapRedrawTrigger({ trigger }: { trigger: unknown }) {
  const map = useMap();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    map.invalidateSize();
    const container = map.getContainer();
    container.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => {
      container.style.transform = '';
      map.invalidateSize();
    });
  }, [trigger, map]);

  return null;
}

export default function LiveDeliveryMap({
  riderLat, riderLng,
  pickupLat, pickupLng,
  dropoffLat, dropoffLng,
  routeCoords,
  followRider = true,
  vehicleType,
  redrawTrigger,
}: LiveDeliveryMapProps) {
  const center = useMemo<[number, number]>(() => [riderLat, riderLng], []);

  const fitPoints = useMemo(() => {
    const pts: [number, number][] = [[riderLat, riderLng]];
    if (pickupLat && pickupLng) pts.push([pickupLat, pickupLng]);
    if (dropoffLat && dropoffLng) pts.push([dropoffLat, dropoffLng]);
    return pts;
  }, []);

  return (
    <MapContainer center={center} zoom={15} scrollWheelZoom={true} zoomControl={false}
      style={{ height: '100%', width: '100%' }} className="z-0">
      {/* Reverted to OSM tiles — switching to CARTO here (matching
          LiveFleetMap.tsx) caused a regression: the map stopped showing even
          on the initial picker screen, which had been working fine on OSM.
          CARTO may still be worth revisiting later, but not blindly copied
          over without confirming it actually works on this screen first. */}
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
      <FitBounds points={fitPoints} />
      <MapResizeHandler />
      <MapRedrawTrigger trigger={redrawTrigger} />
    </MapContainer>
  );
}
