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

// Leaflet measures its container's size once, at the exact moment it
// mounts. If the browser hasn't finished laying out that container yet
// (a flex/absolute-positioned parent can take an extra frame or two),
// Leaflet initializes at zero size and the tiles it requests never line
// up — the map looks entirely blank, and nothing after that first
// measurement fixes it on its own. This is timing-dependent, which is why
// the exact same code can work on one load and not on the next. Forcing a
// re-measure a couple of times shortly after mount, plus watching the
// container with a ResizeObserver for any real size changes afterward,
// covers both cases.
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const timers = [50, 300].map((ms) => setTimeout(() => map.invalidateSize(), ms));
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => {
      timers.forEach(clearTimeout);
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
    </MapContainer>
  );
}
