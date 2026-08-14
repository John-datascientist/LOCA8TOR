import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Navigation, MapPin, Clock, CheckCircle, X, Phone, Camera, Compass, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import LiveDeliveryMap from '@/components/map/LiveDeliveryMap';
import { useRoute } from '@/components/map/useRoute';
import { estimateEtaMin } from '@/lib/vehicleSpeed';

function ProofUploadNav({ deliveryId }: { deliveryId: string }) {
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) { toast.error('You must be signed in'); setUploading(false); return; }
    const path = `${uid}/${deliveryId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('delivery-proofs').upload(path, file);
    if (error) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: signed, error: signErr } = await supabase.storage
      .from('delivery-proofs')
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) { toast.error('Failed to generate URL'); setUploading(false); return; }
    const photoUrl = signed.signedUrl;
    await supabase.from('delivery_trackings').update({ proof_photo_url: photoUrl } as any).eq('id', deliveryId);
    setProofUrl(photoUrl);
    toast.success('📸 Proof uploaded!');
    setUploading(false);
  };

  return (
    <label className="cursor-pointer bg-secondary/60 rounded-lg py-2.5 text-center text-sm font-bold text-foreground flex items-center justify-center gap-2">
      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
      {proofUrl ? '✅ Proof Uploaded' : 'Upload Delivery Proof'}
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} disabled={uploading} />
    </label>
  );
}

interface ActiveDelivery {
  id: string;
  share_code: string;
  customer_name: string;
  customer_phone: string | null;
  from_postcode: string | null;
  to_postcode: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  status: string;
}

export default function RiderNavigationView({ riderId }: { riderId: string }) {
  const [delivery, setDelivery] = useState<ActiveDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [hasInAppMap, setHasInAppMap] = useState(false);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [navFullscreen, setNavFullscreen] = useState(false);
  const watchRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  // Find active delivery for this rider
  useEffect(() => {
    const findDelivery = async () => {
      // Find business_rider record linked to this rider
      const { data: br } = await supabase
        .from('business_riders')
        .select('id, business_user_id')
        .eq('linked_rider_id', riderId)
        .limit(1);
      
      if (!br || br.length === 0) { setLoading(false); return; }

      // Check business plan
      const { data: biz } = await supabase
        .from('riders')
        .select('business_size')
        .eq('id', br[0].business_user_id)
        .maybeSingle();
      // In-app map is a Premium-tier feature; Standard riders get the
      // "Open Google Maps" fallback so navigation still works.
      const size = (biz as any)?.business_size as string | null;
      // Also honour an active Premium subscription (fleet_premium), including
      // 7-day trial, since business_size may still be 'small' until an admin
      // updates it after the webhook confirms payment.
      const { data: sub } = await supabase
        .from('business_subscriptions')
        .select('plan_code, status')
        .eq('business_user_id', br[0].business_user_id)
        .in('status', ['active', 'past_due', 'trialing'])
        .maybeSingle();
      const premiumSub = (sub as any)?.plan_code === 'fleet_premium';
      setHasInAppMap(premiumSub || size === 'medium' || size === 'large' || size === 'premium');

      // Vehicle type for marker rendering (bike / car / bus / truck)
      const { data: me } = await supabase
        .from('riders')
        .select('vehicle_type')
        .eq('id', riderId)
        .maybeSingle();
      setVehicleType(((me as any)?.vehicle_type as string) || 'bike');

      const { data } = await supabase
        .from('delivery_trackings')
        .select('*')
        .eq('business_rider_id', br[0].id)
        .in('status', ['pending', 'accepted', 'en_route_pickup', 'on_my_way_pickup', 'picked_up', 'in_transit', 'on_my_way_deliver', 'delivering'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const d = data[0] as ActiveDelivery;
        setDelivery(d);
        // Seed rider position with pickup coords so the OSRM route + map render
        // immediately, before the browser has returned a GPS fix.
        if (d.pickup_lat && d.pickup_lng && !riderPos) {
          setRiderPos({ lat: d.pickup_lat, lng: d.pickup_lng });
        }
      }
      setLoading(false);
    };
    findDelivery();
  }, [riderId]);

  // Continuous GPS tracking with throttled updates
  const updateServerLocation = useCallback(async (lat: number, lng: number) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 3000) return; // Throttle to 3s
    lastUpdateRef.current = now;

    if (!delivery) return;
    await supabase.from('delivery_trackings').update({
      last_lat: lat,
      last_lng: lng,
      updated_at: new Date().toISOString(),
    } as any).eq('id', delivery.id);

    // Also update the linked business rider row via the secure live-location helper.
    await (supabase as any).rpc('update_linked_rider_live_location', {
      _lat: lat,
      _lng: lng,
      _live_status: delivery.status === 'on_my_way_deliver' || delivery.status === 'in_transit' || delivery.status === 'delivering' ? 'delivering' : 'available',
      _sharing: true,
    });
  }, [delivery?.id, riderId]);

  useEffect(() => {
    if (!delivery || !navigator.geolocation) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRiderPos(newPos);
        updateServerLocation(newPos.lat, newPos.lng);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    // Stop tracking as soon as the rider clocks out of their shift.
    const onShiftEnd = () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
    window.addEventListener('loca8tor-shift-ended', onShiftEnd);

    return () => {
      window.removeEventListener('loca8tor-shift-ended', onShiftEnd);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [delivery?.id, updateServerLocation]);

  // Route calculation
  const dropoffPos = delivery?.dropoff_lat && delivery?.dropoff_lng
    ? { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng } : null;
  const { route } = useRoute(riderPos, dropoffPos);

  const updateStatus = async (newStatus: string) => {
    if (!delivery) return;
    setUpdating(true);
    await supabase.from('delivery_trackings').update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...(riderPos ? { last_lat: riderPos.lat, last_lng: riderPos.lng } : {}),
    } as any).eq('id', delivery.id);

    // Sync to rider_delivery_logs so the business "Assign" tab reflects the
    // rider's status change. Match on business_rider_id + customer_name only —
    // postcodes may be null in one table and empty string in the other.
    {
      const { data: br } = await supabase.from('delivery_trackings')
        .select('business_rider_id').eq('id', delivery.id).maybeSingle();
      if (br?.business_rider_id && delivery.customer_name) {
        await supabase.from('rider_delivery_logs')
          .update({ status: newStatus })
          .eq('business_rider_id', br.business_rider_id)
          .eq('customer_name', delivery.customer_name)
          .not('status', 'in', '("delivered","failed")');
      }
    }

    // Update business_riders stats on completion
    if (newStatus === 'delivered' || newStatus === 'failed') {
      // Find business_rider_id from delivery_trackings
      const { data: dtData } = await supabase.from('delivery_trackings')
        .select('business_rider_id')
        .eq('id', delivery.id)
        .maybeSingle();
      if (dtData) {
        const { data: brData } = await supabase.from('business_riders')
          .select('total_deliveries, successful_deliveries, failed_deliveries')
          .eq('id', dtData.business_rider_id)
          .maybeSingle();
        if (brData) {
          const updates: any = newStatus === 'delivered'
            ? {
                successful_deliveries: (brData.successful_deliveries || 0) + 1,
                total_deliveries: ((brData as any).total_deliveries || 0) + 1,
              }
            : {
                failed_deliveries: (brData.failed_deliveries || 0) + 1,
                total_deliveries: ((brData as any).total_deliveries || 0) + 1,
              };
          await supabase.from('business_riders').update(updates).eq('id', dtData.business_rider_id);
        }
      }
      // Trigger rider-referral qualification check on first successful delivery.
      if (newStatus === 'delivered') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          (supabase as any).rpc('check_rider_referral_qualification', {
            _referred_user_id: user.id,
          }).catch(() => {});
        }
      }
      setDelivery(null);
      toast.success(newStatus === 'delivered' ? '✅ Delivery completed!' : '❌ Delivery marked as failed');
    } else {
      setDelivery(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    }
    setUpdating(false);
  };

  if (loading) return null;
  if (!delivery) return null;

  // The free routing service only offers a car profile, so its raw duration
  // is wrong for bikes/motorcycles (rounds short trips down to "0 min") —
  // estimate ETA from the route's distance and the rider's actual vehicle
  // instead of trusting route.durationMin directly.
  const etaMin = route ? estimateEtaMin(route.distanceKm, vehicleType) : null;
  const routeIsFallback = !!route?.isFallback;

  return (
    <div className="bg-card rounded-lg ring-1 ring-border overflow-hidden">
      {/* Map */}
      <div className="h-64 relative">
        {riderPos && hasInAppMap ? (
          <LiveDeliveryMap
            riderLat={riderPos.lat}
            riderLng={riderPos.lng}
            pickupLat={delivery.pickup_lat}
            pickupLng={delivery.pickup_lng}
            dropoffLat={delivery.dropoff_lat}
            dropoffLng={delivery.dropoff_lng}
            routeCoords={route?.coordinates}
            followRider={true}
            vehicleType={vehicleType}
          />
        ) : riderPos ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="text-center space-y-2 p-4">
              <MapPin className="w-8 h-8 text-primary mx-auto" />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.dropoff_lat || delivery.to_postcode || ''},${delivery.dropoff_lng || ''}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold"
              >
                <Navigation className="w-4 h-4" /> Navigate with Google Maps
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* ETA overlay */}
        {etaMin && (
          <div className="absolute top-2 left-2 z-[1000] bg-card/90 backdrop-blur-sm rounded-lg ring-1 ring-border px-3 py-1.5 shadow">
            <p className="text-lg font-heading font-bold text-foreground">{etaMin} min</p>
            {route?.distanceKm ? <p className="text-[10px] text-muted-foreground">{route.distanceKm} km</p> : null}
          </div>
        )}
      </div>

      {/* Delivery info + controls */}
      <div className="p-3 space-y-3">
        {/* Navigation actions */}
        {riderPos && (delivery.dropoff_lat || delivery.to_postcode) && (
          <div className="flex gap-2">
            {hasInAppMap && (
              <button
                onClick={() => setNavFullscreen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-3 py-2.5 rounded-lg text-sm font-heading font-bold"
              >
                <Compass className="w-4 h-4" /> Navigate Your Way
              </button>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.dropoff_lat || delivery.to_postcode || ''}${delivery.dropoff_lng ? ',' + delivery.dropoff_lng : ''}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-secondary text-foreground px-3 py-2.5 rounded-lg text-sm font-heading font-bold ring-1 ring-border"
            >
              <Navigation className="w-4 h-4" /> Google Maps
            </a>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-heading font-bold text-foreground">{delivery.customer_name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{delivery.to_postcode || 'No destination'}</p>
          </div>
          {delivery.customer_phone && (
            <a href={`tel:${delivery.customer_phone}`}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary-foreground" />
            </a>
          )}
        </div>

        {/* Route info */}
        <div className="flex gap-2 text-xs">
          {delivery.from_postcode && (
            <div className="flex-1 bg-secondary/40 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">Pickup</p>
              <p className="font-mono font-bold">{delivery.from_postcode}</p>
            </div>
          )}
          {delivery.to_postcode && (
            <div className="flex-1 bg-secondary/40 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">Drop-off</p>
              <p className="font-mono font-bold">{delivery.to_postcode}</p>
            </div>
          )}
        </div>

        {/* Status update buttons */}
        <div className="flex flex-col gap-2">
          {delivery.status === 'pending' && (
            <button onClick={() => updateStatus('accepted')} disabled={updating}
              className="flex-1 bg-emerald-600 text-white font-heading font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60">
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Accept Delivery
            </button>
          )}
          {delivery.status === 'accepted' && (
            <button onClick={() => updateStatus('en_route_pickup')} disabled={updating}
              className="flex-1 bg-orange-600 text-white font-heading font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60">
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              On My Way to Pick Up
            </button>
          )}
          {delivery.status === 'en_route_pickup' && (
            <button onClick={() => updateStatus('picked_up')} disabled={updating}
              className="flex-1 bg-blue-600 text-white font-heading font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60">
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              I Have Picked Up Delivery
            </button>
          )}
          {delivery.status === 'picked_up' && (
            <button onClick={() => updateStatus('in_transit')} disabled={updating}
              className="flex-1 bg-purple-600 text-white font-heading font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60">
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              On My Way to Deliver
            </button>
          )}
          {delivery.status === 'in_transit' && (
            <>
              <ProofUploadNav deliveryId={delivery.id} />
              <div className="flex gap-2">
                <button onClick={() => updateStatus('delivered')} disabled={updating}
                  className="flex-1 bg-green-600 text-white font-heading font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Delivered
                </button>
                <button onClick={() => updateStatus('failed')} disabled={updating}
                  className="bg-destructive text-destructive-foreground px-4 py-2.5 rounded-lg disabled:opacity-60">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fullscreen in-app navigation overlay (Premium) */}
      {navFullscreen && riderPos && hasInAppMap && (
        <div className="fixed inset-0 z-[2000] bg-background flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border bg-card">
            <div>
              <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" /> Navigate Your Way
              </p>
              <p className="text-[10px] text-muted-foreground">
                {etaMin ? `${etaMin} min` : routeIsFallback ? 'Route unavailable' : 'Calculating...'} {route?.distanceKm ? `· ${route.distanceKm} km` : ''} · to {delivery.to_postcode || 'destination'}
              </p>
            </div>
            <button onClick={() => setNavFullscreen(false)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
          <div className="flex-1 relative">
            <LiveDeliveryMap
              riderLat={riderPos.lat}
              riderLng={riderPos.lng}
              pickupLat={delivery.pickup_lat}
              pickupLng={delivery.pickup_lng}
              dropoffLat={delivery.dropoff_lat}
              dropoffLng={delivery.dropoff_lng}
              routeCoords={route?.coordinates}
              followRider={true}
              vehicleType={vehicleType}
            />
          </div>
        </div>
      )}
    </div>
  );
}
