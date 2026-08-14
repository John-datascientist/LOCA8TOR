import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LiveDeliveryMap from '@/components/map/LiveDeliveryMap';
import { useRoute } from '@/components/map/useRoute';
import { watchLivePosition } from '@/lib/nativeGeolocation';
import { estimateEtaMin } from '@/lib/vehicleSpeed';

interface Props {
  lat: number;
  lng: number;
  postcode: string;
}

export default function PostcodeNavigationView({ lat, lng, postcode }: Props) {
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const hasPositionRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: rider } = await supabase.from('riders').select('vehicle_type').eq('user_id', u.user.id).maybeSingle();
      setVehicleType(((rider as any)?.vehicle_type as string) || 'bike');
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

  let routeStatusText = 'Calculating route…';
  if (gpsError && !riderPos) {
    routeStatusText = "Couldn't get your location";
  } else if (route) {
    // The free routing service only offers a car profile, so its raw
    // duration is wrong for bikes/motorcycles (rounds short trips to "0
    // min") — estimate ETA from the route's distance and the rider's actual
    // vehicle instead.
    const eta = estimateEtaMin(route.distanceKm, vehicleType);
    const etaText = eta > 0 ? `${eta} min` : '< 1 min';
    routeStatusText = route.isFallback
      ? `~${etaText}${route.distanceKm ? ` · ${route.distanceKm} km (direct path)` : ' (direct path)'}`
      : `${etaText}${route.distanceKm ? ` · ${route.distanceKm} km` : ''}`;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
        <Link to="/search" className="p-2 rounded-md hover:bg-secondary shrink-0"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="min-w-0">
          <p className="font-heading font-bold text-foreground text-sm truncate">Navigate to {postcode}</p>
          <p className="text-[11px] text-muted-foreground">{routeStatusText}</p>
        </div>
      </header>

      <div className="flex-1 relative">
        {riderPos ? (
          <LiveDeliveryMap
            riderLat={riderPos.lat}
            riderLng={riderPos.lng}
            dropoffLat={lat}
            dropoffLng={lng}
            routeCoords={route?.coordinates}
            followRider={true}
            vehicleType={vehicleType}
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
      </div>

      <div className="p-3 border-t border-border bg-card">
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground ring-1 ring-border font-heading font-bold py-3 rounded-lg hover:bg-secondary/70">
          <ExternalLink className="w-4 h-4" /> Open in Google Maps
        </a>
      </div>
    </div>
  );
}
