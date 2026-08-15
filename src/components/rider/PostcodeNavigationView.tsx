import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, ArrowLeft, ExternalLink, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRoute } from '@/components/map/useRoute';
import { watchLivePosition } from '@/lib/nativeGeolocation';
import { estimateEtaMin } from '@/lib/vehicleSpeed';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Props {
  lat: number;
  lng: number;
  postcode: string;
}

type VehicleKey = 'bike' | 'car' | 'bus' | 'truck';
const VEHICLE_OPTIONS: { key: VehicleKey; label: string; emoji: string }[] = [
  { key: 'bike', label: 'Bicycle', emoji: '🚴' },
  { key: 'car', label: 'Motorcycle', emoji: '🏍️' },
  { key: 'bus', label: 'Van', emoji: '🚐' },
  { key: 'truck', label: 'Truck', emoji: '🚚' },
];
const isVehicleKey = (v: string): v is VehicleKey => VEHICLE_OPTIONS.some((o) => o.key === v);

export default function PostcodeNavigationView(props: Props) {
  return (
    <ErrorBoundary>
      <PostcodeNavigationViewInner {...props} />
    </ErrorBoundary>
  );
}

function PostcodeNavigationViewInner({ lat, lng, postcode }: Props) {
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleKey>('bike');
  const [gpsError, setGpsError] = useState(false);
  const hasPositionRef = useRef(false);

  // Default the vehicle picker to the rider's own registered vehicle, but
  // they can still pick a different one for this trip (e.g. a driver who
  // also owns a bike, checking which is faster right now).
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: rider } = await supabase.from('riders').select('vehicle_type').eq('user_id', u.user.id).maybeSingle();
      const vt = String((rider as any)?.vehicle_type || '');
      if (isVehicleKey(vt)) setSelectedVehicle(vt);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;
    (async () => {
      stop = await watchLivePosition(
        (pos) => {
          if (cancelled) return;
          hasPositionRef.current = true;
          setRiderPos(pos);
        },
        () => { if (!cancelled) setGpsError(true); },
      );
    })();
    // Safety net: guard against any path that never calls onPoint or onError.
    const safetyTimeout = setTimeout(() => {
      if (!hasPositionRef.current) setGpsError(true);
    }, 15000);
    return () => {
      cancelled = true;
      stop?.();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const dest = { lat, lng };
  const { route } = useRoute(riderPos, dest);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  // Round the rider's position to ~50m buckets so small GPS jitter doesn't
  // reload the iframe on every tick — only re-center once they've actually
  // moved a meaningful distance.
  const riderLatR = riderPos ? Math.round(riderPos.lat * 2000) / 2000 : null;
  const riderLngR = riderPos ? Math.round(riderPos.lng * 2000) / 2000 : null;

  // OSM's own embeddable map widget (a plain iframe pointed at
  // openstreetmap.org) instead of rendering Leaflet + fetching raw tiles
  // client-side — the latter kept going blank for reasons we couldn't pin
  // down (resize timing, tile CDN, browser compositing) across several
  // fixes. A static iframe has none of that surface area.
  const mapEmbedUrl = useMemo(() => {
    if (riderLatR == null || riderLngR == null) return '';
    const pad = 0.004;
    const minLat = Math.min(riderLatR, lat) - pad;
    const maxLat = Math.max(riderLatR, lat) + pad;
    const minLng = Math.min(riderLngR, lng) - pad;
    const maxLng = Math.max(riderLngR, lng) + pad;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [riderLatR, riderLngR, lat, lng]);

  const copyPostcode = () => {
    navigator.clipboard?.writeText(postcode);
    toast.success('Postcode copied', { description: postcode });
  };

  let routeStatusText = 'Calculating route…';
  if (gpsError && !riderPos) {
    routeStatusText = "Couldn't get your location";
  } else if (route) {
    // The free routing service only offers a car profile, so its raw
    // duration is wrong for bikes/motorcycles (rounds short trips to "0
    // min") — estimate ETA from the route's distance and the chosen
    // vehicle instead.
    const eta = estimateEtaMin(route.distanceKm, selectedVehicle);
    const etaText = eta > 0 ? `${eta} min` : '< 1 min';
    routeStatusText = route.isFallback
      ? `~${etaText}${route.distanceKm ? ` · ${route.distanceKm} km (direct path)` : ' (direct path)'}`
      : `${etaText}${route.distanceKm ? ` · ${route.distanceKm} km` : ''}`;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card z-20 relative">
        <Link to="/search" className="p-2 rounded-md hover:bg-secondary shrink-0"><ArrowLeft className="w-4 h-4" /></Link>
        <button onClick={copyPostcode} className="min-w-0 flex items-center gap-1.5 text-left group">
          <span className="min-w-0">
            <span className="block font-heading font-bold text-foreground text-sm truncate">Navigate to {postcode}</span>
            <span className="block text-[11px] text-muted-foreground">{routeStatusText}</span>
          </span>
          <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </header>

      {/* Map area — fills all remaining space below the header. The sheet
          below floats on TOP of the map as an overlay instead of squeezing
          the map's container. */}
      <div className="flex-1 relative">
        {riderPos ? (
          <iframe
            title="Delivery route map"
            className="w-full h-full border-0"
            src={mapEmbedUrl}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            {gpsError ? (
              <div className="text-center p-6 space-y-2 max-w-xs">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Couldn't get your location. Enable location access in your browser, or use Google Maps below.</p>
              </div>
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            )}
          </div>
        )}

        {/* Bottom sheet — overlays the map, never resizes it */}
        <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] bg-card">
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wide">Choose your ride</p>
          </div>
          <div className="divide-y divide-border">
            {VEHICLE_OPTIONS.map((v) => {
              const eta = route ? estimateEtaMin(route.distanceKm, v.key) : null;
              const active = selectedVehicle === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => setSelectedVehicle(v.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-primary/10' : 'hover:bg-secondary/60'}`}
                >
                  <span className="text-2xl w-9 text-center shrink-0">{v.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-heading font-bold text-foreground">{v.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {eta ? (eta > 0 ? `${eta} min away` : '< 1 min away') : '—'}
                    </span>
                  </span>
                  {active && (
                    <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="p-3">
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
              className="w-full bg-primary text-primary-foreground font-heading font-bold py-3 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              {VEHICLE_OPTIONS.find((v) => v.key === selectedVehicle)?.emoji} Start {VEHICLE_OPTIONS.find((v) => v.key === selectedVehicle)?.label} Trip
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
