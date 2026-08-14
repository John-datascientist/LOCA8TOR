import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LiveDeliveryMap from '@/components/map/LiveDeliveryMap';
import { useRoute } from '@/components/map/useRoute';

interface Props {
  lat: number;
  lng: number;
  postcode: string;
}

export default function PostcodeNavigationView({ lat, lng, postcode }: Props) {
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const watchRef = useRef<number | null>(null);
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
    if (!navigator.geolocation) { setGpsError(true); return; }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        hasPositionRef.current = true;
        setRiderPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    // Safety net: some browsers never fire watchPosition's error callback
    // while a permission prompt sits unanswered — don't leave the page
    // spinning forever waiting on a fix that may never come.
    const safetyTimeout = setTimeout(() => {
      if (!hasPositionRef.current) setGpsError(true);
    }, 15000);
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      clearTimeout(safetyTimeout);
    };
  }, []);

  const dest = { lat, lng };
  const { route } = useRoute(riderPos, dest);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  let routeStatusText = 'Calculating route…';
  if (route?.isFallback) {
    routeStatusText = 'Live route unavailable — showing direct path';
  } else if (route) {
    routeStatusText = `${route.durationMin} min${route.distanceKm ? ` · ${route.distanceKm} km` : ''}`;
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
