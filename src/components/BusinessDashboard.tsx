import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RiderProfile } from '@/components/RiderAuth';
import {
  Building2, Trash2, MapPin, Phone, Mail, Send,
  BarChart3, Package, CheckCircle, XCircle, Clock, MessageCircle,
  ChevronDown, ChevronUp, Users, RefreshCw, UserPlus, Navigation, Eye, Loader2, Lock,
  Calendar, FileText, TrendingUp, Radio, Wallet, ArrowUpRight,
  Banknote, Star, Palette, Zap, Gift
} from 'lucide-react';
import { toast } from 'sonner';
import { Copy as CopyIcon, X as XIcon } from 'lucide-react';
import SubscribeModal from '@/components/SubscribeModal';
import AddRiderModal from '@/components/business/AddRiderModal';
import { Link } from 'react-router-dom';
import BulkMessaging from '@/components/business/BulkMessaging';
import ShiftScheduler from '@/components/business/ShiftScheduler';
import InvoiceGenerator from '@/components/business/InvoiceGenerator';
import FleetReport from '@/components/business/FleetReport';
import LiveFleetMap from '@/components/business/LiveFleetMap';
import DistanceCalculator from '@/components/DistanceCalculator';
import { ProofImage } from '@/components/ProofImage';
import CodReconciliation from '@/components/business/CodReconciliation';
import RatingsSummary from '@/components/business/RatingsSummary';
import BrandingSettings from '@/components/business/BrandingSettings';
import DeliveryZones from '@/components/business/DeliveryZones';
import AutoAssignSettings from '@/components/business/AutoAssignSettings';
import ReferralDashboard from '@/components/rider/ReferralDashboard';

function WalletSummaryCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [sub, setSub] = useState<{ plan_code: string; status: string; next_renewal_at: string | null } | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingTotal, setPendingTotal] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: w }, { data: s }, { data: pend }] = await Promise.all([
        supabase.from('business_wallets').select('balance_ngn').eq('business_user_id', u.user.id).maybeSingle(),
        supabase.from('business_subscriptions').select('plan_code, status, next_renewal_at').eq('business_user_id', u.user.id).in('status', ['active','past_due']).maybeSingle(),
        supabase.from('wallet_transactions').select('amount').eq('business_user_id', u.user.id).eq('type','credit').eq('status','pending').eq('payment_method','bank_transfer'),
      ]);
      if (cancelled) return;
      setBalance(Number((w as any)?.balance_ngn ?? 0));
      setSub((s as any) || null);
      const rows = (pend as any[]) || [];
      setPendingCount(rows.length);
      setPendingTotal(rows.reduce((a, r) => a + Number(r.amount || 0), 0));
    };
    load();
    const ch = supabase.channel('biz-dash-wallet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_wallets' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_subscriptions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);
  return (
    <div className="bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <Wallet className="w-3 h-3" /> Wallet
        </p>
        <p className="font-heading text-xl font-bold text-foreground">{balance == null ? '—' : `₦${balance.toLocaleString()}`}</p>
        {sub && (
          <p className="text-[10px] text-muted-foreground capitalize">
            {sub.plan_code.replace('_',' ')} · <span className={sub.status === 'past_due' ? 'text-destructive' : 'text-primary'}>{sub.status.replace('_',' ')}</span>
            {sub.next_renewal_at && ` · renews ${new Date(sub.next_renewal_at).toLocaleDateString()}`}
          </p>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Link to="/wallet" className="text-xs font-semibold px-3 py-2 rounded-md bg-primary text-primary-foreground">Open wallet</Link>
        <Link to="/billing" className="text-xs font-semibold px-3 py-2 rounded-md bg-secondary">Plans</Link>
      </div>
      </div>
      {pendingCount > 0 && (
        <div className="rounded-lg bg-secondary/60 ring-1 ring-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-foreground font-bold">Transfer awaiting verification</p>
              <p className="text-[10px] text-muted-foreground">Confirmation pending admin review</p>
            </div>
          </div>
          <div className="rounded-md bg-background/60 ring-1 ring-border divide-y divide-border text-[11px]">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground">Pending transfers</span>
              <span className="font-bold text-foreground">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground">Total amount</span>
              <span className="font-heading font-bold text-foreground">₦{pendingTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Awaiting verification
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Your wallet will be credited once admin verifies the transfer (usually within 1 hour).
          </p>
        </div>
      )}
    </div>
  );
}

interface BusinessRider {
  id: string;
  rider_name: string;
  rider_phone: string;
  email: string | null;
  location: string | null;
  status: string;
  last_lat: number | null;
  last_lng: number | null;
  last_postcode: string | null;
  last_seen: string | null;
  rider_live_status?: 'available' | 'delivering' | 'offline' | null;
  location_sharing?: boolean | null;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  worker_type?: string | null;
  vehicle_type?: string | null;
}

interface DeliveryLog {
  id: string;
  customer_name: string;
  from_postcode: string | null;
  to_postcode: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  proof_photo_url?: string | null;
  proof_delivery_id?: string | null;
  share_code?: string | null;
}

interface Message {
  id: string;
  message: string;
  direction: string;
  created_at: string;
}

const RIDER_LIMITS: Record<string, number> = { standard: 10, premium: 40 };

function normalizeTierKey(size: string | null | undefined): 'standard' | 'premium' {
  if (!size || size === 'small') return 'standard';
  if (size === 'medium' || size === 'large' || size === 'premium') return 'premium';
  return 'standard';
}

function PremiumLockCard({ title, description, onUpgrade }: { title: string; description: string; onUpgrade: () => void }) {
  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-6 text-center space-y-3">
      <Lock className="w-10 h-10 text-muted-foreground/40 mx-auto" />
      <p className="text-sm font-heading font-bold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <p className="text-[11px] text-muted-foreground">
        Available on <span className="text-primary font-bold">Premium</span> — upgrade to unlock.
      </p>
      <button onClick={onUpgrade} className="bg-primary text-primary-foreground text-xs font-bold px-5 py-2 rounded-lg">
        Upgrade to Premium →
      </button>
    </div>
  );
}
function tierLabel(size: string | null | undefined): string {
  const key = normalizeTierKey(size);
  return key === 'premium' ? 'Premium' : 'Standard';
}

const hasCoords = (rider: BusinessRider) =>
  typeof rider.last_lat === 'number' && Number.isFinite(rider.last_lat) &&
  typeof rider.last_lng === 'number' && Number.isFinite(rider.last_lng);

const locationLabel = (rider: BusinessRider) =>
  rider.last_postcode || (hasCoords(rider) ? 'GPS shared' : 'No location');

const liveStatusLabel = (rider: BusinessRider) =>
  (rider.rider_live_status || (rider.status === 'active' ? 'available' : 'offline')).replace('_', ' ');

export default function BusinessDashboard({ profile }: { profile: RiderProfile }) {
  const [riders, setRiders] = useState<BusinessRider[]>([]);
  const [expandedRider, setExpandedRider] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'riders' | 'earnings' | 'requests' | 'map' | 'analytics' | 'broadcast' | 'shifts' | 'invoices' | 'reports' | 'subscription' | 'cod' | 'feedback' | 'ops' | 'refer'>('overview');
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [invitingRider, setInvitingRider] = useState(false);
  const [showAddRider, setShowAddRider] = useState(false);
  const [activePlanCode, setActivePlanCode] = useState<string | null>(null);

  // Determine plan tier from EITHER the active subscription plan_code OR the
  // legacy business_size column, so premium subscribers whose profile.business_size
  // was never updated still get premium features.
  const subscriptionTier: 'standard' | 'premium' | null =
    activePlanCode === 'fleet_premium' ? 'premium'
    : activePlanCode === 'fleet_standard' ? 'standard'
    : null;
  const planTier = subscriptionTier ?? normalizeTierKey(profile.business_size);
  const maxRiders = RIDER_LIMITS[planTier] || 10;
  const hasPaid = true; // Free for all during testing phase
  const hasInAppMap = true; // All plans get in-app map during testing

  useEffect(() => { loadRiders(); loadJoinRequests(); loadSubscription(); }, [profile.id]);

  const loadSubscription = async () => {
    const { data } = await supabase
      .from('business_subscriptions')
      .select('plan_code, status')
      .eq('business_user_id', profile.user_id)
      .in('status', ['active', 'past_due', 'trialing'])
      .maybeSingle();
    setActivePlanCode((data as any)?.plan_code ?? null);
  };

  // Real-time notifications for delivery status changes
  useEffect(() => {
    const channel = supabase
      .channel('business-delivery-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_trackings',
          filter: `business_user_id=eq.${profile.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          if (updated.status !== old.status) {
            if (updated.status === 'delivered') {
              toast.success(`✅ Delivery to ${updated.customer_name} completed!`, { duration: 8000 });
            } else if (updated.status === 'failed') {
              toast.error(`❌ Delivery to ${updated.customer_name} failed`, { duration: 8000 });
            } else if (updated.status === 'accepted') {
              toast.info(`👍 ${updated.rider_name || 'Rider'} accepted delivery to ${updated.customer_name}`, { duration: 5000 });
            } else if (updated.status === 'en_route_pickup') {
              toast.info(`🚴 ${updated.rider_name || 'Rider'} is on the way to pick up for ${updated.customer_name}`, { duration: 5000 });
            } else if (updated.status === 'picked_up') {
              toast.info(`📦 ${updated.rider_name || 'Rider'} picked up delivery for ${updated.customer_name}`, { duration: 5000 });
            } else if (updated.status === 'in_transit') {
              toast.info(`🚴 ${updated.rider_name || 'Rider'} is on the way to deliver to ${updated.customer_name}`, { duration: 5000 });
            }
            // Auto-refresh riders to update stats
            loadRiders();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.id]);

  const loadJoinRequests = async () => {
    const { data } = await supabase
      .from('rider_join_requests')
      .select('*')
      .eq('business_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      const riderIds = [...new Set(data.map(r => r.rider_id))];
      const { data: riderProfiles } = await supabase.rpc('get_rider_details', { rider_ids: riderIds });
      const riderMap = new Map((riderProfiles || []).map((r: any) => [r.id, r]));
      setJoinRequests(data.map(r => ({
        ...r,
        rider_name: riderMap.get(r.rider_id)?.full_name || 'Unknown',
        rider_phone: riderMap.get(r.rider_id)?.phone || '',
        rider_location: riderMap.get(r.rider_id)?.location || '',
        rider_postcode: riderMap.get(r.rider_id)?.postcode || '',
      })));
    } else {
      setJoinRequests([]);
    }
  };

  const handleJoinRequest = async (reqId: string, riderId: string, riderName: string, riderPhone: string, riderLocation: string, accept: boolean) => {
    if (accept) {
      const { error: insertErr } = await supabase.from('business_riders').insert({
        business_user_id: profile.id,
        rider_name: riderName,
        rider_phone: riderPhone,
        location: riderLocation || null,
        linked_rider_id: riderId,
      });
      if (insertErr) { toast.error(insertErr.message); return; }
    }
    
    const { error } = await supabase.from('rider_join_requests')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', reqId);
    if (error) toast.error(error.message);
    else toast.success(accept ? 'Rider accepted!' : 'Request rejected');
    loadJoinRequests();
    if (accept) loadRiders();
  };

  const loadRiders = async () => {
    const { data } = await supabase
      .from('business_riders')
      .select('*')
      .eq('business_user_id', profile.id)
      .order('created_at', { ascending: false });
    setRiders((data || []) as unknown as BusinessRider[]);
  };

  const activeRiders = riders.filter(r => (r.rider_live_status || 'offline') !== 'offline' && r.location_sharing).length;
  const totalDeliveries = riders.reduce((s, r) => s + (r.total_deliveries || 0), 0);
  const totalSuccess = riders.reduce((s, r) => s + (r.successful_deliveries || 0), 0);
  const successRate = totalDeliveries > 0 ? Math.round((totalSuccess / totalDeliveries) * 100) : 0;
  const pendingCount = joinRequests.filter(r => r.status === 'pending').length;

  const tabs = [
    { key: 'overview' as const, icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Overview' },
    { key: 'riders' as const, icon: <Users className="w-3.5 h-3.5" />, label: 'Riders / Drivers' },
    { key: 'cod' as const, icon: <Banknote className="w-3.5 h-3.5" />, label: 'COD' },
    { key: 'feedback' as const, icon: <Star className="w-3.5 h-3.5" />, label: 'Feedback', premium: true },
    { key: 'ops' as const, icon: <Zap className="w-3.5 h-3.5" />, label: 'Ops', premium: true },
    { key: 'earnings' as const, icon: <Wallet className="w-3.5 h-3.5" />, label: 'Earnings' },
    { key: 'requests' as const, icon: <UserPlus className="w-3.5 h-3.5" />, label: `Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { key: 'map' as const, icon: <MapPin className="w-3.5 h-3.5" />, label: 'Map' },
    { key: 'broadcast' as const, icon: <Radio className="w-3.5 h-3.5" />, label: 'Broadcast', premium: true },
    { key: 'shifts' as const, icon: <Calendar className="w-3.5 h-3.5" />, label: 'Shifts', premium: true },
    { key: 'invoices' as const, icon: <FileText className="w-3.5 h-3.5" />, label: 'Invoices', premium: true },
    { key: 'reports' as const, icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Reports', premium: true },
    { key: 'analytics' as const, icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Analytics', premium: true },
    { key: 'refer' as const, icon: <Gift className="w-3.5 h-3.5" />, label: 'Refer & Earn' },
    { key: 'subscription' as const, icon: <Package className="w-3.5 h-3.5" />, label: 'Plan' },
  ] as Array<{ key: typeof activeView; icon: JSX.Element; label: string; premium?: boolean }>;

  const isPremium = planTier === 'premium';
  const isPremiumTab = (key: typeof activeView) =>
    tabs.find(t => t.key === key)?.premium === true;

  const handleTabClick = (key: typeof activeView) => {
    if (!hasPaid && key !== 'subscription') {
      toast.error('Please choose a plan and complete payment first');
      setActiveView('subscription');
      return;
    }
    if (isPremiumTab(key) && !isPremium) {
      toast.error('This feature is available on the Premium plan. Upgrade to unlock it.');
      setActiveView('subscription');
      return;
    }
    setActiveView(key);
  };

  return (
    <div className="space-y-3">
      {/* Paywall banner */}
      {!hasPaid && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center gap-3">
          <Lock className="w-5 h-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-destructive">Subscription Required</p>
            <p className="text-xs text-destructive/80">Choose a plan and complete payment to access your dashboard features.</p>
          </div>
        </div>
      )}

      {/* Wallet summary (business only) */}
      <WalletSummaryCard />

      {/* Dashboard Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => handleTabClick(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap px-2 ${activeView === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'} ${(!hasPaid && t.key !== 'subscription') || (t.premium && !isPremium) ? 'opacity-60' : ''}`}>
            {(!hasPaid && t.key !== 'subscription') || (t.premium && !isPremium) ? <Lock className="w-3 h-3" /> : t.icon} {t.label}
            {t.premium && !isPremium && <span className="ml-1 text-[8px] font-bold uppercase tracking-wider text-primary">Pro</span>}
          </button>
        ))}
      </div>

      {activeView === 'overview' && hasPaid && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard icon={<Users className="w-4 h-4" />} label="Active Riders / Drivers" value={`${activeRiders}/${riders.length}`} color="text-primary" />
            <StatCard icon={<Package className="w-4 h-4" />} label="Total Deliveries" value={String(totalDeliveries)} color="text-primary" />
            <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Success Rate" value={`${successRate}%`} color="text-green-600" />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Package Tier" value={planTier === 'premium' ? 'Premium' : 'Standard'} color="text-primary" />
          </div>

          {pendingCount > 0 && (
            <div className="bg-primary/10 rounded-lg p-3 flex items-center gap-3 animate-fade-up">
              <UserPlus className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{pendingCount} Pending Request{pendingCount > 1 ? 's' : ''}</p>
                <p className="text-xs text-muted-foreground">Riders / Drivers want to join your company</p>
              </div>
              <button onClick={() => setActiveView('requests')} className="text-xs text-primary font-medium hover:underline">View</button>
            </div>
          )}

          <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-heading font-bold text-foreground">Rider / Driver Status</p>
              <button onClick={loadRiders} className="text-muted-foreground hover:text-primary"><RefreshCw className="w-3.5 h-3.5" /></button>
            </div>
            {riders.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No riders / drivers yet. Share your business code with them.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {riders.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${(r.rider_live_status || 'offline') !== 'offline' && r.location_sharing ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      <div>
                        <p className="text-xs font-medium text-foreground">{r.rider_name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{locationLabel(r)} · {liveStatusLabel(r)} · {r.total_deliveries} deliveries</p>
                      </div>
                    </div>
                  </div>
                ))}
                {riders.length > 5 && <p className="text-[10px] text-center text-muted-foreground">+{riders.length - 5} more riders / drivers</p>}
              </div>
            )}
          </div>

          {/* Distance Calculator */}
          <DistanceCalculator planTier={planTier} />
        </div>
      )}

      {activeView === 'riders' && hasPaid && (
        <div className="space-y-3">
          <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Manage Riders / Drivers ({riders.length}/{maxRiders})
              </p>
              <button
                onClick={() => setShowAddRider(true)}
                disabled={riders.length >= maxRiders}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50">
                <UserPlus className="w-3.5 h-3.5" /> Add Rider
              </button>
            </div>

            {riders.length >= maxRiders && (
              <div className="bg-destructive/10 text-destructive text-xs rounded-lg p-2 text-center">
                You've reached the {planTier === 'premium' ? 'Premium' : 'Standard'} plan limit of {maxRiders} riders / drivers. Upgrade to add more.
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">Riders / Drivers join by searching your business code: <span className="font-mono text-primary font-bold">{profile.business_code}</span></p>

            {riders.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No riders / drivers added yet</p>
            ) : (
              <div className="space-y-2">
                {riders.map(r => (
                  <RiderRow key={r.id} rider={r} businessId={profile.id} isPremium={isPremium}
                    expanded={expandedRider === r.id}
                    onToggle={() => setExpandedRider(expandedRider === r.id ? null : r.id)}
                    onReload={loadRiders}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddRider && (
        <AddRiderModal
          businessCode={profile.business_code || ''}
          businessName={profile.business_name || ''}
          onClose={() => setShowAddRider(false)}
          onGoToRequests={() => { setShowAddRider(false); setActiveView('requests'); }}
        />
      )}

      {activeView === 'requests' && hasPaid && (
        <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Join Requests
            </p>
            <button onClick={loadJoinRequests} className="text-muted-foreground hover:text-primary"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>

          {profile.business_code && (
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Share this code with your riders / drivers</p>
              <p className="font-mono font-bold text-lg text-primary">{profile.business_code}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Or share your phone number</p>
            </div>
          )}

          {/* Manually invite an existing rider by email or rider ID */}
          <div className="bg-secondary/40 rounded-lg p-3 space-y-2">
            <p className="text-[11px] font-semibold text-foreground">Invite an existing rider</p>
            <p className="text-[10px] text-muted-foreground leading-snug">
              If a rider already has a Loca8tor account, add them by their sign-up email, referral code, or rider ID. They'll get an invite to accept from their dashboard.
            </p>
            <div className="flex gap-2">
              <input
                value={inviteIdentifier}
                onChange={(e) => setInviteIdentifier(e.target.value)}
                placeholder="rider@email.com or REF-XXXXXX"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground"
              />
              <button
                disabled={invitingRider || !inviteIdentifier.trim()}
                onClick={async () => {
                  setInvitingRider(true);
                  const { data, error } = await (supabase as any).rpc('business_invite_rider', {
                    _identifier: inviteIdentifier.trim(),
                  });
                  setInvitingRider(false);
                  const row: any = data || {};
                  if (error || !row?.ok) {
                    toast.error(row?.message || row?.error || error?.message || 'Could not send invite');
                    return;
                  }
                  toast.success(row.duplicate ? 'Invite already sent to this rider' : 'Invite sent — waiting for rider to accept');
                  setInviteIdentifier('');
                  loadJoinRequests();
                }}
                className="text-xs font-semibold px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-60"
              >
                {invitingRider ? '…' : 'Invite'}
              </button>
            </div>
          </div>

          {joinRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No join requests yet. Share your business code with riders / drivers.</p>
          ) : (
            <div className="space-y-2">
            {joinRequests.map(r => (
                <div key={r.id} className="bg-secondary/40 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{r.rider_name}</p>
                      <div className="text-[10px] text-muted-foreground space-y-0.5 mt-1">
                        <p><Phone className="w-2.5 h-2.5 inline mr-1" />{r.rider_phone}</p>
                        {r.rider_location && <p><MapPin className="w-2.5 h-2.5 inline mr-1" />{r.rider_location}</p>}
                        {r.rider_postcode && <p className="font-mono text-primary">📍 {r.rider_postcode}</p>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      r.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>{r.status}</span>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleJoinRequest(r.id, r.rider_id, r.rider_name, r.rider_phone, r.rider_location, true)}
                        className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Accept
                      </button>
                      <button onClick={() => handleJoinRequest(r.id, r.rider_id, r.rider_name, r.rider_phone, r.rider_location, false)}
                        className="flex-1 bg-destructive/10 text-destructive text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'earnings' && hasPaid && <BusinessEarningsLog businessId={profile.id} riders={riders} />}

      {activeView === 'map' && hasPaid && (
        <LiveFleetMap riders={riders} onRefresh={loadRiders} />
      )}

      {activeView === 'broadcast' && hasPaid && (isPremium
        ? <BulkMessaging riders={riders} businessId={profile.id} />
        : <PremiumLockCard title="Broadcast Messaging" description="Send bulk announcements to all your riders / drivers at once." onUpgrade={() => setActiveView('subscription')} />)}

      {activeView === 'shifts' && hasPaid && (isPremium
        ? <ShiftScheduler riders={riders} />
        : <PremiumLockCard title="Shift Scheduling" description="Plan and assign rider shifts from the business dashboard. Riders can still clock in themselves from their app." onUpgrade={() => setActiveView('subscription')} />)}

      {activeView === 'invoices' && hasPaid && (isPremium
        ? <InvoiceGenerator riders={riders} businessName={profile.business_name || ''} />
        : <PremiumLockCard title="Invoice Generator" description="Create branded invoices for your deliveries and customers." onUpgrade={() => setActiveView('subscription')} />)}

      {activeView === 'reports' && hasPaid && (isPremium
        ? <FleetReport riders={riders as any} businessName={profile.business_name || ''} businessId={profile.id} />
        : <PremiumLockCard title="Fleet Reports" description="Detailed delivery reports and rider performance exports." onUpgrade={() => setActiveView('subscription')} />)}

      {activeView === 'analytics' && hasPaid && (isPremium
        ? <BusinessAnalytics riders={riders} businessId={profile.id} />
        : <PremiumLockCard title="Analytics" description="Deep dives into fleet performance, delivery volume and revenue trends." onUpgrade={() => setActiveView('subscription')} />)}

      {activeView === 'cod' && hasPaid && <CodReconciliation businessId={profile.id} />}

      {activeView === 'feedback' && hasPaid && (isPremium ? (
        <div className="space-y-3">
          <RatingsSummary businessId={profile.id} />
          <BrandingSettings businessId={profile.id} />
        </div>
      ) : (
        <PremiumLockCard title="Customer Feedback & Branding" description="Collect ratings, tips, and customise your customer-facing tracking page." onUpgrade={() => setActiveView('subscription')} />
      ))}

      {activeView === 'ops' && hasPaid && (isPremium ? (
        <div className="space-y-3">
          <AutoAssignSettings
            businessId={profile.id}
            initialEnabled={(profile as any).auto_assign_enabled || false}
            initialRadius={(profile as any).auto_assign_radius_km || 10}
          />
          <DeliveryZones businessId={profile.id} />
        </div>
      ) : (
        <PremiumLockCard title="Auto-assign & Delivery Zones" description="Route optimisation and automatic delivery assignment based on rider zones." onUpgrade={() => setActiveView('subscription')} />
      ))}

      {activeView === 'subscription' && <SubscriptionPanel profile={profile} planTier={planTier} currentRiderCount={riders.length} onUpgrade={async (newSize: string) => {
        // NOTE: subscription_status is set by the Paga/Stripe webhook (server-side, after confirmed payment).
        // The client must NEVER flip it to 'active' directly — that previously allowed dismissing the
        // checkout modal to mark an unpaid account as active.
        await supabase.from('riders').update({ business_size: newSize }).eq('id', profile.id);
        toast.success(`Package selected: ${newSize}. Status will update once payment is confirmed.`);
        window.location.reload();
      }} />}

      {activeView === 'refer' && hasPaid && (
        <div className="bg-card rounded-lg ring-1 ring-border p-4">
          <div className="mb-3 rounded-lg bg-primary/10 ring-1 ring-primary/30 px-3 py-2">
            <p className="text-xs font-bold text-foreground">Refer a business and earn ₦2,000</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Credited to your referral balance after the referred business pays their first subscription (post 7-day trial).</p>
          </div>
          <ReferralDashboard riderId={profile.id} referralCode={(profile as any).referral_code || null} />
        </div>
      )}
    </div>
  );
}

/* ─── Live Rider Map ─── */
function LiveRiderMap({ riders, onRefresh }: { riders: BusinessRider[]; onRefresh: () => void }) {
  const ridersWithLocation = riders.filter(r => r.last_lat && r.last_lng);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeDeliveries, setActiveDeliveries] = useState<Record<string, any[]>>({});

  // Load active deliveries for all riders
  const loadActiveDeliveries = async () => {
    const riderIds = riders.map(r => r.id);
    if (riderIds.length === 0) return;
    const { data } = await supabase
      .from('delivery_trackings')
      .select('*')
      .in('business_rider_id', riderIds)
      .in('status', ['pending', 'accepted', 'en_route_pickup', 'picked_up', 'in_transit'])
      .order('created_at', { ascending: false });
    
    const grouped: Record<string, any[]> = {};
    (data || []).forEach((d: any) => {
      if (!grouped[d.business_rider_id]) grouped[d.business_rider_id] = [];
      grouped[d.business_rider_id].push(d);
    });
    setActiveDeliveries(grouped);
  };

  useEffect(() => {
    loadActiveDeliveries();
  }, [riders.length]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { onRefresh(); loadActiveDeliveries(); }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Live Rider Locations
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh
          </label>
          <button onClick={() => { onRefresh(); loadActiveDeliveries(); }} className="text-muted-foreground hover:text-primary"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary/60 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{ridersWithLocation.length}</p>
            <p className="text-[10px] text-muted-foreground">Tracked</p>
          </div>
          <div className="bg-secondary/60 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-green-600">{riders.filter(r => activeDeliveries[r.id]?.some(d => ['en_route_pickup', 'picked_up', 'in_transit'].includes(d.status))).length}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
          <div className="bg-secondary/60 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-muted-foreground">{riders.length - ridersWithLocation.length}</p>
            <p className="text-[10px] text-muted-foreground">No GPS</p>
          </div>
        </div>

        {riders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No riders yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {riders.map(r => {
              const riderDeliveries = activeDeliveries[r.id] || [];
              const inTransit = riderDeliveries.find(d => ['accepted', 'en_route_pickup', 'picked_up', 'in_transit'].includes(d.status));
              return (
                <div key={r.id} className="bg-secondary/40 rounded-lg px-3 py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${inTransit ? 'bg-blue-500 animate-pulse' : r.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      <div>
                        <p className="text-xs font-medium text-foreground">{r.rider_name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {r.last_postcode ? (
                            <><MapPin className="w-2.5 h-2.5" /> {r.last_postcode}</>
                          ) : (
                            <span className="italic">No location data</span>
                          )}
                          {r.last_seen && (
                            <span className="ml-1">· {getTimeAgo(r.last_seen)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {r.last_lat && r.last_lng && (
                      <a href={`https://www.google.com/maps?q=${r.last_lat},${r.last_lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 flex items-center gap-1 text-[10px] font-medium">
                        <Navigation className="w-3 h-3" /> View
                      </a>
                    )}
                  </div>
                  {/* Show in-transit delivery info */}
                  {inTransit && (
                    <div className={`rounded px-2 py-1.5 ml-4 ${
                      inTransit.status === 'accepted' ? 'bg-emerald-50 dark:bg-emerald-950/30' :
                      inTransit.status === 'en_route_pickup' ? 'bg-orange-50 dark:bg-orange-950/30' :
                      inTransit.status === 'picked_up' ? 'bg-blue-50 dark:bg-blue-950/30' :
                      'bg-purple-50 dark:bg-purple-950/30'
                    }`}>
                      <p className={`text-[10px] font-medium flex items-center gap-1 ${
                        inTransit.status === 'accepted' ? 'text-emerald-700 dark:text-emerald-300' :
                        inTransit.status === 'en_route_pickup' ? 'text-orange-700 dark:text-orange-300' :
                        inTransit.status === 'picked_up' ? 'text-blue-700 dark:text-blue-300' :
                        'text-purple-700 dark:text-purple-300'
                      }`}>
                        <Navigation className="w-2.5 h-2.5" />
                        {inTransit.status === 'accepted' ? 'Accepted' :
                         inTransit.status === 'en_route_pickup' ? 'On way to pick up' :
                         inTransit.status === 'picked_up' ? 'Picked up' :
                         'On way to deliver'} → {inTransit.customer_name}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {inTransit.from_postcode && `${inTransit.from_postcode} → `}{inTransit.to_postcode || 'destination'}
                      </p>
                    </div>
                  )}
                  {riderDeliveries.length > 0 && !inTransit && (
                    <p className="text-[9px] text-muted-foreground ml-4">
                      {riderDeliveries.length} pending delivery{riderDeliveries.length > 1 ? 'ies' : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-3 text-center">
      <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
      <p className="font-heading font-bold text-lg text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function RiderRow({ rider, businessId, expanded, isPremium, onToggle, onReload }: {
  rider: BusinessRider; businessId: string; expanded: boolean; isPremium: boolean; onToggle: () => void; onReload: () => void;
}) {
  const [tab, setTab] = useState<'info' | 'deliveries' | 'messages'>('info');
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [shifts, setShifts] = useState<Array<{ id: string; started_at: string; ended_at: string | null; duration_minutes: number | null }>>([]);
  const [newMsg, setNewMsg] = useState('');
  const [logForm, setLogForm] = useState({ customer: '', phone: '', from: '', to: '', status: 'pending', notes: '' });
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (expanded) {
      loadLogs();
      loadMessages();
      loadShifts();
      // Auto-refresh logs every 10s to pick up rider status updates
      const interval = setInterval(() => { loadLogs(); loadMessages(); loadShifts(); }, 10000);
      return () => clearInterval(interval);
    }
  }, [expanded, rider.id]);

  const loadShifts = async () => {
    const { data } = await supabase.from('rider_shifts')
      .select('id, started_at, ended_at, duration_minutes')
      .eq('business_rider_id', rider.id)
      .order('started_at', { ascending: false })
      .limit(10);
    setShifts((data as any[]) || []);
  };

  const loadLogs = async () => {
    // Load delivery logs
    const { data: logData } = await supabase.from('rider_delivery_logs')
      .select('*').eq('business_rider_id', rider.id)
      .order('created_at', { ascending: false }).limit(20);
    
    // Load proof photos from delivery_trackings
    const { data: trackings } = await supabase.from('delivery_trackings')
      .select('id, customer_name, from_postcode, to_postcode, proof_photo_url, share_code, status, created_at')
      .eq('business_rider_id', rider.id)
      .order('created_at', { ascending: false });
    
    // Merge proof photos + live status from delivery_trackings into rider logs.
    // Match on customer_name only (postcodes can be null vs. empty across tables).
    const trackingsByCustomer = new Map<string, any[]>();
    (trackings || []).forEach((t: any) => {
      const key = (t.customer_name || '').trim().toLowerCase();
      if (!trackingsByCustomer.has(key)) trackingsByCustomer.set(key, []);
      trackingsByCustomer.get(key)!.push(t);
    });

    const enrichedLogs = (logData || []).map((l: any) => {
      const key = (l.customer_name || '').trim().toLowerCase();
      const candidates = trackingsByCustomer.get(key) || [];
      // Prefer an exact postcode match, otherwise fall back to the newest tracking row.
      const match = candidates.find((t: any) =>
        (t.from_postcode || '') === (l.from_postcode || '') &&
        (t.to_postcode || '') === (l.to_postcode || '')
      ) || candidates[0];
      return {
        ...l,
        // Live status wins so completed deliveries stop showing "pending".
        status: match?.status || l.status,
        proof_photo_url: match?.proof_photo_url || null,
        proof_delivery_id: match?.id || null,
        share_code: match?.share_code || null,
      };
    });
    
    setLogs(enrichedLogs as unknown as DeliveryLog[]);
  };

  const loadMessages = async () => {
    const { data } = await supabase.from('rider_messages')
      .select('*').eq('business_rider_id', rider.id)
      .order('created_at', { ascending: false }).limit(30);
    setMessages((data || []) as unknown as Message[]);
  };

  const addLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    
    // Generate share code for tracking
    const shareCode = `TRK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    const { error } = await supabase.from('rider_delivery_logs').insert({
      business_rider_id: rider.id,
      business_user_id: businessId,
      customer_name: logForm.customer.trim(),
      from_postcode: logForm.from.trim() || null,
      to_postcode: logForm.to.trim() || null,
      status: logForm.status,
      notes: logForm.notes.trim() || null,
    });
    if (!error) {
      // Increment total_deliveries on assignment
      await supabase.from('business_riders').update({
        total_deliveries: (rider.total_deliveries || 0) + 1,
      }).eq('id', rider.id);
      
      // Create delivery tracking entry
      await supabase.from('delivery_trackings').insert({
        business_rider_id: rider.id,
        business_user_id: businessId,
        share_code: shareCode,
        customer_name: logForm.customer.trim(),
        customer_phone: logForm.phone.trim() || null,
        from_postcode: logForm.from.trim() || null,
        to_postcode: logForm.to.trim() || null,
        status: 'pending',
        rider_name: rider.rider_name,
        rider_phone: rider.rider_phone,
        last_lat: rider.last_lat,
        last_lng: rider.last_lng,
        last_postcode: rider.last_postcode,
        pickup_lat: rider.last_lat,
        pickup_lng: rider.last_lng,
        notes: logForm.notes.trim() || null,
      } as any);
      
      const trackUrl = `${window.location.origin}/track/${shareCode}`;
      const shareMsg = `Track your delivery from ${logForm.from.trim() || 'pickup'} to ${logForm.to.trim() || 'destination'}.\n\nTracking Code: ${shareCode}\nTrack here: ${trackUrl}`;
      
      toast.success(
        <div className="space-y-2">
          <p className="font-bold text-xs">✅ Delivery logged!</p>
          <p className="text-[10px] font-mono bg-secondary/60 px-2 py-1 rounded">{shareCode}</p>
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(trackUrl); toast.success('Link copied!'); }}
              className="flex-1 bg-primary text-primary-foreground text-[10px] font-bold py-1.5 rounded-md">📋 Copy Link</button>
            <button onClick={() => { navigator.clipboard.writeText(shareCode); toast.success('Tracking code copied!'); }}
              className="flex-1 bg-secondary text-foreground text-[10px] font-bold py-1.5 rounded-md">🔢 Copy Code</button>
          </div>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`} target="_blank" rel="noopener noreferrer"
            className="block w-full bg-green-600 text-white text-[10px] font-bold py-1.5 rounded-md text-center">💬 Share via WhatsApp</a>
        </div>,
        { duration: 15000 }
      );
      setLogForm({ customer: '', phone: '', from: '', to: '', status: 'pending', notes: '' });
      loadLogs();
      onReload();
    } else toast.error(error.message);
    setLoadingAction(false);
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setLoadingAction(true);
    const { error } = await supabase.from('rider_messages').insert({
      business_rider_id: rider.id,
      business_user_id: businessId,
      message: newMsg.trim(),
      direction: 'outbound',
    });
    if (!error) { toast.success('Message sent'); setNewMsg(''); loadMessages(); }
    else toast.error(error.message);
    setLoadingAction(false);
  };

  const toggleStatus = async () => {
    const newStatus = rider.status === 'active' ? 'inactive' : 'active';
    await supabase.from('business_riders').update({ status: newStatus }).eq('id', rider.id);
    onReload();
  };

  const removeRider = async () => {
    if (!confirm(`Remove ${rider.rider_name}? This will also delete their delivery logs and messages.`)) return;
    await supabase.from('business_riders').delete().eq('id', rider.id);
    onReload();
  };

  const riderSuccess = rider.total_deliveries > 0
    ? Math.round((rider.successful_deliveries / rider.total_deliveries) * 100) : 0;

  return (
    <div className="bg-secondary/40 rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/60 transition-colors">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${(rider.rider_live_status || 'offline') !== 'offline' && rider.location_sharing ? 'bg-green-500' : 'bg-muted-foreground'}`} />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">{rider.rider_name}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Phone className="w-2.5 h-2.5" /> {rider.rider_phone}
              <MapPin className="w-2.5 h-2.5 ml-1" /> {locationLabel(rider)}
              <span className="ml-1 capitalize">· {liveStatusLabel(rider)} · {rider.total_deliveries} deliveries · {riderSuccess}%</span>
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex gap-1 bg-background rounded p-0.5">
            {([['info', 'Info'], ['deliveries', 'Assign'], ['messages', 'Messages']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex-1 text-[10px] py-1.5 rounded font-medium ${tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {l}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background rounded p-2">
                  <p className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</p>
                  <p className="font-medium text-foreground">{rider.rider_phone}</p>
                </div>
                <div className="bg-background rounded p-2">
                  <p className="text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                  <p className="font-medium text-foreground">{rider.email || 'N/A'}</p>
                </div>
                <div className="bg-background rounded p-2">
                  <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                  <p className="font-medium text-foreground">{rider.location || 'N/A'}</p>
                </div>
                <div className="bg-background rounded p-2">
                  <p className="text-muted-foreground">Last Location</p>
                  <p className="font-medium text-foreground capitalize">{locationLabel(rider)}</p>
                </div>
              </div>
              {hasCoords(rider) && (
                <a href={`https://www.google.com/maps?q=${rider.last_lat},${rider.last_lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block text-center text-xs text-primary font-medium hover:underline">
                  📍 View on Google Maps
                </a>
              )}
              <p className="text-[10px] text-muted-foreground text-center">
                Last seen: {rider.last_seen ? new Date(rider.last_seen).toLocaleString() : 'Never'}
              </p>
              <div className="bg-background rounded-lg p-2 space-y-1">
                <p className="text-[10px] font-bold text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary" /> Shifts · {(rider.vehicle_type || 'bike')} {(rider.worker_type || 'rider')}
                </p>
                {shifts.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No shifts recorded yet.</p>
                ) : (
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {shifts.map(s => (
                      <div key={s.id} className="flex items-center justify-between text-[10px] bg-secondary/40 rounded px-2 py-1">
                        <div className="text-muted-foreground">
                          <span className="text-green-600 font-semibold">In:</span> {new Date(s.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {s.ended_at ? (
                            <> · <span className="text-red-600 font-semibold">Out:</span> {new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                          ) : (
                            <> · <span className="text-primary font-semibold animate-pulse">on shift</span></>
                          )}
                        </div>
                        <span className="text-foreground font-semibold">
                          {s.duration_minutes != null
                            ? `${Math.floor(s.duration_minutes / 60)}h ${s.duration_minutes % 60}m`
                            : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={toggleStatus}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium ${rider.status === 'active' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                  {rider.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={removeRider} className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive font-medium">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {tab === 'deliveries' && (
            <div className="space-y-2">
              <form onSubmit={addLog} className="space-y-1.5 bg-background rounded-lg p-2">
                <p className="text-[10px] font-medium text-foreground">Assign Delivery to Rider</p>
                <input required value={logForm.customer} onChange={e => setLogForm({ ...logForm, customer: e.target.value })}
                  placeholder="Customer name" className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs" />
                <input value={logForm.phone} onChange={e => setLogForm({ ...logForm, phone: e.target.value })}
                  placeholder="Customer phone number" type="tel" className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs" />
                <div className="grid grid-cols-2 gap-1.5">
                  <input value={logForm.from} onChange={e => setLogForm({ ...logForm, from: e.target.value })}
                    placeholder="From postcode" className="rounded border border-input bg-background px-2 py-1.5 text-xs" />
                  <input value={logForm.to} onChange={e => setLogForm({ ...logForm, to: e.target.value })}
                    placeholder="To postcode" className="rounded border border-input bg-background px-2 py-1.5 text-xs" />
                </div>
                <textarea value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                  placeholder="Delivery notes (optional)" rows={2} className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs resize-none" />
                <button type="submit" disabled={loadingAction}
                  className="w-full bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded font-medium disabled:opacity-60">
                  Assign Delivery
                </button>
              </form>

              {logs.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">No delivery logs yet</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {logs.map(l => (
                    <div key={l.id} className="bg-background rounded px-2 py-1.5 space-y-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-foreground">{l.customer_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {l.from_postcode && `${l.from_postcode} → `}{l.to_postcode || '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            l.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                            l.status === 'failed' ? 'bg-red-100 text-red-700' : 
                            l.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                            l.status === 'en_route_pickup' ? 'bg-orange-100 text-orange-700' :
                            l.status === 'picked_up' ? 'bg-blue-100 text-blue-700' :
                            l.status === 'in_transit' ? 'bg-purple-100 text-purple-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {l.status === 'en_route_pickup' ? 'On way to pickup' :
                             l.status === 'in_transit' ? 'On way to deliver' :
                             l.status.replace('_', ' ')}
                          </span>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(l.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {isPremium && l.proof_photo_url && l.proof_delivery_id && (
                        <div className="flex items-center gap-2 bg-secondary/40 rounded px-2 py-1">
                          <ProofImage
                            src={l.proof_photo_url}
                            deliveryId={l.proof_delivery_id}
                            alt="Delivery proof"
                            className="w-10 h-10 rounded object-cover"
                            renderDownload={(url) => (
                              <a href={url} download target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-primary font-medium hover:underline flex items-center gap-1">
                                📸 View / Download Proof
                              </a>
                            )}
                          />
                        </div>
                      )}
                      {l.share_code && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-mono bg-secondary/60 px-1.5 py-0.5 rounded text-muted-foreground">{l.share_code}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/track/${l.share_code}`;
                              navigator.clipboard.writeText(url);
                              toast.success('Tracking link copied');
                            }}
                            className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded hover:bg-primary/20"
                          >📋 Copy link</button>
                          <button
                            type="button"
                            onClick={async () => {
                              const url = `${window.location.origin}/track/${l.share_code}`;
                              const text = `Track your delivery: ${url}`;
                              if ((navigator as any).share) {
                                try { await (navigator as any).share({ title: 'Delivery tracking', text, url }); return; } catch {}
                              }
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="text-[10px] bg-green-600 text-white font-semibold px-2 py-0.5 rounded hover:brightness-110"
                          >💬 Share</button>
                          <a
                            href={`/track/${l.share_code}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-muted-foreground hover:text-foreground underline"
                          >Open</a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'messages' && (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  placeholder="Send a message to rider..."
                  className="flex-1 rounded border border-input bg-background px-2 py-1.5 text-xs"
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                />
                <button onClick={sendMessage} disabled={loadingAction || !newMsg.trim()}
                  className="bg-primary text-primary-foreground px-2 py-1.5 rounded disabled:opacity-60">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              {messages.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">No messages yet</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {messages.map(m => (
                    <div key={m.id} className={`rounded px-2 py-1.5 text-xs ${m.direction === 'outbound' ? 'bg-primary/10 ml-4' : 'bg-secondary mr-4'}`}>
                      <p className="text-foreground">{m.message}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {m.direction === 'outbound' ? 'You' : rider.rider_name} · {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BusinessAnalytics({ riders, businessId }: { riders: BusinessRider[]; businessId: string }) {
  const totalDeliveries = riders.reduce((s, r) => s + (r.total_deliveries || 0), 0);
  const totalSuccess = riders.reduce((s, r) => s + (r.successful_deliveries || 0), 0);
  const totalFailed = riders.reduce((s, r) => s + (r.failed_deliveries || 0), 0);
  const successRate = totalDeliveries > 0 ? Math.round((totalSuccess / totalDeliveries) * 100) : 0;

  const sortedByDeliveries = [...riders].sort((a, b) => (b.total_deliveries || 0) - (a.total_deliveries || 0));
  const topPerformer = sortedByDeliveries[0];

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Business Analytics
        </p>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary/60 rounded-lg p-3 text-center">
            <p className="font-heading font-bold text-xl text-foreground">{totalDeliveries}</p>
            <p className="text-[10px] text-muted-foreground">Total Deliveries</p>
          </div>
          <div className="bg-secondary/60 rounded-lg p-3 text-center">
            <p className="font-heading font-bold text-xl text-green-600">{successRate}%</p>
            <p className="text-[10px] text-muted-foreground">Success Rate</p>
          </div>
          <div className="bg-secondary/60 rounded-lg p-3 text-center">
            <p className="font-heading font-bold text-xl text-destructive">{totalFailed}</p>
            <p className="text-[10px] text-muted-foreground">Failed</p>
          </div>
        </div>

        {topPerformer && topPerformer.total_deliveries > 0 && (
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">🏆 Top Performer</p>
            <p className="text-sm font-bold text-foreground">{topPerformer.rider_name}</p>
            <p className="text-[10px] text-muted-foreground">{topPerformer.total_deliveries} deliveries · {topPerformer.total_deliveries > 0 ? Math.round((topPerformer.successful_deliveries / topPerformer.total_deliveries) * 100) : 0}% success</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-foreground mb-2">Rider Leaderboard</p>
          <div className="space-y-1.5">
            {sortedByDeliveries.map((r, i) => {
              const pct = r.total_deliveries > 0 ? Math.round((r.successful_deliveries / r.total_deliveries) * 100) : 0;
              return (
                <div key={r.id} className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                  <span className={`w-2 h-2 rounded-full ${r.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{r.rider_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">{r.total_deliveries}</p>
                    <p className="text-[9px] text-muted-foreground">{pct}% success</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-foreground mb-2">Rider Locations</p>
          <div className="space-y-1">
            {riders.filter(r => r.last_postcode || r.location).map(r => (
              <div key={r.id} className="flex items-center justify-between bg-secondary/40 rounded px-2 py-1.5 text-xs">
                <span className="text-foreground">{r.rider_name}</span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {r.last_postcode || r.location || 'Unknown'}
                </span>
              </div>
            ))}
            {riders.filter(r => r.last_postcode || r.location).length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">No location data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Subscription / Upgrade Panel ─── */
const PLANS = [
  { key: 'standard', label: 'Standard', riders: 'Up to 10 riders', price: '₦10,000/mo', amount: 10000, icon: '🏪', trial: '7-day free trial', features: ['Fleet management (up to 10 riders)', 'Bulk messaging', 'Shift scheduling', 'Rider assignment & COD reconciliation'] },
  { key: 'premium', label: 'Premium', riders: 'Up to 40 riders', price: '₦30,000/mo', amount: 30000, icon: '🚀', trial: '7-day free trial', features: ['Everything in Standard', 'Up to 40 riders', 'Live delivery tracking', 'Photo proof of delivery', 'Live rider map dashboard', 'Analytics & reports', 'Route optimization', 'Delivery zones & auto-assign', 'Invoice generator', 'Customer feedback & ratings', 'Bulk CSV import', 'Multi-branch support', 'Custom branding', 'Scheduled deliveries', 'Priority support'] },
];

function SubscriptionPanel({ profile, planTier, currentRiderCount, onUpgrade }: {
  profile: RiderProfile;
  planTier: 'standard' | 'premium';
  currentRiderCount: number;
  onUpgrade: (newSize: string) => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [annual, setAnnual] = useState(false);
  const currentPlan = planTier;
  const currentIndex = PLANS.findIndex(p => p.key === currentPlan);
  const hasPaid = true; // Free for all during testing phase

  const handleSelectPlan = (planKey: string) => {
    if (hasPaid) {
      const planIndex = PLANS.findIndex(p => p.key === planKey);
      if (planIndex <= currentIndex) return;
    }
    setSelectedPlan(planKey);
    setShowPayment(true);
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-4">
      <div>
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> Subscription Plan
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {hasPaid ? (
            <>Current plan: <span className="font-bold text-primary">{PLANS[currentIndex]?.label}</span> · {currentRiderCount} riders active</>
          ) : (
            <span className="text-destructive font-medium">⚠️ Choose a plan and pay to activate your dashboard</span>
          )}
        </p>
      </div>

      {/* Annual toggle */}
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
        <button
          onClick={() => setAnnual(!annual)}
          className={`relative w-10 h-5 rounded-full transition-colors ${annual ? 'bg-primary' : 'bg-secondary border border-border'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${annual ? 'left-[22px] bg-primary-foreground' : 'left-0.5 bg-muted-foreground'}`} />
        </button>
        <span className={`text-xs font-semibold ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>
          Annual <span className="text-primary text-[10px] font-bold">Save 15%</span>
        </span>
      </div>

      <div className="grid gap-3">
        {PLANS.map((plan, i) => {
          const isCurrent = hasPaid && plan.key === currentPlan;
          const isDowngrade = hasPaid && i < currentIndex;
          const canSelect = !hasPaid || i > currentIndex;
          return (
            <div key={plan.key}
              className={`rounded-lg ring-1 p-4 transition-all ${isCurrent ? 'ring-primary bg-primary/5' : isDowngrade ? 'ring-border opacity-50' : 'ring-border hover:ring-primary/40 cursor-pointer'}`}
              onClick={() => canSelect && handleSelectPlan(plan.key)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{plan.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{plan.label}</p>
                    <p className="text-xs text-muted-foreground">{plan.riders}</p>
                    {plan.features && (
                      <ul className="mt-1 space-y-0.5">
                        {plan.features.map((f, fi) => (
                          <li key={fi} className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="text-primary">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    {annual ? `₦${Math.round(plan.amount * 0.85).toLocaleString()}/mo` : plan.price}
                  </p>
                  {annual && (
                    <p className="text-[9px] text-muted-foreground">₦{(Math.round(plan.amount * 0.85) * 12).toLocaleString()}/yr</p>
                  )}
                  {plan.trial && <p className="text-[9px] text-primary font-bold">🎁 {plan.trial}</p>}
                  {isCurrent && <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Current</span>}
                  {canSelect && <span className="text-[10px] font-medium text-primary">{hasPaid ? 'Upgrade →' : 'Select →'}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showPayment && selectedPlan && (
        <PaymentForm
          plan={PLANS.find(p => p.key === selectedPlan)!}
          annual={annual}
          profile={profile}
          onCancel={() => { setShowPayment(false); setSelectedPlan(null); }}
          onSuccess={() => {
            setShowPayment(false);
            onUpgrade(selectedPlan);
          }}
        />
      )}
    </div>
  );
}

function PaymentForm({ plan, annual, profile, onCancel, onSuccess }: {
  plan: typeof PLANS[0];
  annual: boolean;
  profile: RiderProfile;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showMandate, setShowMandate] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const trialUsed = (profile as any)?.trial_used === true;
  const trialActive = !!(profile as any)?.trial_ends_at && new Date((profile as any).trial_ends_at).getTime() > Date.now();

  const monthlyPrice = annual ? Math.round(plan.amount * 0.85) : plan.amount;
  const totalAmount = annual ? monthlyPrice * 12 : plan.amount;
  const displayTotal = `₦${totalAmount.toLocaleString()}`;
  const billingLabel = annual ? `₦${monthlyPrice.toLocaleString()}/mo × 12 = ${displayTotal}/yr` : plan.price;

  // Map local PLANS.key → subscription_plans.code used by the paga-create-payment edge function.
  const planCodeMap: Record<string, string> = {
    standard: 'fleet_standard',
    premium: 'fleet_premium',
  };

  const startCheckout = () => setShowMandate(true);

  const startFreeTrial = async () => {
    if (trialUsed) {
      toast.error('You have already used your free trial on this account.');
      return;
    }
    setTrialLoading(true);
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('riders')
      .update({
        business_size: plan.key,
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt,
        trial_used: true,
      } as any)
      .eq('id', profile.id);
    setTrialLoading(false);
    if (error) {
      toast.error(error.message || 'Could not start free trial');
      return;
    }
    toast.success(`Your 7-day free trial of ${plan.label} has started!`);
    // Reload directly so we don't trigger onSuccess → onUpgrade which would
    // overwrite the trialing status with 'active'.
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="bg-secondary/60 rounded-lg p-4 space-y-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{profile.subscription_status === 'active' ? 'Upgrade to' : 'Subscribe to'} {plan.label}</p>
        <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-destructive">Cancel</button>
      </div>
      <div className="bg-primary/10 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-primary">{displayTotal}</p>
        <p className="text-xs text-muted-foreground">{billingLabel}</p>
        {annual && <p className="text-[10px] text-primary font-bold mt-1">🎉 You save ₦{((plan.amount * 12) - totalAmount).toLocaleString()} per year!</p>}
        <p className="text-[10px] text-muted-foreground mt-0.5">{plan.riders}</p>
      </div>

      {!trialUsed && !trialActive && (
        <div className="text-[11px] text-foreground bg-primary/10 ring-1 ring-primary/40 rounded-md p-3">
          <p className="font-heading font-bold text-primary mb-1">🎁 Start your 7-day free trial</p>
          <p>Try {plan.label} free for 7 days — <span className="font-semibold">no payment required today</span>. You won't be charged until the trial ends. After 7 days you'll be prompted to pay {displayTotal} to keep your plan active.</p>
        </div>
      )}
      {trialUsed && (
        <div className="text-[11px] text-muted-foreground bg-card ring-1 ring-border rounded-md p-3">
          You'll be taken to our secure Paga checkout, where you can pay using bank transfer, debit/credit card, bank account, USSD or Paga wallet. Your plan activates automatically once payment is confirmed.
        </div>
      )}

      {!trialUsed && !trialActive && (
        <button
          type="button"
          onClick={startFreeTrial}
          disabled={trialLoading || loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60"
        >
          {trialLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Start 7-day Free Trial
        </button>
      )}

      <button
        type="button"
        onClick={startCheckout}
        disabled={loading || trialLoading}
        className={`w-full flex items-center justify-center gap-2 font-heading font-semibold text-sm py-3 rounded-lg transition-all disabled:opacity-60 ${(!trialUsed && !trialActive) ? 'bg-secondary text-foreground ring-1 ring-border hover:bg-secondary/80' : 'bg-primary text-primary-foreground shadow-md hover:shadow-lg'}`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Pay {displayTotal} with Paga {annual ? '(Annual)' : ''} now
      </button>
      <p className="text-[10px] text-muted-foreground text-center">Secured by Paga · You can cancel anytime from Billing.</p>
      {showMandate && (
        <SubscribeModal
          plan={{
            code: planCodeMap[plan.key] || plan.key,
            name: plan.label,
            amount: totalAmount,
            cycle: annual ? 'annual' : 'monthly',
          }}
          defaults={{
            full_name: profile.full_name,
            email: (profile as any).email,
            phone: profile.phone,
          }}
          onSuccess={() => { onSuccess(); }}
          onClose={() => { setShowMandate(false); }}
        />
      )}
    </div>
  );
}

/* ─── Business Earnings Log ─── */
function BusinessEarningsLog({ businessId, riders }: { businessId: string; riders: BusinessRider[] }) {
  const [earnings, setEarnings] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'delivery_fee' | 'contract' | 'bonus' | 'other'>('delivery_fee');
  const [loading, setLoading] = useState(false);

  const loadEarnings = async () => {
    const { data } = await supabase
      .from('business_earnings')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(100);
    setEarnings((data || []) as any[]);
  };

  useEffect(() => { loadEarnings(); }, [businessId]);

  const today = new Date().toISOString().split('T')[0];
  const todayTotal = earnings.filter(e => e.created_at?.startsWith(today)).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const weekKey = weekStart.toISOString().split('T')[0];
  const weekTotal = earnings.filter(e => e.created_at >= weekKey).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const allTotal = earnings.reduce((s: number, e: any) => s + Number(e.amount), 0);

  const addEarning = async () => {
    if (!amount || isNaN(Number(amount))) return;
    setLoading(true);
    const { error } = await supabase.from('business_earnings').insert({
      business_id: businessId,
      amount: Number(amount),
      description: desc || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type,
    } as any);
    if (error) toast.error(error.message);
    else { setAmount(''); setDesc(''); setShowAdd(false); loadEarnings(); }
    setLoading(false);
  };

  const deleteEarning = async (id: string) => {
    await supabase.from('business_earnings').delete().eq('id', id);
    setEarnings(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" /> Business Earnings
        </p>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-primary font-medium hover:underline">
          {showAdd ? 'Cancel' : '+ Log Payment'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-primary/5 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Today</p>
          <p className="font-heading font-bold text-sm text-primary">₦{todayTotal.toLocaleString()}</p>
        </div>
        <div className="bg-secondary rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">This Week</p>
          <p className="font-heading font-bold text-sm text-foreground">₦{weekTotal.toLocaleString()}</p>
        </div>
        <div className="bg-secondary rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">All Time</p>
          <p className="font-heading font-bold text-sm text-foreground">₦{allTotal.toLocaleString()}</p>
        </div>
      </div>

      {showAdd && (
        <div className="space-y-2 bg-secondary/40 rounded-lg p-3">
          <div className="flex gap-2">
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₦)"
              type="number" className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <select value={type} onChange={e => setType(e.target.value as any)}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm">
              <option value="delivery_fee">Delivery Fee</option>
              <option value="contract">Contract</option>
              <option value="bonus">Bonus</option>
              <option value="other">Other</option>
            </select>
          </div>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={addEarning} disabled={loading} className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg disabled:opacity-60">
            {loading ? 'Saving...' : 'Add Payment'}
          </button>
        </div>
      )}

      {earnings.length > 0 ? (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {earnings.slice(0, 20).map((e: any) => (
            <div key={e.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-1.5">
              <div>
                <p className="text-xs font-medium text-foreground">{e.description}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-primary flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> ₦{Number(e.amount).toLocaleString()}
                </p>
                <button onClick={() => deleteEarning(e.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">No payments logged yet</p>
      )}
    </div>
  );
}
