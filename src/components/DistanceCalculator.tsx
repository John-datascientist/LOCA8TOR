import { useState, useCallback } from 'react';
import { ArrowRight, Navigation, Loader2, MapPin, Clock, Route } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LiveDeliveryMap from '@/components/map/LiveDeliveryMap';
import { useRoute } from '@/components/map/useRoute';

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizePostcode(input: string): string {
  const raw = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length < 4) return raw;
  return `${raw.slice(0, -3)} ${raw.slice(-3)}`;
}

async function lookupPostcode(code: string): Promise<{ lat: number; lng: number; address?: string } | null> {
  const normalized = normalizePostcode(code);
  if (!normalized) return null;
  const { data } = await supabase
    .from('postcodes')
    .select('postcode, address, lat, lng, created_at')
    .ilike('postcode', normalized)
    .order('created_at', { ascending: true })
    .limit(1);
  if (data && data.length > 0) {
    return { lat: data[0].lat, lng: data[0].lng, address: data[0].address || undefined };
  }
  return null;
}

interface DistanceCalculatorProps {
  currentLat?: number;
  currentLng?: number;
  planTier?: 'standard' | 'premium';
}

export default function DistanceCalculator({ currentLat, currentLng, planTier = 'standard' }: DistanceCalculatorProps) {
  const [fromMode, setFromMode] = useState<'manual' | 'location'>('manual');
  const [fromPostcode, setFromPostcode] = useState('');
  const [toPostcode, setToPostcode] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [fromResolved, setFromResolved] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [toResolved, setToResolved] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(
    currentLat && currentLng ? { lat: currentLat, lng: currentLng } : null
  );

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFromMode('location');
        setLocating(false);
        setDistance(null);
      },
      () => {
        setError('Could not get your location');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const calculate = useCallback(async () => {
    setLoading(true);
    setError('');
    setDistance(null);

    let fromCoords: { lat: number; lng: number } | null = null;
    let toCoords: { lat: number; lng: number; address?: string } | null = null;

    if (fromMode === 'location') {
      if (!myLocation) {
        setError('Please get your location first');
        setLoading(false);
        return;
      }
      fromCoords = myLocation;
      setFromResolved({ ...myLocation, address: 'Your current location' });
    } else {
      if (!fromPostcode.trim()) {
        setError('Enter a FROM postcode');
        setLoading(false);
        return;
      }
      const result = await lookupPostcode(fromPostcode);
      if (!result) {
        setError(`Postcode "${fromPostcode}" not found. Generate it first.`);
        setLoading(false);
        return;
      }
      fromCoords = result;
      setFromResolved(result);
    }

    if (!toPostcode.trim()) {
      setError('Enter a TO postcode');
      setLoading(false);
      return;
    }
    toCoords = await lookupPostcode(toPostcode);
    if (!toCoords) {
      setError(`Postcode "${toPostcode}" not found. Generate it first.`);
      setLoading(false);
      return;
    }
    setToResolved(toCoords);

    const dist = haversineDistance(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
    setDistance(dist);
    setLoading(false);
  }, [fromMode, fromPostcode, toPostcode, myLocation]);

  const estimatedTime = distance !== null ? Math.max(1, Math.round(distance * 2.5)) : null; // ~24km/h avg

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Route className="w-4 h-4 text-primary" />
        <p className="text-sm font-heading font-bold text-foreground">Distance Calculator</p>
      </div>

      {/* FROM */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">FROM</label>
          <div className="flex gap-1">
            <button
              onClick={() => { setFromMode('manual'); setDistance(null); }}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${fromMode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              Postcode
            </button>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors flex items-center gap-1 ${fromMode === 'location' && myLocation ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              {locating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Navigation className="w-2.5 h-2.5" />}
              My Location
            </button>
          </div>
        </div>
        {fromMode === 'manual' ? (
          <input
            type="text"
            value={fromPostcode}
            onChange={e => {
              setFromPostcode(normalizePostcode(e.target.value));
              setDistance(null);
            }}
            placeholder="Enter postcode e.g. LG3 5AK"
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-secondary/60 text-xs">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="text-foreground">
              {myLocation ? `${myLocation.lat.toFixed(4)}°N, ${myLocation.lng.toFixed(4)}°E` : 'Getting location…'}
            </span>
          </div>
        )}
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
          <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90" />
        </div>
      </div>

      {/* TO */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">TO</label>
        <input
          type="text"
          value={toPostcode}
          onChange={e => {
            setToPostcode(normalizePostcode(e.target.value));
            setDistance(null);
          }}
          placeholder="Enter customer postcode e.g. AB2 7XY"
          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        onClick={calculate}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground text-xs font-heading font-semibold py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Route className="w-3.5 h-3.5" />}
        Calculate Distance
      </button>

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}

      {distance !== null && (
        <div className="bg-secondary/60 rounded-lg p-4 space-y-3 animate-fade-up">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-2xl font-heading font-bold text-primary">
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </p>
              <p className="text-[10px] text-muted-foreground">Distance</p>
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {estimatedTime}min
              </p>
              <p className="text-[10px] text-muted-foreground">Est. ride time</p>
            </div>
          </div>

          {fromResolved && toResolved && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <div className="flex items-start gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-muted-foreground">{fromResolved.address || 'Your location'}</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                <span className="text-muted-foreground">{toResolved.address || toPostcode}</span>
              </div>
            </div>
          )}

          {fromResolved && toResolved && (
            planTier === 'premium' ? (
              <InAppRoutePreview from={fromResolved} to={toResolved} />
            ) : (
              <a
                href={`https://www.google.com/maps/dir/${fromResolved.lat},${fromResolved.lng}/${toResolved.lat},${toResolved.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-card ring-1 ring-border text-foreground text-xs font-heading font-semibold py-2 rounded-lg hover:ring-primary/40 transition-all active:scale-[0.97]"
              >
                <Navigation className="w-3.5 h-3.5 text-primary" /> Open in Google Maps
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}

function InAppRoutePreview({
  from,
  to,
}: {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}) {
  const { route, loading } = useRoute(from, to);
  return (
    <div className="rounded-lg overflow-hidden ring-1 ring-border">
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/60">
        <p className="text-[11px] font-heading font-bold text-foreground flex items-center gap-1.5">
          <Navigation className="w-3 h-3 text-primary" /> In-app navigation
        </p>
        {route && (
          <p className="text-[10px] text-muted-foreground">
            {route.distanceKm} km · {route.durationMin} min
          </p>
        )}
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="h-[280px] relative">
        <LiveDeliveryMap
          riderLat={from.lat}
          riderLng={from.lng}
          pickupLat={from.lat}
          pickupLng={from.lng}
          dropoffLat={to.lat}
          dropoffLng={to.lng}
          routeCoords={route?.coordinates}
          followRider={false}
        />
      </div>
    </div>
  );
}
