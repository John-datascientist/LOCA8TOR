import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, ArrowLeft, ExternalLink, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
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

type VehicleKey = 'bike' | 'car' | 'bus' | 'truck';
const VEHICLE_OPTIONS: { key: VehicleKey; label: string; emoji: string }[] = [
  { key: 'bike', label: 'Bicycle', emoji: '🚴' },
  { key: 'car', label: 'Motorcycle', emoji: '🏍️' },
  { key: 'bus', label: 'Van', emoji: '🚐' },
  { key: 'truck', label: 'Truck', emoji: '🚚' },
];
const isVehicleKey = (v: string): v is VehicleKey => VEHICLE_OPTIONS.some((o) => o.key === v);

export default function PostcodeNavigationView({ lat, lng, postcode }: Props) {
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleKey>('bike');
  const [started, setStarted] = useState(false);
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
      <header className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
        <Link to="/search" className="p-2 rounded-md hover:bg-secondary shrink-0"><ArrowLeft className="w-4 h-4" /></Link>
        <button onClick={copyPostcode} className="min-w-0 flex items-center gap-1.5 text-left group">
          <span className="min-w-0">
            <span className="block font-heading font-bold text-foreground text-sm truncate">Navigate to {postcode}</span>
            <span className="block text-[11px] text-muted-foreground">{routeStatusText}</span>
          </span>
          <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </header>

      <div className={`relative ${started ? 'flex-1' : 'h-[45vh]'}`}>
        {riderPos ? (
          <LiveDeliveryMap
            riderLat={riderPos.lat}
            riderLng={riderPos.lng}
            dropoffLat={lat}
            dropoffLng={lng}
            routeCoords={route?.coordinates}
            followRider={true}
            vehicleType={selectedVehicle}
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

      {!started ? (
        <div className="border-t border-border bg-card">
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
          <div className="p-3 space-y-2">
            <button
              onClick={() => setStarted(true)}
              disabled={!riderPos}
              className="w-full bg-primary text-primary-foreground font-heading font-bold py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {VEHICLE_OPTIONS.find((v) => v.key === selectedVehicle)?.emoji} Start {VEHICLE_OPTIONS.find((v) => v.key === selectedVehicle)?.label} Trip
            </button>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground ring-1 ring-border font-heading font-bold py-2.5 rounded-lg hover:bg-secondary/70">
              <ExternalLink className="w-4 h-4" /> Open in Google Maps
            </a>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-border bg-card space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xl">{VEHICLE_OPTIONS.find((v) => v.key === selectedVehicle)?.emoji}</span>
            <span className="font-heading font-bold text-foreground">
              {VEHICLE_OPTIONS.find((v) => v.key === selectedVehicle)?.label} trip in progress
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStarted(false)}
              className="flex-1 bg-secondary text-foreground ring-1 ring-border font-semibold py-2.5 rounded-lg hover:bg-secondary/70">
              Change vehicle
            </button>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-secondary text-foreground ring-1 ring-border font-heading font-bold py-2.5 rounded-lg hover:bg-secondary/70">
              <ExternalLink className="w-4 h-4" /> Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
