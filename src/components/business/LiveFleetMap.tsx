import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, MapPin, Navigation, Users } from 'lucide-react';
import { vehicleIcon } from '@/components/map/BikeIcon';

interface RiderData {
  id: string;
  rider_name: string;
  rider_phone: string;
  status: string;
  last_lat: number | null;
  last_lng: number | null;
  last_postcode: string | null;
  last_seen: string | null;
  rider_live_status?: 'available' | 'delivering' | 'offline' | null;
  location_sharing?: boolean | null;
  total_deliveries: number;
  vehicle_type?: string | null;
  worker_type?: string | null;
}

interface DisplayRider extends RiderData {
  displayLat: number;
  displayLng: number;
  stackedCount: number;
  originalLat: number;
  originalLng: number;
}

interface ActiveDelivery {
  business_rider_id: string;
  customer_name: string;
  from_postcode: string | null;
  to_postcode: string | null;
  status: string;
}

const VEHICLE_EMOJI: Record<string, string> = { bike: '🚴', car: '🚗', bus: '🚌', truck: '🚚' };
function createRiderIcon(isActive: boolean, hasDelivery: boolean, vehicleType?: string | null) {
  const color = hasDelivery ? '#3B82F6' : isActive ? '#22C55E' : '#6B7280';
  const emoji = VEHICLE_EMOJI[vehicleType || 'bike'] || '🚴';
  return L.divIcon({
    className: 'custom-rider-marker',
    html: `<div style="
      width: 40px; height: 40px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; line-height: 1;
    ">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

const isValidCoord = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

// Nigeria bounding box (approx). Used to keep the fleet map framed on NG
// even when a stale rider coord from another country would otherwise warp
// fitBounds to a world view.
const NG_BOUNDS = { minLat: 4, maxLat: 14, minLng: 2.5, maxLng: 15 };
const isInNigeria = (lat: number, lng: number) =>
  lat >= NG_BOUNDS.minLat && lat <= NG_BOUNDS.maxLat &&
  lng >= NG_BOUNDS.minLng && lng <= NG_BOUNDS.maxLng;
// Null-island / obviously bogus GPS
const isBogusCoord = (lat: number, lng: number) =>
  (Math.abs(lat) < 0.5 && Math.abs(lng) < 0.5);

const DUPLICATE_MARKER_RADIUS_METERS = 35;

const buildDisplayRiders = (riders: RiderData[]): DisplayRider[] => {
  const validRiders = riders.filter(
    r => isValidCoord(r.last_lat) && isValidCoord(r.last_lng) && !isBogusCoord(r.last_lat!, r.last_lng!)
  );
  const groups = new Map<string, RiderData[]>();
  validRiders.forEach(rider => {
    const key = `${rider.last_lat!.toFixed(5)},${rider.last_lng!.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) || []), rider]);
  });

  return validRiders.map(rider => {
    const key = `${rider.last_lat!.toFixed(5)},${rider.last_lng!.toFixed(5)}`;
    const group = groups.get(key) || [rider];
    const groupIndex = group.findIndex(item => item.id === rider.id);
    const originalLat = rider.last_lat!;
    const originalLng = rider.last_lng!;
    if (group.length === 1) {
      return { ...rider, displayLat: originalLat, displayLng: originalLng, originalLat, originalLng, stackedCount: 1 };
    }

    const angle = (Math.PI * 2 * groupIndex) / group.length;
    const radius = DUPLICATE_MARKER_RADIUS_METERS + Math.min(group.length, 8) * 4;
    const latOffset = (Math.cos(angle) * radius) / 111_320;
    const lngOffset = (Math.sin(angle) * radius) / (111_320 * Math.max(Math.cos((originalLat * Math.PI) / 180), 0.2));

    return {
      ...rider,
      displayLat: originalLat + latOffset,
      displayLng: originalLng + lngOffset,
      originalLat,
      originalLng,
      stackedCount: group.length,
    };
  });
};

const activeDeliveryStatuses = ['accepted', 'en_route_pickup', 'on_my_way_pickup', 'picked_up', 'in_transit', 'on_my_way_deliver', 'delivering'];

const getRiderLiveStatus = (rider: RiderData) =>
  rider.rider_live_status || (rider.status === 'active' ? 'available' : 'offline');

const getLocationLabel = (rider: RiderData) => {
  if (rider.last_postcode) return rider.last_postcode;
  if (isValidCoord(rider.last_lat) && isValidCoord(rider.last_lng)) return 'GPS shared';
  return 'No location';
};

function FitAllMarkers({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      fitted.current = true;
      return;
    }
    const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    fitted.current = true;
  }, [points.map(p => p.join(',')).join('|')]);

  return null;
}

export default function LiveFleetMap({ riders, onRefresh }: { riders: RiderData[]; onRefresh: () => void }) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeDeliveries, setActiveDeliveries] = useState<Record<string, ActiveDelivery[]>>({});
  const [selectedRider, setSelectedRider] = useState<string | null>(null);

  const ridersWithLocation = buildDisplayRiders(riders);
  // Prefer NG-bounded riders when framing the map so a single stale
  // foreign coord doesn't zoom out to the world.
  const ngRiders = ridersWithLocation.filter(r => isInNigeria(r.originalLat, r.originalLng));
  const framingRiders = ngRiders.length > 0 ? ngRiders : ridersWithLocation;

  const loadActiveDeliveries = async () => {
    const riderIds = riders.map(r => r.id);
    if (riderIds.length === 0) return;
    const { data } = await supabase
      .from('delivery_trackings')
      .select('business_rider_id, customer_name, from_postcode, to_postcode, status')
      .in('business_rider_id', riderIds)
      .in('status', ['pending', ...activeDeliveryStatuses]);
    
    const grouped: Record<string, ActiveDelivery[]> = {};
    (data || []).forEach((d: any) => {
      if (!grouped[d.business_rider_id]) grouped[d.business_rider_id] = [];
      grouped[d.business_rider_id].push(d);
    });
    setActiveDeliveries(grouped);
  };

  useEffect(() => { loadActiveDeliveries(); }, [riders.length]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { onRefresh(); loadActiveDeliveries(); }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  // Realtime: refresh instantly whenever any rider row for this business changes.
  useEffect(() => {
    const riderIds = riders.map(r => r.id);
    if (riderIds.length === 0) return;
    const channel = supabase
      .channel('fleet-live-locations')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'business_riders' },
        (payload) => {
          const rowId = (payload.new as any)?.id;
          if (rowId && riderIds.includes(rowId)) {
            onRefresh();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [riders.map(r => r.id).join(','), onRefresh]);

  const mapCenter: [number, number] = framingRiders.length > 0
    ? [framingRiders[0].displayLat, framingRiders[0].displayLng]
    : [9.06, 7.49]; // Default to Abuja

  const markerPoints: [number, number][] = framingRiders.map(r => [r.displayLat, r.displayLng]);

  const activeCount = riders.filter(r => 
    activeDeliveries[r.id]?.some(d => activeDeliveryStatuses.includes(d.status))
  ).length;

  const getTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Live Fleet Map
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh
          </label>
          <button onClick={() => { onRefresh(); loadActiveDeliveries(); }} className="text-muted-foreground hover:text-primary">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px bg-border">
        <div className="bg-card p-2.5 text-center">
          <p className="text-lg font-bold text-foreground">{riders.length}</p>
          <p className="text-[10px] text-muted-foreground">Linked</p>
        </div>
        <div className="bg-card p-2.5 text-center">
          <p className="text-lg font-bold text-primary">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground">Delivering</p>
        </div>
        <div className="bg-card p-2.5 text-center">
          <p className="text-lg font-bold text-muted-foreground">{ridersWithLocation.length}</p>
          <p className="text-[10px] text-muted-foreground">On map</p>
        </div>
      </div>

      {/* Map */}
      {ridersWithLocation.length > 0 ? (
        <div className="h-[350px] relative">
          <MapContainer center={mapCenter} zoom={11} minZoom={5} scrollWheelZoom={true} zoomControl={true}
            style={{ height: '100%', width: '100%' }} className="z-0">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <FitAllMarkers points={markerPoints} />
            {ridersWithLocation.map(r => {
              const hasDelivery = !!activeDeliveries[r.id]?.some(d => 
                activeDeliveryStatuses.includes(d.status)
              );
              const delivery = activeDeliveries[r.id]?.[0];
              const liveStatus = getRiderLiveStatus(r);
              return (
                <Marker
                  key={r.id}
                  position={[r.displayLat, r.displayLng]}
                  icon={createRiderIcon(liveStatus !== 'offline' && !!r.location_sharing, hasDelivery, r.vehicle_type)}
                  eventHandlers={{ click: () => setSelectedRider(r.id) }}
                >
                  <Popup>
                    <div className="min-w-[160px] space-y-1">
                      <p className="font-bold text-sm">{r.rider_name}</p>
                      <p className="text-xs text-gray-500">{r.rider_phone}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{VEHICLE_EMOJI[r.vehicle_type || 'bike'] || '🚴'} {r.worker_type || 'rider'} · {r.vehicle_type || 'bike'}</p>
                      {r.last_postcode && (
                        <p className="text-xs font-mono text-blue-600">📍 {r.last_postcode}</p>
                      )}
                      {r.stackedCount > 1 && (
                        <p className="text-[10px] text-gray-400">Shared GPS point separated on map</p>
                      )}
                      {r.last_seen && (
                        <p className="text-[10px] text-gray-400">Last seen: {getTimeAgo(r.last_seen)}</p>
                      )}
                      <p className="text-[10px] text-gray-500 capitalize">{liveStatus} · {r.location_sharing ? 'sharing' : 'not sharing'}</p>
                      {delivery && (
                        <div className="mt-1 pt-1 border-t border-gray-200">
                          <p className="text-[10px] font-medium text-blue-600">
                            📦 {delivery.status.replace(/_/g, ' ')} → {delivery.customer_name}
                          </p>
                          <p className="text-[9px] text-gray-400">
                            {delivery.from_postcode && `${delivery.from_postcode} → `}{delivery.to_postcode || ''}
                          </p>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-500">{r.total_deliveries} total deliveries</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      ) : (
        <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
          <Users className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">No riders with GPS data available</p>
          <p className="text-[10px] mt-1">Riders need to share their location from the Rider App</p>
        </div>
      )}

      {/* Rider list below map */}
      <div className="max-h-48 overflow-y-auto border-t border-border divide-y divide-border">
        {riders.map(r => {
          const delivery = activeDeliveries[r.id]?.[0];
          const isActive = delivery && activeDeliveryStatuses.includes(delivery.status);
          const liveStatus = getRiderLiveStatus(r);
          return (
            <div key={r.id} className={`flex items-center justify-between px-3 py-2 hover:bg-secondary/40 transition-colors ${selectedRider === r.id ? 'bg-primary/5' : ''}`}
              onClick={() => setSelectedRider(r.id === selectedRider ? null : r.id)}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? 'bg-blue-500 animate-pulse' : liveStatus !== 'offline' && r.location_sharing ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <div>
                  <p className="text-xs font-medium text-foreground">{r.rider_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {getLocationLabel(r)}
                    {r.last_seen && ` · ${getTimeAgo(r.last_seen)}`}
                    <span className="capitalize"> · {liveStatus}</span>
                    {delivery && <span className="text-primary ml-1">· {delivery.status.replace(/_/g, ' ')}</span>}
                  </p>
                </div>
              </div>
              {isValidCoord(r.last_lat) && isValidCoord(r.last_lng) && (
                <a href={`https://www.google.com/maps?q=${r.last_lat},${r.last_lng}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-primary hover:text-primary/80 flex items-center gap-1 text-[10px] font-medium">
                  <Navigation className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
