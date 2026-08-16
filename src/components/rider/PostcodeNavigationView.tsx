import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, ArrowLeft, ExternalLink, Check, Copy, Navigation2, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import LiveDeliveryMap from '@/components/map/LiveDeliveryMap';
import { useRoute } from '@/components/map/useRoute';
import { watchLivePosition } from '@/lib/nativeGeolocation';
import { estimateEtaMin } from '@/lib/vehicleSpeed';
import { distanceToPolylineM } from '@/lib/routeGeometry';
import { speak, stopSpeaking, isSpeechSupported } from '@/lib/speech';
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

// A rider is considered off-route once they're this far (meters) from the
// nearest point on the planned line. useRoute already re-fetches a fresh
// route from wherever the rider currently is whenever they move more than
// ~50m, so a genuine deviation self-corrects on its own within one GPS
// update — this flag exists purely to tell the rider that's happening,
// rather than leaving them wondering why the route line just jumped.
const OFF_ROUTE_THRESHOLD_M = 60;

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

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
  const [started, setStarted] = useState(false);
  const [gpsError, setGpsError] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const hasPositionRef = useRef(false);
  const lastSpokenInstructionRef = useRef<string | null>(null);
  const wasOffRouteRef = useRef(false);

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

  const offRoute = useMemo(() => {
    if (!riderPos || !route || route.isFallback || route.coordinates.length < 2) return false;
    return distanceToPolylineM(riderPos, route.coordinates) > OFF_ROUTE_THRESHOLD_M;
  }, [riderPos, route]);

  // route.steps[0] is normally a "depart" maneuver, not an actual turn — the
  // instruction actually useful to show right now is the one at the end of
  // that first leg (steps[1]), with steps[0]'s distance telling the rider
  // how far until they need to do it. Because useRoute always fetches from
  // the rider's *current* position, this naturally stays "the next thing to
  // do from here" as they move — no separate step-advancement tracking
  // needed.
  const steps = route?.steps ?? [];
  const nextStepIndex = steps.length > 1 ? 1 : 0;
  const nextStep = steps[nextStepIndex] ?? null;
  const distanceToNextM = steps[nextStepIndex - 1]?.distanceM ?? nextStep?.distanceM ?? null;

  // Speak each new instruction once, the moment it becomes the "next" one —
  // not on every re-render, and not repeated for the same instruction as
  // the rider continues toward it.
  useEffect(() => {
    if (!started || !voiceEnabled || !nextStep) return;
    if (nextStep.instruction === lastSpokenInstructionRef.current) return;
    lastSpokenInstructionRef.current = nextStep.instruction;
    const text = distanceToNextM != null
      ? `In ${formatDistance(distanceToNextM)}, ${nextStep.instruction.toLowerCase()}`
      : nextStep.instruction;
    speak(text);
  }, [started, voiceEnabled, nextStep?.instruction, distanceToNextM]);

  // Announce the off-route state once when it's first detected, not on
  // every subsequent render while it stays true.
  useEffect(() => {
    if (!started || !voiceEnabled) return;
    if (offRoute && !wasOffRouteRef.current) {
      speak('You are off route. Recalculating.');
    }
    wasOffRouteRef.current = offRoute;
  }, [started, voiceEnabled, offRoute]);

  // Reset voice state and stop talking as soon as the trip ends.
  useEffect(() => {
    if (started) return;
    lastSpokenInstructionRef.current = null;
    wasOffRouteRef.current = false;
    stopSpeaking();
  }, [started]);

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

  const activeVehicle = VEHICLE_OPTIONS.find((v) => v.key === selectedVehicle);

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
      <div className="flex-1 relative min-h-[400px]">
        {riderPos ? (
          <LiveDeliveryMap
            riderLat={riderPos.lat}
            riderLng={riderPos.lng}
            dropoffLat={lat}
            dropoffLng={lng}
            routeCoords={route?.coordinates}
            followRider={true}
            vehicleType={selectedVehicle}
            navigationMode={started}
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

        {/* Turn-by-turn instruction banner — only while a trip is active */}
        {started && riderPos && (
          <div className="absolute top-3 left-3 right-3 z-10 space-y-2">
            {offRoute && (
              <div className="flex items-center gap-2 bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Off route — recalculating…
              </div>
            )}
            <div className="bg-card/95 backdrop-blur-sm ring-1 ring-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Navigation2 className="w-4.5 h-4.5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-heading font-bold text-foreground truncate">
                  {nextStep ? nextStep.instruction : route?.isFallback ? 'Head toward your destination' : 'Calculating next turn…'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {distanceToNextM != null ? `${formatDistance(distanceToNextM)} · ` : ''}
                  {routeStatusText}
                </p>
              </div>
              {isSpeechSupported() && (
                <button
                  onClick={() => setVoiceEnabled((v) => {
                    if (v) stopSpeaking();
                    return !v;
                  })}
                  aria-label={voiceEnabled ? 'Mute voice guidance' : 'Unmute voice guidance'}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0"
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4 text-foreground" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom sheet — overlays the map, never resizes it */}
        <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] bg-card">
          {!started ? (
            <>
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
                  {activeVehicle?.emoji} Start {activeVehicle?.label} Trip
                </button>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground ring-1 ring-border font-heading font-bold py-2.5 rounded-lg hover:bg-secondary/70">
                  <ExternalLink className="w-4 h-4" /> Open in Google Maps
                </a>
              </div>
            </>
          ) : (
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xl">{activeVehicle?.emoji}</span>
                <span className="font-heading font-bold text-foreground">
                  {activeVehicle?.label} trip in progress
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStarted(false)}
                  className="flex-1 bg-secondary text-foreground ring-1 ring-border font-semibold py-2.5 rounded-lg hover:bg-secondary/70">
                  Change vehicle
                </button>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary text-foreground ring-1 ring-border font-heading font-bold py-2.5 rounded-lg hover:bg-secondary/70">
                  <ExternalLink className="w-4 h-4" /> Open in Google Maps
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
