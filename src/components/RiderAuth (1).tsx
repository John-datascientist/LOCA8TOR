import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LogIn, UserPlus, Bike, Building2, User, Eye, EyeOff, Link2, Search, MapPin, Navigation, Bell, MessageCircle, Send, Phone, CheckCircle, Package, Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import BusinessDashboard from '@/components/BusinessDashboard';
import { generatePostcodeWithAddress } from '@/lib/postcodeGenerator';
import EarningsTracker from '@/components/rider/EarningsTracker';
import ShiftTracker from '@/components/rider/ShiftTracker';
import RouteHistory from '@/components/rider/RouteHistory';
import RiderNavigationView from '@/components/rider/RiderNavigationView';

const getPasswordResetRedirectUrl = () => `${window.location.origin}/reset-password`;

export interface RiderProfile {
  id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  location: string;
  account_type: 'individual' | 'business' | 'rider';
  business_name?: string;
  business_size?: 'small' | 'medium' | 'large' | null;
  business_code?: string | null;
  postcode?: string | null;
  cac_number?: string | null;
  bike_owner?: string | null;
  worker_type?: 'rider' | 'driver' | null;
  vehicle_type?: 'bike' | 'car' | 'bus' | 'truck' | null;
  subscription_status?: string | null;
}

export default function RiderAuth({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [pendingNotifications, setPendingNotifications] = useState(0);
  const linkedBusiness = useLinkedBusinessRider(riderProfile?.id ?? '');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadRiderProfile(session.user.id);
      else { setRiderProfile(null); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadRiderProfile(session.user.id);
      else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!riderProfile || riderProfile.account_type !== 'business') return;
    const checkNotifications = async () => {
      const { data, error } = await supabase
        .from('rider_join_requests')
        .select('id')
        .eq('business_id', riderProfile.id)
        .eq('status', 'pending');
      if (!error && data) setPendingNotifications(data.length);
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [riderProfile]);

  useEffect(() => {
    if (pendingNotifications > 0 && riderProfile?.account_type === 'business') {
      toast.info(`You have ${pendingNotifications} pending rider join request${pendingNotifications > 1 ? 's' : ''}`, {
        id: 'join-notifications',
        duration: 5000,
      });
    }
  }, [pendingNotifications, riderProfile]);

  const loadRiderProfile = async (userId: string) => {
    const { data } = await supabase.from('riders').select('*').eq('user_id', userId).maybeSingle();
    setRiderProfile(data as RiderProfile | null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return mode === 'signin'
      ? <SignInForm onSwitch={() => setMode('signup')} />
      : <SignUpForm onSwitch={() => setMode('signin')} />;
  }

  if (!riderProfile) {
    return <RiderSetup userId={session.user.id} email={session.user.email} onComplete={(p) => setRiderProfile(p)} />;
  }

  const sizeLabel = riderProfile.business_size === 'small' ? 'Standard'
    : riderProfile.business_size === 'medium' ? 'Premium'
    : riderProfile.business_size === 'large' ? 'Premium'
    : riderProfile.business_size === 'premium' ? 'Premium' : '';

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg ring-1 ring-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative">
              {riderProfile.account_type === 'business' ? <Building2 className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
              {pendingNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingNotifications}
                </span>
              )}
            </div>
            <div>
              <p className="font-heading font-bold text-sm text-foreground">{riderProfile.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {riderProfile.account_type === 'business'
                  ? `${riderProfile.business_name} · ${sizeLabel}`
                  : 'Individual Rider / Driver'} · {riderProfile.location}
              </p>
              {riderProfile.postcode && (
                <p className="text-[10px] text-primary font-mono">📍 {riderProfile.postcode}</p>
              )}
              {riderProfile.account_type === 'business' && riderProfile.business_code && (
                <p className="text-[10px] text-primary font-mono">Business Code: {riderProfile.business_code}</p>
              )}
              {riderProfile.account_type === 'business' && riderProfile.cac_number && (
                <p className="text-[10px] text-muted-foreground font-mono">CAC: {riderProfile.cac_number}</p>
              )}
            </div>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); setSession(null); setRiderProfile(null); }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {riderProfile.account_type === 'business' && <BusinessDashboard profile={riderProfile} />}
      
      {/* Not 'business': covers both the correct 'rider' value going forward
          and legacy rows still holding the old 'individual' value from
          before this was fixed, so already-registered riders don't lose
          access to their tools until the account_type backfill runs. */}
      {riderProfile.account_type !== 'business' && (
        <>
          <RiderDeliveryNotifications businessRiderId={linkedBusiness.businessRiderId} />
          <RiderDeliveryLogPanel businessRiderId={linkedBusiness.businessRiderId} />
          <RiderNavigationView riderId={riderProfile.id} />
          <JoinBusinessPanel riderId={riderProfile.id} riderName={riderProfile.full_name} bikeOwner={riderProfile.bike_owner || 'self'} />
          <AutoPostcodeRefresh riderId={riderProfile.id} businessRiderId={linkedBusiness.businessRiderId} />
          <RiderMessagesPanel businessRiderId={linkedBusiness.businessRiderId} businessUserId={linkedBusiness.businessUserId} />
          <ShiftTracker />
          <EarningsTracker />
          <RouteHistory />
        </>
      )}
      
      {children}
    </div>
  );
}

function useLinkedBusinessRider(riderId: string) {
  const [businessRiderId, setBusinessRiderId] = useState<string | null>(null);
  const [businessUserId, setBusinessUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!riderId) {
      setBusinessRiderId(null);
      setBusinessUserId(null);
      return;
    }
    let mounted = true;

    const loadLink = async () => {
      const { data, error } = await supabase
        .from('business_riders')
        .select('id, business_user_id')
        .eq('linked_rider_id', riderId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (!mounted || error) return;

      setBusinessRiderId(data?.id ?? null);
      setBusinessUserId(data?.business_user_id ?? null);
    };

    loadLink();
    const interval = setInterval(loadLink, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [riderId]);

  return { businessRiderId, businessUserId };
}

/* ─── Proof of Delivery Upload ─── */
function ProofUpload({ deliveryId, onUploaded }: { deliveryId: string; onUploaded: () => void }) {
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
    const url = signed.signedUrl;
    await supabase.from('delivery_trackings').update({ proof_photo_url: url } as any).eq('id', deliveryId);
    setProofUrl(url);
    toast.success('📸 Proof uploaded!');
    setUploading(false);
    onUploaded();
  };

  return (
    <div className="flex items-center gap-2">
      <label className="flex-1 cursor-pointer bg-secondary/60 rounded-lg py-2 text-center text-[10px] font-bold text-foreground flex items-center justify-center gap-1">
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
        {proofUrl ? '✅ Proof Uploaded' : 'Upload Delivery Proof'}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
      {proofUrl && (
        <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline">View</a>
      )}
    </div>
  );
}

/* ─── Rider Delivery Notifications (shows assigned deliveries) ─── */
function RiderDeliveryNotifications({ businessRiderId }: { businessRiderId: string | null }) {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!businessRiderId) return;
    loadDeliveries();
    const interval = setInterval(loadDeliveries, 10000);
    return () => clearInterval(interval);
  }, [businessRiderId]);

  const loadDeliveries = async () => {
    if (!businessRiderId) return;
    const { data } = await supabase
      .from('delivery_trackings')
      .select('*')
      .eq('business_rider_id', businessRiderId)
      .in('status', ['pending', 'accepted', 'en_route_pickup', 'picked_up', 'in_transit'])
      .order('created_at', { ascending: false })
      .limit(10);
    setDeliveries((data || []) as any[]);
  };

  const updateStatus = async (deliveryId: string, newStatus: string) => {
    setUpdating(deliveryId);
    const delivery = deliveries.find(d => d.id === deliveryId);
    
    await supabase.from('delivery_trackings').update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    } as any).eq('id', deliveryId);

    // Sync status to rider_delivery_logs so business dashboard reflects changes
    if (delivery) {
      await supabase.from('rider_delivery_logs')
        .update({ status: newStatus })
        .eq('business_rider_id', delivery.business_rider_id)
        .eq('customer_name', delivery.customer_name)
        .eq('from_postcode', delivery.from_postcode || '')
        .eq('to_postcode', delivery.to_postcode || '');
    }

    // Update business_riders delivery stats when completed or failed
    if ((newStatus === 'delivered' || newStatus === 'failed') && delivery) {
      const { data: brData } = await supabase.from('business_riders')
        .select('total_deliveries, successful_deliveries, failed_deliveries')
        .eq('id', delivery.business_rider_id)
        .maybeSingle();
      if (brData) {
        const updates: any = {};
        if (newStatus === 'delivered') {
          updates.successful_deliveries = (brData.successful_deliveries || 0) + 1;
        } else {
          updates.failed_deliveries = (brData.failed_deliveries || 0) + 1;
        }
        updates.total_deliveries = (brData.total_deliveries || 0) + 1;
        await supabase.from('business_riders').update(updates).eq('id', delivery.business_rider_id);
      }
      toast.success(newStatus === 'delivered' ? '✅ Delivery completed!' : '❌ Marked as failed');
    } else {
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    }
    setUpdating(null);
    loadDeliveries();
  };

  if (!businessRiderId || deliveries.length === 0) return null;

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary animate-pulse" /> Active Deliveries ({deliveries.length})
      </p>
      <div className="space-y-2">
        {deliveries.map(d => (
          <div key={d.id} className="bg-secondary/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">{d.customer_name}</p>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                d.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                d.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                d.status === 'en_route_pickup' ? 'bg-orange-100 text-orange-700' :
                d.status === 'picked_up' ? 'bg-blue-100 text-blue-700' :
                d.status === 'in_transit' ? 'bg-purple-100 text-purple-700' :
                'bg-primary/10 text-primary'
              }`}>{
                d.status === 'accepted' ? 'Accepted' :
                d.status === 'en_route_pickup' ? 'On Way to Pickup' :
                d.status === 'picked_up' ? 'Picked Up' :
                d.status === 'in_transit' ? 'On Way to Deliver' :
                d.status.replace('_', ' ')
              }</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {d.from_postcode && `From: ${d.from_postcode}`} {d.to_postcode && `→ To: ${d.to_postcode}`}
            </p>
            {d.customer_phone && (
              <a href={`tel:${d.customer_phone}`} className="inline-flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/10 px-2 py-1 rounded-md">
                <Phone className="w-3 h-3" /> Call: {d.customer_phone}
              </a>
            )}
            {d.notes && <p className="text-[10px] text-muted-foreground italic">Note: {d.notes}</p>}
            <p className="text-[9px] text-muted-foreground font-mono">Tracking: {d.share_code}</p>

            {/* Action buttons based on current status */}
            <div className="flex flex-col gap-2 pt-1">
              {d.status === 'pending' && (
                <button onClick={() => updateStatus(d.id, 'accepted')} disabled={updating === d.id}
                  className="flex-1 bg-emerald-600 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
                  {updating === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Accept Delivery
                </button>
              )}
              {d.status === 'accepted' && (
                <button onClick={() => updateStatus(d.id, 'en_route_pickup')} disabled={updating === d.id}
                  className="flex-1 bg-orange-600 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
                  {updating === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />} On My Way to Pick Up
                </button>
              )}
              {d.status === 'en_route_pickup' && (
                <button onClick={() => updateStatus(d.id, 'picked_up')} disabled={updating === d.id}
                  className="flex-1 bg-blue-600 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
                  {updating === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />} I Have Picked Up Delivery
                </button>
              )}
              {d.status === 'picked_up' && (
                <button onClick={() => updateStatus(d.id, 'in_transit')} disabled={updating === d.id}
                  className="flex-1 bg-purple-600 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
                  {updating === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />} On My Way to Deliver
                </button>
              )}
              {d.status === 'in_transit' && (
                <div className="space-y-2">
                  {/* Proof photo upload */}
                  <ProofUpload deliveryId={d.id} onUploaded={() => loadDeliveries()} />
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(d.id, 'delivered')} disabled={updating === d.id}
                      className="flex-1 bg-green-600 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
                      {updating === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>✅ Delivered</>}
                    </button>
                    <button onClick={() => updateStatus(d.id, 'failed')} disabled={updating === d.id}
                      className="bg-destructive text-destructive-foreground text-[10px] font-bold px-3 py-2 rounded-lg disabled:opacity-60">
                      ❌ Not Delivered
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiderDeliveryLogPanel({ businessRiderId }: { businessRiderId: string | null }) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!businessRiderId) return;

    const loadLogs = async () => {
      const { data } = await supabase
        .from('rider_delivery_logs')
        .select('*')
        .eq('business_rider_id', businessRiderId)
        .order('created_at', { ascending: false })
        .limit(10);

      setLogs((data || []) as any[]);
    };

    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, [businessRiderId]);

  if (!businessRiderId || logs.length === 0) return null;

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <p className="text-sm font-heading font-bold text-foreground">Delivery Logs</p>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="bg-secondary/40 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-foreground">{log.customer_name}</p>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                log.status === 'failed'
                  ? 'bg-destructive/10 text-destructive'
                  : log.status === 'delivered'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-foreground'
              }`}>
                {String(log.status).replace('_', ' ')}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {log.from_postcode && `From: ${log.from_postcode}`} {log.to_postcode && `→ To: ${log.to_postcode}`}
            </p>
            {log.notes && <p className="text-[10px] text-muted-foreground italic">Note: {log.notes}</p>}
            <p className="text-[9px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Rider Messages Panel (for linked individual riders) ─── */
function RiderMessagesPanel({
  businessRiderId,
  businessUserId,
}: {
  businessRiderId: string | null;
  businessUserId: string | null;
}) {
  const [messages, setMessages] = useState<{ id: string; message: string; direction: string; created_at: string }[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!businessRiderId) return;
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [businessRiderId]);

  const loadMessages = async () => {
    if (!businessRiderId) return;
    const { data } = await supabase
      .from('rider_messages')
      .select('*')
      .eq('business_rider_id', businessRiderId)
      .order('created_at', { ascending: false })
      .limit(30);
    setMessages((data || []) as any[]);
  };

  const sendReply = async () => {
    if (!newMsg.trim() || !businessRiderId || !businessUserId) return;
    setSending(true);
    const { error } = await supabase.from('rider_messages').insert({
      business_rider_id: businessRiderId,
      business_user_id: businessUserId,
      message: newMsg.trim(),
      direction: 'inbound',
    });
    if (error) toast.error(error.message);
    else { setNewMsg(''); loadMessages(); }
    setSending(false);
  };

  if (!businessRiderId) return null;

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" /> Company Messages
      </p>

      <div className="flex gap-1.5">
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
          placeholder="Reply to your company..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          onKeyDown={e => { if (e.key === 'Enter') sendReply(); }}
        />
        <button onClick={sendReply} disabled={sending || !newMsg.trim()}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-lg disabled:opacity-60">
          <Send className="w-4 h-4" />
        </button>
      </div>

      {messages.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No messages yet</p>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {messages.map(m => (
            <div key={m.id} className={`rounded-lg px-3 py-2 text-xs ${m.direction === 'outbound' ? 'bg-secondary ml-6' : 'bg-primary/10 mr-6'}`}>
              <p className="text-foreground">{m.message}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {m.direction === 'inbound' ? 'You' : 'Company'} · {new Date(m.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Auto Postcode Refresh (for linked individual riders) ─── */
function AutoPostcodeRefresh({ riderId, businessRiderId }: { riderId: string; businessRiderId: string | null }) {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const updateLocation = useCallback(async () => {
    if (!businessRiderId || !navigator.geolocation) return;
    setRefreshing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Write the live position immediately so the fleet map stays
        // responsive; the postcode itself goes through the deduped/geocoded
        // generator so a stationary rider keeps the same postcode across
        // refreshes instead of it drifting with GPS jitter.
        await supabase.from('business_riders')
          .update({
            last_lat: pos.coords.latitude,
            last_lng: pos.coords.longitude,
            last_seen: new Date().toISOString(),
          })
          .eq('linked_rider_id', riderId);
        const pc = await generatePostcodeWithAddress(pos.coords.latitude, pos.coords.longitude);
        await supabase.from('business_riders')
          .update({ last_postcode: pc.postcode })
          .eq('linked_rider_id', riderId);
        await supabase.from('riders')
          .update({ postcode: pc.postcode })
          .eq('id', riderId);
        setLastUpdate(new Date().toLocaleTimeString());
        setRefreshing(false);
      },
      () => { setRefreshing(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [businessRiderId, riderId]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!businessRiderId) return;
    updateLocation();
    const interval = setInterval(updateLocation, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [businessRiderId, updateLocation]);

  if (!businessRiderId) return null;

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-heading font-bold text-foreground flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-primary" /> Live Location Sharing
        </p>
        <button onClick={updateLocation} disabled={refreshing}
          className="text-[10px] text-primary font-medium flex items-center gap-1 disabled:opacity-60">
          {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
          Update Now
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Your location is shared with your company every 10 minutes.
        {lastUpdate && <> Last update: <span className="text-foreground font-medium">{lastUpdate}</span></>}
      </p>
    </div>
  );
}

/* ─── Join Business Panel (for individual riders) ─── */
function JoinBusinessPanel({ riderId, riderName, bikeOwner }: { riderId: string; riderName: string; bikeOwner: string }) {
  const [searchCode, setSearchCode] = useState('');
  const [foundBusiness, setFoundBusiness] = useState<{ id: string; business_name: string; business_size: string; full_name: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => { loadMyRequests(); }, [riderId]);

  const loadMyRequests = async () => {
    const { data } = await supabase
      .from('rider_join_requests')
      .select('*')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      const enriched = data.map(r => ({ ...r, business_name: 'Company', owner_name: '' }));
      setMyRequests(enriched);
    } else {
      setMyRequests([]);
    }
  };

  // Check if rider already has an accepted business (bike owned by business = can only link to 1)
  const hasAcceptedBusiness = myRequests.some(r => r.status === 'accepted');
  const canJoinMore = bikeOwner === 'self' || !hasAcceptedBusiness;

  const searchBusiness = async () => {
    if (!searchCode.trim()) return;
    setSearching(true);
    setFoundBusiness(null);
    
    const { data, error } = await supabase.rpc('search_business', { 
      search_term: searchCode.trim() 
    });
    
    if (data && Array.isArray(data) && data.length > 0) {
      setFoundBusiness(data[0] as any);
    } else if (data && !Array.isArray(data)) {
      setFoundBusiness(data as any);
    } else {
      toast.error('No business found with that code or phone number');
    }
    setSearching(false);
  };

  const sendRequest = async () => {
    if (!foundBusiness) return;
    if (!canJoinMore) {
      toast.error('You can only be linked to one company at a time.');
      return;
    }
    setRequesting(true);
    const { error } = await supabase.from('rider_join_requests').insert({
      rider_id: riderId,
      business_id: foundBusiness.id,
    });
    if (error) {
      if (error.message.includes('duplicate')) toast.error('You already sent a request to this business');
      else toast.error(error.message);
    } else {
      toast.success('Join request sent! The business will review it.');
      setFoundBusiness(null);
      setSearchCode('');
      loadMyRequests();
    }
    setRequesting(false);
  };

  const cancelRequest = async (reqId: string) => {
    await supabase.from('rider_join_requests').delete().eq('id', reqId);
    toast.success('Request cancelled');
    loadMyRequests();
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
        <Link2 className="w-4 h-4 text-primary" /> Join a Company
      </p>
      <p className="text-xs text-muted-foreground">
        Enter your company's business code or phone number to request to join.
      </p>

      {!canJoinMore && (
        <div className="bg-destructive/10 text-destructive text-xs rounded-lg p-2 text-center">
          ⚠️ You are already linked to a company.
        </div>
      )}
      
      <div className="flex gap-2">
        <input
          value={searchCode}
          onChange={e => setSearchCode(e.target.value)}
          placeholder="Business code or phone number"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          onKeyDown={e => { if (e.key === 'Enter') searchBusiness(); }}
          disabled={!canJoinMore}
        />
        <button onClick={searchBusiness} disabled={searching || !searchCode.trim() || !canJoinMore}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center gap-1">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {foundBusiness && (
        <div className="bg-primary/5 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">{foundBusiness.business_name}</p>
              <p className="text-xs text-muted-foreground">Owner: {foundBusiness.full_name} · {foundBusiness.business_size} business</p>
            </div>
          </div>
          <button onClick={sendRequest} disabled={requesting}
            className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg disabled:opacity-60">
            {requesting ? 'Sending...' : 'Request to Join'}
          </button>
        </div>
      )}

      {myRequests.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Your Requests</p>
          {myRequests.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{r.business_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {r.status === 'pending' ? '⏳ Pending' : r.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                </p>
              </div>
              {r.status === 'pending' && (
                <button onClick={() => cancelRequest(r.id)} className="text-[10px] text-destructive hover:underline">Cancel</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Auth Forms ─── */
function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) { toast.error('Enter your email'); return; }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    if (error) toast.error(error.message);
    else toast.success('Password reset link sent to your email!');
    setResetLoading(false);
  };

  if (showForgot) {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="text-center mb-6">
          <Bike className="w-12 h-12 text-primary mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold text-foreground">Forgot Password</h2>
          <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link</p>
        </div>
        <form onSubmit={handleForgotPassword} className="space-y-4 bg-card rounded-lg ring-1 ring-border p-6">
          <div>
            <label className="text-xs font-medium text-foreground">Email</label>
            <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="you@example.com" />
          </div>
          <button type="submit" disabled={resetLoading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60">
            {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Send Reset Link
          </button>
          <p className="text-xs text-center text-muted-foreground">
            <button type="button" onClick={() => setShowForgot(false)} className="text-primary font-medium hover:underline">Back to Sign In</button>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-6">
        <Bike className="w-12 h-12 text-primary mx-auto mb-3" />
        <h2 className="font-heading text-xl font-bold text-foreground">Rider / Driver Sign In</h2>
        <p className="text-sm text-muted-foreground mt-1">Sign in to access rider tools</p>
      </div>
      <form onSubmit={handleSignIn} className="space-y-4 bg-card rounded-lg ring-1 ring-border p-6">
        <div>
          <label className="text-xs font-medium text-foreground">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="you@example.com" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Password</label>
          <div className="relative mt-1">
            <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="text-right">
          <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary font-medium hover:underline">
            Forgot Password?
          </button>
        </div>
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Sign In
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Don't have an account? <button type="button" onClick={onSwitch} className="text-primary font-medium hover:underline">Sign Up</button>
        </p>
      </form>
    </div>
  );
}

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) toast.error(error.message);
    else toast.success('Check your email to verify your account, then sign in.');
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-6">
        <Bike className="w-12 h-12 text-primary mx-auto mb-3" />
        <h2 className="font-heading text-xl font-bold text-foreground">Rider / Driver Sign Up</h2>
        <p className="text-sm text-muted-foreground mt-1">Create an account to access rider tools</p>
      </div>
      <form onSubmit={handleSignUp} className="space-y-4 bg-card rounded-lg ring-1 ring-border p-6">
        <div>
          <label className="text-xs font-medium text-foreground">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="you@example.com" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Password</label>
          <div className="relative mt-1">
            <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10" placeholder="Min. 6 characters" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Sign Up
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Already have an account? <button type="button" onClick={onSwitch} className="text-primary font-medium hover:underline">Sign In</button>
        </p>
      </form>
    </div>
  );
}

/* ─── Postcode Generator Mini ─── */
function PostcodeGeneratorMini({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setGenerating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Use the deduped/geocoded generator (not the sync grid-only quick
        // one) so a rider's registered postcode matches what a customer at
        // the same spot would get from the main Generate flow.
        try {
          const pc = await generatePostcodeWithAddress(pos.coords.latitude, pos.coords.longitude);
          onChange(pc.postcode);
          toast.success(`Postcode generated: ${pc.postcode}`);
        } catch {
          toast.error('Could not generate a postcode for your location. Try again.');
        } finally {
          setGenerating(false);
        }
      },
      () => {
        toast.error('Could not get your location. Please enable location access.');
        setGenerating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">Postcode *</label>
        <button type="button" onClick={handleGenerate} disabled={generating}
          className="text-[10px] text-primary font-medium hover:underline flex items-center gap-1 disabled:opacity-60">
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          Generate my postcode
        </button>
      </div>
      <input required value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. LA01 2AB" />
    </div>
  );
}

/* ─── Profile Setup ─── */
function RiderSetup({ userId, email, onComplete }: { userId: string; email: string; onComplete: (p: RiderProfile) => void }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [postcode, setPostcode] = useState('');
  // 'rider' covers both riders and drivers — worker_type/vehicle_type below
  // pick which. This used to be labelled 'individual', which collided with
  // the *different* meaning 'individual' has on the main /signup page
  // ("Earn Rewards", a non-operational account) — a rider/driver signing up
  // here would end up indistinguishable from a rewards-only account
  // everywhere else in the app. Always write 'rider' for this form.
  const [accountType, setAccountType] = useState<'rider' | 'business'>('rider');
  const [workerType, setWorkerType] = useState<'rider' | 'driver'>('rider');
  const [vehicleType, setVehicleType] = useState<'bike' | 'car' | 'bus' | 'truck'>('bike');
  const [businessName, setBusinessName] = useState('');
  const [businessSize, setBusinessSize] = useState<'small' | 'medium' | 'large'>('small');
  const [cacNumber, setCacNumber] = useState('');
  const [joinCompany, setJoinCompany] = useState(false);
  const [bikeOwner, setBikeOwner] = useState<'self' | 'business'>('self');
  const [loading, setLoading] = useState(false);

  const generateBusinessCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BIZ-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcode.trim()) { toast.error('Postcode is required. Use "Generate my postcode" to get yours.'); return; }
    if (!phone.trim()) { toast.error('Phone number is required.'); return; }
    if (accountType === 'business' && !cacNumber.trim()) { toast.error('CAC Registration Number is required for business accounts.'); return; }
    if (accountType === 'rider' && workerType === 'driver' && vehicleType === 'bike') {
      toast.error('Please choose a vehicle type (car, bus, or truck) for driver accounts.');
      return;
    }
    setLoading(true);
    const payload: any = {
      user_id: userId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      location: location.trim(),
      postcode: postcode.trim(),
      account_type: accountType,
      business_name: accountType === 'business' ? businessName.trim() : null,
      business_size: accountType === 'business' ? businessSize : null,
      business_code: accountType === 'business' ? generateBusinessCode() : null,
      cac_number: accountType === 'business' ? cacNumber.trim() : null,
      bike_owner: accountType === 'rider' ? bikeOwner : 'self',
      worker_type: accountType === 'rider' ? workerType : null,
      vehicle_type: accountType === 'rider' ? (workerType === 'rider' ? 'bike' : vehicleType) : null,
    };
    const { data, error } = await supabase.from('riders').insert(payload).select().single();
    if (error) {
      if (error.message.includes('riders_phone_unique') || error.message.includes('duplicate key') && error.message.includes('phone')) {
        toast.error('This phone number is already registered. Please use a different one.');
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }
    // Increment platform stats
    const statKey = accountType === 'business' ? 'total_businesses' : 'total_riders';
    await supabase.rpc('increment_platform_stat', { key: statKey, amount: 1 });
    toast.success('Rider / Driver profile created!');
    onComplete(data as unknown as RiderProfile);
    setLoading(false);
  };

  const businessTiers = [
    { key: 'small' as const, label: 'Small', desc: 'Up to 10 riders', icon: '🏪' },
    { key: 'medium' as const, label: 'Medium', desc: '11 – 50 riders', icon: '🏢' },
    { key: 'large' as const, label: 'Large', desc: '50+ riders', icon: '🏗️' },
  ];

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-6">
        <Bike className="w-12 h-12 text-primary mx-auto mb-3" />
        <h2 className="font-heading text-xl font-bold text-foreground">Complete Your Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Set up your rider profile to continue</p>
      </div>
      <form onSubmit={handleSetup} className="space-y-4 bg-card rounded-lg ring-1 ring-border p-6">
        <div>
          <label className="text-xs font-medium text-foreground">Full Name</label>
          <input required value={fullName} onChange={e => setFullName(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="John Doe" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Phone Number *</label>
          <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="08012345678" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Location (City/State)</label>
          <input required value={location} onChange={e => setLocation(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Lagos, Nigeria" />
        </div>

        <PostcodeGeneratorMini value={postcode} onChange={setPostcode} />

        {/* Account Type */}
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">Are you registering as:</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setAccountType('rider'); setJoinCompany(false); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg ring-1 text-sm font-medium transition-all ${accountType === 'rider' ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground hover:ring-primary/40'}`}>
              <Bike className="w-4 h-4" /> Rider / Driver
            </button>
            <button type="button" onClick={() => { setAccountType('business'); setJoinCompany(false); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg ring-1 text-sm font-medium transition-all ${accountType === 'business' ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground hover:ring-primary/40'}`}>
              <Building2 className="w-4 h-4" /> Business
            </button>
          </div>
        </div>

        {/* Rider/Driver: worker type, vehicle, bike ownership + join company */}
        {accountType === 'rider' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">I am a *</label>
                <select
                  value={workerType}
                  onChange={e => {
                    const v = e.target.value as 'rider' | 'driver';
                    setWorkerType(v);
                    if (v === 'rider') setVehicleType('bike');
                    else if (vehicleType === 'bike') setVehicleType('car');
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="rider">🚴 Rider (bike)</option>
                  <option value="driver">🚗 Driver</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Vehicle *</label>
                {workerType === 'rider' ? (
                  <div className="w-full rounded-md border border-input bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
                    🚴 Bike
                  </div>
                ) : (
                  <select
                    value={vehicleType === 'bike' ? 'car' : vehicleType}
                    onChange={e => setVehicleType(e.target.value as 'car' | 'bus' | 'truck')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="car">🏍️ Motorcycle</option>
                    <option value="bus">🚐 Van</option>
                    <option value="truck">🚚 Truck</option>
                  </select>
                )}
              </div>
            </div>

            <div className="bg-secondary/60 rounded-lg p-3 space-y-3">
              <label className="text-xs font-medium text-foreground block">Are you the owner of the vehicle? *</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setBikeOwner('self')}
                  className={`py-2.5 rounded-lg ring-1 text-xs font-medium transition-all ${bikeOwner === 'self' ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground'}`}>
                  🏍️ Yes, I own it
                </button>
                <button type="button" onClick={() => setBikeOwner('business')}
                  className={`py-2.5 rounded-lg ring-1 text-xs font-medium transition-all ${bikeOwner === 'business' ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground'}`}>
                  🏢 No, company vehicle
                </button>
              </div>
            </div>

            <div className="bg-secondary/60 rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={joinCompany} onChange={e => setJoinCompany(e.target.checked)}
                  className="rounded border-input" />
                <span className="text-xs font-medium text-foreground">I'm registering under a company</span>
              </label>
              {joinCompany && (
                <p className="text-[10px] text-muted-foreground">
                  You can search and request to join your company after completing registration. Your company will need to approve your request.
                </p>
              )}
            </div>
          </>
        )}

        {/* Business fields */}
        {accountType === 'business' && (
          <>
            <div>
              <label className="text-xs font-medium text-foreground">Business Name</label>
              <input required value={businessName} onChange={e => setBusinessName(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Your Company Ltd." />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">CAC Registration Number *</label>
              <input required value={cacNumber} onChange={e => setCacNumber(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. RC1234567" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Corporate Affairs Commission number (required)</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-2 block">Business Size</label>
              <div className="grid grid-cols-3 gap-2">
                {businessTiers.map(t => (
                  <button key={t.key} type="button" onClick={() => setBusinessSize(t.key)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg ring-1 text-xs font-medium transition-all ${businessSize === t.key ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground hover:ring-primary/40'}`}>
                    <span className="text-lg">{t.icon}</span>
                    <span className="font-semibold">{t.label}</span>
                    <span className="text-[10px] opacity-70">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              A unique business code will be generated for you. Share it with your riders so they can find and join your company.
            </p>
          </>
        )}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Complete Setup
        </button>
      </form>
    </div>
  );
}
