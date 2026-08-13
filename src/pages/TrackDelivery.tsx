import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Package, MapPin, Phone, User, Clock, CheckCircle, XCircle, Truck, Loader2, Navigation, Wifi, WifiOff } from 'lucide-react';
import LiveDeliveryMap from '@/components/map/LiveDeliveryMap';
import { useRoute } from '@/components/map/useRoute';
import RatingTipForm from '@/components/track/RatingTipForm';
import TrackingLookup from '@/components/TrackingLookup';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; step: number }> = {
  pending: { label: 'Order Placed', color: 'text-yellow-600', icon: <Clock className="w-4 h-4" />, step: 1 },
  assigned: { label: 'Rider Assigned', color: 'text-yellow-600', icon: <User className="w-4 h-4" />, step: 1 },
  accepted: { label: 'Rider Accepted', color: 'text-emerald-600', icon: <CheckCircle className="w-4 h-4" />, step: 1 },
  en_route_pickup: { label: 'On the way to pickup', color: 'text-orange-600', icon: <Navigation className="w-4 h-4" />, step: 1 },
  on_my_way_pickup: { label: 'On the way to pickup', color: 'text-orange-600', icon: <Navigation className="w-4 h-4" />, step: 1 },
  picked_up: { label: 'Picked Up', color: 'text-blue-600', icon: <Package className="w-4 h-4" />, step: 2 },
  on_my_way_deliver: { label: 'Out for Delivery', color: 'text-primary', icon: <Truck className="w-4 h-4" />, step: 3 },
  delivering: { label: 'Out for Delivery', color: 'text-primary', icon: <Truck className="w-4 h-4" />, step: 3 },
  in_transit: { label: 'Out for Delivery', color: 'text-primary', icon: <Truck className="w-4 h-4" />, step: 3 },
  delivered: { label: 'Delivered', color: 'text-green-600', icon: <CheckCircle className="w-4 h-4" />, step: 4 },
  failed: { label: 'Failed', color: 'text-destructive', icon: <XCircle className="w-4 h-4" />, step: 0 },
};

const STEPS = ['Order Placed', 'Picked Up', 'In Transit', 'Delivered'];

const TIMELINE_STEPS: { key: string; label: string; tsField: string; matches: (s: string) => boolean }[] = [
  { key: 'pending', label: 'Order placed', tsField: 'created_at', matches: () => true },
  { key: 'assigned', label: 'Rider assigned', tsField: 'updated_at', matches: (s) => !!s && s !== 'pending' },
  { key: 'picked_up', label: 'Picked up', tsField: 'updated_at', matches: (s) => ['picked_up','in_transit','on_my_way_deliver','delivering','delivered'].includes(s) },
  { key: 'in_transit', label: 'Out for delivery', tsField: 'updated_at', matches: (s) => ['in_transit','on_my_way_deliver','delivering','delivered'].includes(s) },
  { key: 'delivered', label: 'Delivered', tsField: 'cod_collected_at', matches: (s) => s === 'delivered' },
];

export default function TrackDelivery() {
  const { code } = useParams<{ code: string }>();
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [connected, setConnected] = useState(true);
  const [hasInAppMap, setHasInAppMap] = useState(false);
  const [branding, setBranding] = useState<any>(null);
  const [hasRated, setHasRated] = useState(false);
  const channelRef = useRef<any>(null);

  const loadTracking = async () => {
    if (!code) { setLoading(false); return; }
    const { data: rows, error } = await (supabase as any).rpc('get_delivery_by_share_code', { _code: code });
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setTracking(data);

    // Check if business has premium/pro plan for in-app map
    const { data: rider } = await supabase
      .from('riders')
      .select('business_size')
      .eq('id', data.business_user_id)
      .maybeSingle();
    setHasInAppMap(true); // Free for all during testing phase

    // Load branding (logo, colors, tip/rating toggles). Branding is no longer
    // bulk-readable by the public — customers only get the branding attached to
    // the delivery their share code points at.
    const { data: brandRows } = await (supabase as any).rpc('get_branding_by_share_code', {
      _share_code: data.share_code,
    });
    setBranding(Array.isArray(brandRows) ? brandRows[0] ?? null : brandRows);

    // Already rated? Public reads on delivery_ratings are locked down; use the
    // share-code-scoped RPC so we only learn whether *this* delivery is rated.
    const { data: existing } = await (supabase as any).rpc('get_rating_by_share_code', {
      _share_code: data.share_code,
    });
    const existingRow = Array.isArray(existing) ? existing[0] : existing;
    setHasRated(!!existingRow);

    setLoading(false);
  };

  useEffect(() => { loadTracking(); }, [code]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tracking?.id) return;

    channelRef.current = supabase
      .channel(`tracking-${tracking.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'delivery_trackings',
        filter: `id=eq.${tracking.id}`,
      }, (payload) => {
        setTracking((prev: any) => ({ ...prev, ...payload.new }));
        setConnected(true);
      })
      .subscribe((status: string) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [tracking?.id]);

  // Fallback polling every 30s
  useEffect(() => {
    if (notFound || !code) return;
    const interval = setInterval(loadTracking, 30000);
    return () => clearInterval(interval);
  }, [code, notFound]);

  // Route calculation
  const riderPos = tracking?.last_lat && tracking?.last_lng
    ? { lat: tracking.last_lat, lng: tracking.last_lng } : null;
  const dropoffPos = tracking?.dropoff_lat && tracking?.dropoff_lng
    ? { lat: tracking.dropoff_lat, lng: tracking.dropoff_lng } : null;
  const { route } = useRoute(riderPos, dropoffPos);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading delivery info...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl ring-1 ring-border p-8 max-w-sm w-full text-center space-y-4">
          <Package className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-heading font-bold text-foreground">Delivery Not Found</h1>
          <p className="text-sm text-muted-foreground">This tracking link is invalid or has expired.</p>
          <a href="/" className="inline-block text-sm text-primary font-medium hover:underline">← Go to Loca8tor</a>
        </div>
      </div>
    );
  }

  if (!code || !tracking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <TrackingLookup />
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[tracking.status] || STATUS_CONFIG.pending;
  const currentStep = status.step;
  const hasRiderLocation = tracking.last_lat && tracking.last_lng;
  const etaMin = route?.durationMin || tracking.eta_minutes || null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Brand header strip */}
      {branding && (branding.logo_url || branding.brand_name) && (
        <div
          className="px-4 py-2 flex items-center gap-2 border-b border-border"
          style={{ background: branding.brand_color ? `${branding.brand_color}15` : undefined }}
        >
          {branding.logo_url && (
            <img src={branding.logo_url} alt="" className="w-7 h-7 rounded object-contain" />
          )}
          <p className="text-sm font-heading font-bold">{branding.brand_name || 'Delivery'}</p>
        </div>
      )}
      {/* Map - takes up most of the screen */}
      <div className="flex-1 relative" style={{ minHeight: '55vh' }}>
        {hasRiderLocation && hasInAppMap ? (
          <LiveDeliveryMap
            riderLat={tracking.last_lat}
            riderLng={tracking.last_lng}
            pickupLat={tracking.pickup_lat}
            pickupLng={tracking.pickup_lng}
            dropoffLat={tracking.dropoff_lat}
            dropoffLng={tracking.dropoff_lng}
            routeCoords={route?.coordinates}
            followRider={true}
          />
        ) : hasRiderLocation ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="text-center space-y-3 p-6">
              <MapPin className="w-10 h-10 text-primary mx-auto" />
              <p className="text-sm font-heading font-bold text-foreground">Rider is at: {tracking.last_postcode || 'Unknown'}</p>
              <a
                href={`https://www.google.com/maps?q=${tracking.last_lat},${tracking.last_lng}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold shadow-md"
              >
                <Navigation className="w-4 h-4" /> View on Google Maps
              </a>
              <p className="text-[10px] text-muted-foreground">Upgrade to Premium or Pro for in-app live map tracking</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="text-center space-y-2">
              <Navigation className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Waiting for rider location...</p>
            </div>
          </div>
        )}

        {/* Connection status overlay */}
        <div className="absolute top-3 right-3 z-[1000]">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${connected ? 'bg-green-500/20 text-green-700' : 'bg-destructive/20 text-destructive'}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? 'Live' : 'Reconnecting...'}
          </div>
        </div>

        {/* ETA overlay */}
        {etaMin && currentStep >= 2 && currentStep < 4 && (
          <div className="absolute top-3 left-3 z-[1000] bg-card/90 backdrop-blur-sm rounded-xl ring-1 ring-border px-4 py-2 shadow-lg">
            <p className="text-[10px] text-muted-foreground">Estimated Arrival</p>
            <p className="text-xl font-heading font-bold text-foreground">{etaMin} min</p>
            {route?.distanceKm ? <p className="text-[10px] text-muted-foreground">{route.distanceKm} km away</p> : null}
          </div>
        )}
      </div>

      {/* Bottom info card */}
      <div className="bg-card border-t border-border rounded-t-2xl -mt-4 relative z-[1000] p-4 space-y-3 max-h-[45vh] overflow-y-auto">
        {/* Status + progress */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${status.color}`}>
            {status.icon}
            <span className="font-heading font-bold text-sm">{status.label}</span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">{tracking.share_code}</p>
        </div>

        {/* Mini progress bar */}
        {currentStep > 0 && (
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i + 1 <= currentStep ? 'bg-primary' : 'bg-secondary'}`} />
            ))}
          </div>
        )}

        {/* Status timeline */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-wide">Status timeline</p>
          {tracking.status === 'failed' ? (
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                <XCircle className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-destructive">Delivery failed</p>
                {tracking.failure_reason && (
                  <p className="text-[11px] text-muted-foreground">{tracking.failure_reason}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(tracking.updated_at || tracking.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            TIMELINE_STEPS.map((step, idx) => {
              const reached = step.matches(tracking.status);
              const ts = (tracking as any)[step.tsField];
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${reached ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {reached ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                    {reached && ts && (
                      <p className="text-[10px] text-muted-foreground">{new Date(ts).toLocaleString()}</p>
                    )}
                  </div>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div className="w-px h-4 bg-border absolute" style={{ display: 'none' }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rider info */}
        {tracking.rider_name && (
          <div className="flex items-center gap-3 bg-secondary/40 rounded-xl p-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading font-bold text-foreground">{tracking.rider_name}</p>
              <p className="text-[10px] text-muted-foreground">Your delivery rider</p>
            </div>
            {tracking.rider_phone && (
              <a href={`tel:${tracking.rider_phone}`}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-primary-foreground" />
              </a>
            )}
          </div>
        )}

        {/* Delivery details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {tracking.from_postcode && (
            <div className="bg-secondary/30 rounded-lg p-2.5">
              <p className="text-muted-foreground text-[10px]">From</p>
              <p className="font-mono font-bold text-foreground">{tracking.from_postcode}</p>
            </div>
          )}
          {tracking.to_postcode && (
            <div className="bg-secondary/30 rounded-lg p-2.5">
              <p className="text-muted-foreground text-[10px]">To</p>
              <p className="font-mono font-bold text-foreground">{tracking.to_postcode}</p>
            </div>
          )}
        </div>

        {tracking.last_postcode && (
          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            Rider last seen at: <span className="font-mono font-bold text-primary">{tracking.last_postcode}</span>
          </p>
        )}

        <div className="text-center pt-1">
          {tracking.status === 'delivered' && !hasRated && (
            <div className="pb-3">
              <RatingTipForm tracking={tracking} branding={branding} onSubmitted={() => setHasRated(true)} />
            </div>
          )}
          <a href="/" className="text-[10px] text-primary font-medium hover:underline">
            Powered by {branding?.brand_name || 'Loca8tor'}
          </a>
          {branding?.tagline && (
            <p className="text-[10px] text-muted-foreground italic">{branding.tagline}</p>
          )}
          {(branding?.support_phone || branding?.support_email) && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Support: {branding.support_phone && <a href={`tel:${branding.support_phone}`} className="text-primary">{branding.support_phone}</a>}
              {branding.support_phone && branding.support_email && ' • '}
              {branding.support_email && <a href={`mailto:${branding.support_email}`} className="text-primary">{branding.support_email}</a>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
