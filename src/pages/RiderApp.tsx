import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Loader2, Camera, Upload, CheckCircle, Gift, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MapView from '@/components/MapView';
import { toast } from 'sonner';
import { useRiderNotifications, NotificationBanner } from '@/components/rider/RiderNotifications';
import ReferralDashboard from '@/components/rider/ReferralDashboard';
import DistanceCalculator from '@/components/DistanceCalculator';
import { ProofImage } from '@/components/ProofImage';
import DeliveryActions from '@/components/rider/DeliveryActions';
import ShiftTracker from '@/components/rider/ShiftTracker';
import EarningsTracker from '@/components/rider/EarningsTracker';
import RouteHistory from '@/components/rider/RouteHistory';
import RiderNavigationView from '@/components/rider/RiderNavigationView';
import RiderMessagesPanel from '@/components/rider/RiderMessagesPanel';
import SoloDeliveries from '@/components/rider/SoloDeliveries';
import InvoiceGenerator from '@/components/business/InvoiceGenerator';
import SubscribeModal from '@/components/SubscribeModal';
import { captureProofPhoto } from '@/lib/nativeCamera';
import { startBackgroundTracking, stopBackgroundTracking } from '@/lib/nativeBackgroundGps';
import { registerPushNotifications, attachPushHandlers } from '@/lib/nativePush';
import { isNative } from '@/lib/native';
import SEO from '@/components/SEO';
import { useUserAccess } from '@/hooks/useUserAccess';

type RiderStatus = 'available' | 'delivering' | 'offline';

const isValidCoord = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const DELIVERY_STATUSES = [
  { value: 'accepted', label: '✅ Accepted' },
  { value: 'on_my_way_pickup', label: '🏃 On My Way to Pick Up' },
  { value: 'picked_up', label: '📦 Picked Up' },
  { value: 'on_my_way_deliver', label: '🚴 On My Way to Deliver' },
  { value: 'delivered', label: '✅ Delivered' },
  { value: 'failed', label: '❌ Failed' },
];

// Solo Rider / Driver plan pricing — mirrors debit_wallet_for_subscription().
const SOLO_CYCLES = [
  { cycle: 'monthly' as const, label: '1 month', amount: 2500 },
  { cycle: 'quarterly' as const, label: '3 months', amount: 7275, save: 'Save 3%' },
  { cycle: 'biannual' as const, label: '6 months', amount: 14250, save: 'Save 5%' },
  { cycle: 'annual' as const, label: '1 year', amount: 25500, save: 'Save 15%' },
];

export default function RiderApp() {
  const { isSuperAdmin } = useUserAccess();
  const [user, setUser] = useState<any>(null);
  const [rider, setRider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [linkGate, setLinkGate] = useState<{ needsLink: boolean; canSkip: boolean } | null>(null);
  const [businessCode, setBusinessCode] = useState('');
  const [linkingError, setLinkingError] = useState('');
  const [linking, setLinking] = useState(false);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<any[]>([]);
  const [businessRiderId, setBusinessRiderId] = useState<string | null>(null);
  const [businessUserId, setBusinessUserId] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<'standard' | 'premium'>('standard');
  const [status, setStatus] = useState<RiderStatus>('available');
  const [isSharing, setIsSharing] = useState(true);
  const [position, setPosition] = useState<[number, number]>([9.082, 8.675]);
  const [lastUpdate, setLastUpdate] = useState('');
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showReferrals, setShowReferrals] = useState(false);
  const [soloSubActive, setSoloSubActive] = useState<boolean | null>(null);
  const [soloCycle, setSoloCycle] = useState<'monthly' | 'quarterly' | 'biannual' | 'annual'>('monthly');
  const [showSoloCheckout, setShowSoloCheckout] = useState(false);
  const watchRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<RiderStatus>('available');
  const navigate = useNavigate();

  // Browser push notifications
  useRiderNotifications(deliveries, notificationsEnabled);

  useEffect(() => {
    loadRiderData();
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      void stopBackgroundTracking();
    };
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Poll for new deliveries every 10s
  useEffect(() => {
    if (!rider) return;
    const poll = setInterval(() => loadDeliveries(rider.id), 10000);
    return () => clearInterval(poll);
  }, [rider?.id]);

  const loadRiderData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { navigate('/login'); return; }
    setUser(authUser);

    const { data: riderData } = await supabase.from('riders')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!riderData) { navigate('/signup?type=rider'); return; }
    setRider(riderData);
    const isJohnSuperAdmin = String(authUser.email || '').toLowerCase() === 'johnspeaksuwangue@gmail.com' || isSuperAdmin;

    // Check whether this rider is already linked to a business; if not, show the join gate.
    // Riders created before the 2026-05-31 cutoff are grandfathered and can skip.
    const { data: linkRows } = await supabase.from('business_riders')
      .select('id, business_user_id, last_lat, last_lng, last_seen, rider_live_status, location_sharing')
      .eq('linked_rider_id', riderData.id)
      .order('created_at', { ascending: false });
    // Solo riders own a "self fleet" row (business_user_id === their own rider id)
    // so their tracking links have an owner — that must NOT count as being
    // linked to a company.
    const allLinks = (linkRows as any[]) || [];
    const hasSelfFleetRow = allLinks.some(r => r.business_user_id === riderData.id);
    const link = allLinks.find(r => r.business_user_id !== riderData.id) || null;
    if (!link) {
      // Independent riders chose "no company" at signup — they go straight to
      // their solo dashboard (distance calculator etc.) and can link a business
      // later from the dashboard card.
      const metaMode = String(authUser?.user_metadata?.rider_mode || '').toLowerCase();
      const isIndependent = (riderData as any).rider_mode === 'individual' || metaMode === 'individual' || hasSelfFleetRow;
      if (isIndependent) {
        setLinkGate({ needsLink: false, canSkip: true });
        // Seed position so the distance calculator's "My Location" starts from
        // the rider's real coordinates rather than the Nigeria-centre default.
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
            () => {},
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      } else {
        const grandfathered = new Date(riderData.created_at) < new Date('2026-05-31T00:00:00Z');
        setLinkGate({ needsLink: !isJohnSuperAdmin, canSkip: grandfathered || isJohnSuperAdmin });
        await loadPendingRequests(riderData.id);
        // Auto-send join request if the rider signed up with a business code
        // but no request/link exists yet (e.g. metadata was not consumed during
        // profile creation, or the code was validated but never queued).
        await autoRequestFromMetadata(authUser, riderData.id);
      }
    } else {
      setLinkGate({ needsLink: false, canSkip: true });
      setBusinessRiderId(link.id);
      setBusinessUserId(link.business_user_id);
      // Default rider status is always "available" — never persist offline as the
      // resumed state. Only keep an in-progress "delivering" status across reloads.
      const savedStatus = (link as any).rider_live_status as RiderStatus | null;
      const resumed: RiderStatus = savedStatus === 'delivering' ? 'delivering' : 'available';
      statusRef.current = resumed;
      setStatus(resumed);
      if (isValidCoord((link as any).last_lat) && isValidCoord((link as any).last_lng)) {
        setPosition([(link as any).last_lat, (link as any).last_lng]);
        if ((link as any).last_seen) setLastUpdate(new Date((link as any).last_seen).toLocaleTimeString());
      }
      // Location sharing is always ON for linked riders — start streaming immediately
      // and push the live state so the business dashboard sees them as available.
      setIsSharing(true);
      startLocationStream();
      void pushLiveState({ nextStatus: resumed, sharing: true });
      // Read the linked business's subscription tier so the rider dashboard
      // exposes exactly the features their business has paid for.
      const { data: biz } = await supabase.from('riders')
        .select('business_size')
        .eq('id', link.business_user_id)
        .maybeSingle();
      const size = (biz as any)?.business_size as string | null;
      const { data: sub } = await supabase.from('business_subscriptions')
        .select('plan_code, status')
        .eq('business_user_id', link.business_user_id)
        .in('status', ['active', 'past_due', 'trialing'])
        .maybeSingle();
      const premiumSub = (sub as any)?.plan_code === 'fleet_premium';
      const premium = premiumSub || size === 'medium' || size === 'large' || size === 'premium';
      setPlanTier(premium ? 'premium' : 'standard');
    }

    await loadDeliveries(riderData.id);
    setLoading(false);

    // Register native push notifications (no-op on web)
    if (isNative()) {
      void registerPushNotifications(riderData.id);
      void attachPushHandlers((title, body) => toast(title, { description: body }));
    }
  };

  const handleLinkBusiness = async () => {
    const code = businessCode.trim().toUpperCase();
    if (!code) { setLinkingError('Enter a business code'); return; }
    setLinking(true);
    setLinkingError('');
    const { data, error } = await (supabase as any).rpc('request_join_business', { p_code: code });
    setLinking(false);
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.ok) {
      setLinkingError(row?.message || 'Could not send request to that business.');
      return;
    }
    toast.success(row?.message || 'Join request sent — awaiting business approval.');
    setBusinessCode('');
    if (rider?.id) await loadPendingRequests(rider.id);
  };

  // Solo riders pay for their own plan (tracking links + invoices).
  useEffect(() => {
    if (!user?.id || businessRiderId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('business_subscriptions')
        .select('plan_code, status')
        .eq('business_user_id', user.id)
        .in('status', ['active', 'past_due', 'trialing'])
        .maybeSingle();
      if (!cancelled) setSoloSubActive(((data as any)?.plan_code === 'individual_rider') && (data as any)?.status !== 'past_due');
    })();
    return () => { cancelled = true; };
  }, [user?.id, businessRiderId, showSoloCheckout]);

  // Lets any unlinked rider opt into riding solo. Persists the choice on the
  // riders row so the join gate never blocks them again (they can still link
  // a business later from the dashboard card).
  const continueAsIndependent = async () => {
    if (!rider?.id) { setLinkGate({ needsLink: false, canSkip: true }); return; }
    setLinking(true);
    const { error } = await supabase
      .from('riders')
      .update({ rider_mode: 'individual' } as any)
      .eq('id', rider.id);
    setLinking(false);
    if (error) {
      toast.error('Could not switch to independent mode — please try again.');
      return;
    }
    setRider({ ...(rider as any), rider_mode: 'individual' });
    setLinkGate({ needsLink: false, canSkip: true });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    toast.success("You're riding independently — link a business anytime from your dashboard.");
  };

  const autoRequestFromMetadata = async (authUser: any, riderId: string) => {
    const pending = String(authUser?.user_metadata?.pending_business_code || '')
      .trim()
      .toUpperCase();
    if (!pending) return;
    // Skip if a request already exists for this rider + business code.
    const { data: biz } = await supabase
      .from('riders')
      .select('id')
      .eq('business_code', pending)
      .eq('account_type', 'business')
      .maybeSingle();
    if (!biz?.id) return;
    const { data: existing } = await supabase
      .from('rider_join_requests')
      .select('id')
      .eq('rider_id', riderId)
      .eq('business_id', biz.id)
      .maybeSingle();
    if (existing?.id) return;
    await (supabase as any).rpc('request_join_business', { p_code: pending }).catch(() => {});
    await loadPendingRequests(riderId);
  };

  const loadPendingRequests = async (riderId: string) => {
    const { data } = await supabase
      .from('rider_join_requests')
      .select('id, status, created_at, business_id, initiator')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false });
    let list = (data || []) as any[];
    const businessIds = [...new Set(list.map(r => r.business_id))];
    if (businessIds.length) {
      const { data: bizRows } = await (supabase as any).rpc('get_rider_details', { rider_ids: businessIds });
      const bmap = new Map<string, any>((bizRows || []).map((b: any) => [b.id, b]));
      list = list.map(r => ({
        ...r,
        business_name: (bmap.get(r.business_id) as any)?.business_name || (bmap.get(r.business_id) as any)?.full_name || 'Unknown business',
        business_code: (bmap.get(r.business_id) as any)?.business_code || '',
      }));
    }
    setPendingJoinRequests(list);
    // If any was accepted while we were away, force re-check of business link.
    if (list.some(r => r.status === 'accepted' || r.status === 'approved')) {
      const { data: link } = await supabase.from('business_riders')
        .select('id').eq('linked_rider_id', riderId).maybeSingle();
      if (link) setLinkGate({ needsLink: false, canSkip: true });
    }
  };

  // Poll join-request status while waiting for a business to approve.
  useEffect(() => {
    if (!rider?.id || !linkGate?.needsLink) return;
    const t = setInterval(() => loadPendingRequests(rider.id), 15000);
    return () => clearInterval(t);
  }, [rider?.id, linkGate?.needsLink]);

  const loadDeliveries = async (riderId: string) => {
    const { data: businessRider } = await supabase.from('business_riders')
      .select('id')
      .eq('linked_rider_id', riderId)
      .maybeSingle();

    if (businessRider) {
      const { data: dels } = await supabase.from('delivery_trackings')
        .select('*')
        .eq('business_rider_id', businessRider.id)
        .in('status', ['pending', 'assigned', 'accepted', 'on_my_way_pickup', 'picked_up', 'on_my_way_deliver', 'delivering'])
        .order('created_at', { ascending: false });
      setDeliveries(dels || []);
    }
  };

  const pushLiveState = async ({
    lat,
    lng,
    nextStatus,
    sharing,
  }: {
    lat?: number;
    lng?: number;
    nextStatus?: RiderStatus;
    sharing?: boolean;
  }) => {
    const { data, error } = await (supabase as any).rpc('update_linked_rider_live_location', {
      _lat: lat ?? null,
      _lng: lng ?? null,
      _live_status: nextStatus ?? null,
      _sharing: sharing ?? null,
    });
    if (error) {
      console.error('Failed to update rider live state', error);
      toast.error('Could not update your live rider status — please try again.');
      return null;
    }
    return data;
  };

  const startLocationStream = () => {
    void startBackgroundTracking(({ lat, lng }) => {
      setPosition([lat, lng]);
      setLastUpdate(new Date().toLocaleTimeString());
      void sendLocation(lat, lng);
    });
  };

  const startSharing = () => {
    setIsSharing(true);
    const nextStatus: RiderStatus = statusRef.current === 'delivering' ? 'delivering' : 'available';
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    void pushLiveState({ nextStatus, sharing: true });
    // Native: keeps streaming when phone is locked. Web: foreground only.
    startLocationStream();
  };

  const stopSharing = () => {
    // Sharing is always-on by product policy; keep the button as a manual refresh
    // that re-asserts availability and re-arms the background tracker.
    setIsSharing(true);
    statusRef.current = 'available';
    setStatus('available');
    void pushLiveState({ nextStatus: 'available', sharing: true });
    startLocationStream();
  };

  // Location sharing stays ON across shift changes — the rider is only ever
  // offline if they explicitly pick the Offline status button.

  const sendLocation = async (lat: number, lng: number) => {
    if (!rider) return;
    const liveStatus = statusRef.current === 'delivering' ? 'delivering' : 'available';
    await pushLiveState({ lat, lng, nextStatus: liveStatus, sharing: true });
  };

  const handleStatusChange = (nextStatus: RiderStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    void pushLiveState({ nextStatus, sharing: nextStatus !== 'offline' ? isSharing : false });
    if (nextStatus === 'offline' && isSharing) {
      setIsSharing(false);
      void stopBackgroundTracking();
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    await supabase.from('delivery_trackings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', deliveryId);

    // Mirror to rider_delivery_logs so the business "Assign" tab reflects the
    // rider's status change (matched by business_rider_id + customer_name,
    // avoiding NULL/empty postcode mismatches).
    if (delivery?.business_rider_id && delivery?.customer_name) {
      await supabase.from('rider_delivery_logs')
        .update({ status: newStatus })
        .eq('business_rider_id', delivery.business_rider_id)
        .eq('customer_name', delivery.customer_name)
        .not('status', 'in', '("delivered","failed")');
    }

    // On terminal status, bump business_riders counters so history/success rate reflects reality.
    if ((newStatus === 'delivered' || newStatus === 'failed') && delivery?.business_rider_id) {
      const { data: brData } = await supabase.from('business_riders')
        .select('total_deliveries, successful_deliveries, failed_deliveries')
        .eq('id', delivery.business_rider_id)
        .maybeSingle();
      if (brData) {
        const updates: any = newStatus === 'delivered'
          ? {
              successful_deliveries: ((brData as any).successful_deliveries || 0) + 1,
              total_deliveries: ((brData as any).total_deliveries || 0) + 1,
            }
          : {
              failed_deliveries: ((brData as any).failed_deliveries || 0) + 1,
              total_deliveries: ((brData as any).total_deliveries || 0) + 1,
            };
        await supabase.from('business_riders').update(updates).eq('id', delivery.business_rider_id);
      }
    }

    setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, status: newStatus } : d));
    toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
  };

  const handlePhotoCapture = (deliveryId: string) => {
    setUploadingPhoto(deliveryId);
    if (isNative()) {
      // Use native camera directly — bypass the hidden web file input.
      void (async () => {
        const file = await captureProofPhoto();
        if (!file) { setUploadingPhoto(null); return; }
        const fakeEvent = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
        await uploadProofPhoto(fakeEvent);
      })();
    } else {
      fileInputRef.current?.click();
    }
  };

  const uploadProofPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPhoto) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) {
      toast.error('You must be signed in to upload');
      return;
    }
    const path = `${uid}/${uploadingPhoto}/${Date.now()}.${ext}`;

    toast.loading('Uploading proof photo...', { id: 'upload' });

    const { error: uploadError } = await supabase.storage
      .from('delivery-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      toast.error('Failed to upload photo', { id: 'upload' });
      console.error(uploadError);
      return;
    }

    // Buckets are private — generate a long-lived signed URL (1 year)
    const { data: signed, error: signErr } = await supabase.storage
      .from('delivery-photos')
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    if (signErr || !signed) {
      toast.error('Failed to generate photo URL', { id: 'upload' });
      return;
    }

    const photoUrl = signed.signedUrl;

    await supabase.from('delivery_trackings')
      .update({ proof_photo_url: photoUrl })
      .eq('id', uploadingPhoto);

    setDeliveries(prev => prev.map(d =>
      d.id === uploadingPhoto ? { ...d, proof_photo_url: photoUrl } : d
    ));

    toast.success('Proof photo uploaded!', { id: 'upload' });
    setUploadingPhoto(null);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (linkGate?.needsLink) {
    const pending = pendingJoinRequests.filter(r => r.status === 'pending');
    const riderInitiated = pending.filter(r => r.initiator !== 'business');
    const businessInvites = pending.filter(r => r.initiator === 'business');
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-7 space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">Join a business</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Enter a business's code to receive their deliveries — or continue as an independent rider and use your solo dashboard.
            </p>
          </div>
          {businessInvites.length > 0 && (
            <div className="space-y-2">
              {businessInvites.map((inv) => (
                <div key={inv.id} className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-3 space-y-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">You've been invited by</p>
                    <p className="text-sm font-bold text-foreground">{inv.business_name}</p>
                    {inv.business_code && <p className="text-[10px] font-mono text-primary">{inv.business_code}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const { data, error } = await (supabase as any).rpc('respond_business_invite', { _request_id: inv.id, _accept: true });
                        if (error || !(data as any)?.ok) { toast.error((data as any)?.error || error?.message || 'Could not accept'); return; }
                        toast.success('Joined business — welcome!');
                        setLinkGate({ needsLink: false, canSkip: true });
                        if (rider?.id) { await loadPendingRequests(rider.id); await loadDeliveries(rider.id); }
                      }}
                      className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-1.5 rounded-md"
                    >Accept</button>
                    <button
                      onClick={async () => {
                        const { data, error } = await (supabase as any).rpc('respond_business_invite', { _request_id: inv.id, _accept: false });
                        if (error || !(data as any)?.ok) { toast.error((data as any)?.error || error?.message || 'Could not decline'); return; }
                        toast('Invite declined');
                        if (rider?.id) await loadPendingRequests(rider.id);
                      }}
                      className="flex-1 bg-destructive/10 text-destructive text-xs font-semibold py-1.5 rounded-md"
                    >Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {riderInitiated.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 space-y-1">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" /> Awaiting business approval
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-200/90 leading-snug">
                Your join request has been sent. You'll get access to deliveries as soon as the business accepts it. This page refreshes automatically.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Business Code</label>
            <input
              type="text"
              value={businessCode}
              onChange={(e) => setBusinessCode(e.target.value.toUpperCase())}
              placeholder="BIZ-XXXXXX"
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm font-mono outline-none focus:border-primary"
            />
            {linkingError && (
              <div className="text-destructive text-xs bg-destructive/10 rounded-lg p-2 text-center">{linkingError}</div>
            )}
            <button
              onClick={handleLinkBusiness}
              disabled={linking}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {linking && <Loader2 className="w-4 h-4 animate-spin" />} {pending.length > 0 ? 'Send another request' : 'Send join request'}
            </button>
            <button
              onClick={continueAsIndependent}
              disabled={linking}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-2 disabled:opacity-60"
            >
              No business code? Continue as an independent rider
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <SEO
      title="Rider / Driver App — Loca8tor Delivery Dashboard"
      description="Loca8tor rider dashboard for managing deliveries, sharing live GPS, capturing proof-of-delivery photos, and tracking earnings across Nigeria and the UK."
      path="/rider"
    />
    <div className="min-h-screen bg-background">
      {/* Hidden file input for photo capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={uploadProofPhoto}
      />

      <div className="max-w-[480px] mx-auto px-5 py-6">
        <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-2">Rider / Driver App</div>
        <h1 className="font-heading text-xl font-bold mb-1">{rider?.full_name || 'Rider / Driver'}</h1>
        <p className="text-muted-foreground text-sm mb-3">{rider?.business_name ? 'Fleet member' : 'Independent rider'}</p>

        {/* Notification banner */}
        <div className="mb-4">
          <NotificationBanner onEnable={() => {
            Notification.requestPermission().then(p => {
              if (p === 'granted') {
                setNotificationsEnabled(true);
                toast.success('Notifications enabled!');
              }
            });
          }} />
        </div>

        {/* Shift Tracker — riders must clock in before sharing location */}
        <div className="mb-5">
          <ShiftTracker businessRiderId={businessRiderId} businessUserId={businessUserId} />
        </div>

        {/* Premium-only: full in-app turn-by-turn navigation with live map */}
        {planTier === 'premium' && (
          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-2">
              In-App Navigation · Premium
            </div>
            <RiderNavigationView riderId={rider.id} />
          </div>
        )}

        {/* Sharing badge */}
        {businessRiderId ? (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-xs font-bold mb-5 ${
          isSharing ? 'bg-primary/10 border-primary/25 text-primary' : 'bg-destructive/10 border-destructive/20 text-destructive'
        }`}>
          {isSharing && <span className="pulse-dot" />}
          <span>{isSharing ? 'Location sharing ON — business can see you' : '● Location sharing OFF'}</span>
        </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-primary/25 bg-primary/10 text-primary text-xs font-bold mb-5">
            <span className="pulse-dot" />
            <span>Independent rider — your location stays private to you</span>
          </div>
        )}

        {/* Status toggle */}
        {businessRiderId && (
        <>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">My Status</div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {([
            { s: 'available' as const, label: '🟢 Available', activeClass: 'border-primary bg-primary/10 text-primary' },
            { s: 'delivering' as const, label: '🔵 Delivering', activeClass: 'border-accent bg-accent/10 text-accent-foreground' },
            { s: 'offline' as const, label: '⚫ Offline', activeClass: 'border-muted-foreground bg-muted text-muted-foreground' },
          ]).map(item => (
            <button
              key={item.s}
              onClick={() => handleStatusChange(item.s)}
              className={`py-3 rounded-lg border text-xs font-bold transition-all ${
                status === item.s ? item.activeClass : 'border-border bg-secondary text-muted-foreground hover:border-muted-foreground/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        </>
        )}

        {/* Location control */}
        <div className="bg-secondary border border-border rounded-xl p-5 mb-5">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{businessRiderId ? 'Live Location' : 'My Location'}</div>
            {businessRiderId ? (
            <button
              onClick={isSharing ? stopSharing : startSharing}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isSharing ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
              }`}
            >
              {isSharing ? 'Stop Sharing' : 'Start Sharing'}
            </button>
            ) : (
            <button
              onClick={() => navigator.geolocation?.getCurrentPosition(
                (pos) => { setPosition([pos.coords.latitude, pos.coords.longitude]); setLastUpdate(new Date().toLocaleTimeString()); },
                () => toast.error('Could not get your location'),
                { enableHighAccuracy: true, timeout: 10000 }
              )}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground transition-all"
            >
              Refresh
            </button>
            )}
          </div>
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: '250px' }}>
            <MapView center={position} />
          </div>
          <div className="text-xs font-mono text-muted-foreground text-center mt-2">
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </div>
          {lastUpdate && (
            <div className="text-[10px] text-muted-foreground text-center mt-1">Updated: {lastUpdate}</div>
          )}
        </div>

        {/* Deliveries */}
        {businessRiderId && (
        <>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          My Deliveries ({deliveries.length})
        </div>
        {deliveries.length === 0 ? (
          <div className="bg-secondary border border-border rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No active deliveries assigned to you.</p>
            <p className="text-[10px] text-muted-foreground mt-1">New assignments will appear here automatically</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map(d => (
              <div key={d.id} className={`bg-secondary border rounded-xl p-4 ${
                d.status === 'delivering' || d.status === 'on_my_way_deliver'
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-primary text-sm font-bold">{d.share_code}</span>
                  <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
                    {d.status}
                  </span>
                </div>
                <div className="text-sm font-bold">{d.customer_name}</div>
                {d.customer_phone && (
                  <a href={`tel:${d.customer_phone}`} className="text-xs text-primary hover:underline">{d.customer_phone}</a>
                )}
                {d.from_postcode && <div className="text-xs text-muted-foreground mt-1">📦 From: {d.from_postcode}</div>}
                {d.to_postcode && <div className="text-xs text-muted-foreground">📍 To: {d.to_postcode}</div>}
                {d.notes && <div className="text-xs text-muted-foreground mt-1 italic">Note: {d.notes}</div>}

                {/* Status update buttons */}
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Update Status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {DELIVERY_STATUSES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => updateDeliveryStatus(d.id, s.value)}
                        disabled={d.status === s.value}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                          d.status === s.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proof of delivery photo */}
                <div className="mt-3 pt-3 border-t border-border/50">
                  {d.proof_photo_url ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold">
                        <CheckCircle className="w-3.5 h-3.5" /> Proof photo uploaded
                      </div>
                      <ProofImage
                        src={d.proof_photo_url}
                        deliveryId={d.id}
                        alt="Proof of delivery"
                        className="w-full h-32 object-cover rounded-lg border border-border"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePhotoCapture(d.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-background border border-dashed border-border rounded-lg text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      Take Proof Photo
                    </button>
                  )}
                </div>

                {/* COD + Failed-reason + Signature actions */}
                <DeliveryActions
                  delivery={d}
                  onChange={(patch) =>
                    setDeliveries(prev => prev.map(x => x.id === d.id ? { ...x, ...patch } : x))
                  }
                />
              </div>
            ))}
          </div>
        )}
        </>
        )}

        {/* Distance Calculator — solo riders need an active plan */}
        {(businessRiderId || soloSubActive) && (
          <div className="mt-6">
            <DistanceCalculator currentLat={position[0]} currentLng={position[1]} planTier={planTier} />
          </div>
        )}

        {/* Solo rider tools — tracking links + invoices (paid plan) */}
        {!businessRiderId && rider && (
          <div className="mt-6 space-y-6">
            {soloSubActive ? (
              <>
                <SoloDeliveries
                  riderId={rider.id}
                  riderName={rider.full_name}
                  riderPhone={rider.phone}
                  lat={position[0]}
                  lng={position[1]}
                />
                <InvoiceGenerator
                  riders={[{ id: rider.id, rider_name: rider.full_name }] as any}
                  businessName={rider.full_name}
                  storageKey={`solo_invoices_${rider.id}`}
                />
              </>
            ) : (
              <div className="bg-secondary border border-primary/30 rounded-xl p-4 space-y-3">
                <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" /> Solo Rider plan — from ₦2,500/month
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Unlock delivery tracking links, invoices, the distance calculator, earnings log and route history.
                  Clocking in stays free. Billed immediately, no free trial. Cancel anytime.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SOLO_CYCLES.map(c => (
                    <button
                      key={c.cycle}
                      onClick={() => setSoloCycle(c.cycle)}
                      className={`px-2 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                        soloCycle === c.cycle
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {c.label}
                      <span className="block font-mono text-[10px] mt-0.5">₦{c.amount.toLocaleString()}</span>
                      {c.save && <span className="block text-[9px] text-primary mt-0.5">{c.save}</span>}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowSoloCheckout(true)}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-xs font-heading font-bold hover:brightness-110 transition-all"
                >
                  Subscribe — ₦{(SOLO_CYCLES.find(c => c.cycle === soloCycle)?.amount ?? 2500).toLocaleString()}
                </button>
                <a
                  href="/wallet"
                  className="block text-center text-[11px] font-semibold text-primary hover:underline"
                >
                  Fund your wallet to pay without a card
                </a>
              </div>
            )}
          </div>
        )}

        {showSoloCheckout && rider && (
          <SubscribeModal
            plan={{
              code: 'individual_rider',
              name: 'Solo Rider / Driver',
              amount: SOLO_CYCLES.find(c => c.cycle === soloCycle)?.amount ?? 2500,
              cycle: soloCycle,
            }}
            defaults={{ full_name: rider.full_name, email: user?.email, phone: rider.phone }}
            noTrial
            onClose={() => setShowSoloCheckout(false)}
            onSuccess={() => setSoloSubActive(true)}
          />
        )}

        {/* Join a company later — only for solo (unlinked) riders */}
        {!businessRiderId && rider && (
          <div className="mt-6 bg-secondary border border-border rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Working with a company?
            </p>
            <p className="text-[11px] text-muted-foreground">
              Enter a business code to link your account and start receiving deliveries from them.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={businessCode}
                onChange={(e) => setBusinessCode(e.target.value.toUpperCase())}
                placeholder="BIZ-XXXXXX"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-primary"
              />
              <button
                onClick={handleLinkBusiness}
                disabled={linking}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-heading font-bold hover:brightness-110 transition-all disabled:opacity-60 flex items-center gap-1.5"
              >
                {linking && <Loader2 className="w-3 h-3 animate-spin" />} Send request
              </button>
            </div>
            {linkingError && (
              <div className="text-destructive text-[11px] bg-destructive/10 rounded-lg p-2 text-center">{linkingError}</div>
            )}
          </div>
        )}

        {/* Referral toggle */}
        <div className="mt-6">
          <button
            onClick={() => setShowReferrals(!showReferrals)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-secondary border border-border rounded-xl text-sm font-bold text-foreground hover:border-primary/30 transition-all"
          >
            <Gift className="w-4 h-4 text-primary" />
            {showReferrals ? 'Hide Referral Program' : 'Referral Program — Earn ₦100 per invite!'}
          </button>
        </div>

        {showReferrals && rider && (
          <ReferralDashboard riderId={rider.id} referralCode={rider.referral_code} />
        )}

        {/* Company messages inbox — only for riders linked to a business */}
        {businessRiderId && (
          <div className="mt-6">
            <RiderMessagesPanel businessRiderId={businessRiderId} businessUserId={businessUserId} />
          </div>
        )}

        {/* Earnings + route history — solo riders need an active plan */}
        {(businessRiderId || soloSubActive) && (
          <div className="mt-6 space-y-6">
            <EarningsTracker />
            <RouteHistory />
          </div>
        )}
      </div>
    </div>
    </>
  );
}
