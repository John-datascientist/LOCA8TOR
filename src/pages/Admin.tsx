import { useState, useEffect, lazy, Suspense } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Shield, MapPin, X, ChevronRight, Globe, BarChart3, Trash2, Edit, Merge, AlertTriangle, Search, RefreshCw, Download, Mail, Users, MessageSquare, Plus, Wallet, KeyRound, Gift, Ban, XCircle, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/loca8tor-logo-green.png';
import { getUserIp } from '@/lib/ipAddress';
const LiveAnalyticsPanel = lazy(() => import('@/components/admin/LiveAnalyticsPanel'));
const WithdrawalCandidates = lazy(() => import('@/components/admin/WithdrawalCandidates'));
const WhatsappAndBansPanel = lazy(() => import('@/components/admin/WhatsappAndBansPanel'));
const BusinessAccountsPanel = lazy(() => import('@/components/admin/BusinessAccountsPanel'));
const TrialReminderEmailsPanel = lazy(() => import('@/components/admin/TrialReminderEmailsPanel'));
const PaymentReconciliationPanel = lazy(() => import('@/components/admin/PaymentReconciliationPanel'));
const PendingTransfersPanel = lazy(() => import('@/components/admin/PendingTransfersPanel'));
const AdminLandmarksPanel = lazy(() => import('@/components/admin/AdminLandmarksPanel'));
const AdminNotifySender = lazy(() => import('@/components/admin/AdminNotifySender'));

interface WithdrawalRow {
  id: string; type: string; full_name: string; phone: string; email: string;
  network_provider: string; state_of_residence: string; address: string;
  postcode: string; amount: number; status: string; created_at: string; ip_address?: string;
  source?: 'quiz' | 'referral' | string;
}

interface PostcodeRow {
  id: string; postcode: string; address: string | null; state: string;
  country: string | null; lga: string | null; lat: number; lng: number;
  created_at: string; ip_address?: string;
}

interface PropertyRow {
  id: string; raw_lat: number; raw_lng: number; lat: number; lng: number;
  postcode: string; state_name: string | null; lga_name: string | null;
  state_number: number | null; lga_number: number | null; ward_number: number | null;
  address: string | null; created_at: string;
}

interface StatEntry { label: string; count: number; }

export default function Admin() {
  const [adminEmail, setAdminEmail] = useState('');
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [ipAllowed, setIpAllowed] = useState<boolean | null>(null);
  const [visitorIp, setVisitorIp] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggedInAdminName, setLoggedInAdminName] = useState('');
  const [loginTimestamp, setLoginTimestamp] = useState<Date | null>(null);
  const [loginMode, setLoginMode] = useState<'staff' | 'super'>('staff');
  const [superPassword, setSuperPassword] = useState('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [postcodeCount, setPostcodeCount] = useState(0);
  const [showPostcodes, setShowPostcodes] = useState(false);
  const [postcodes, setPostcodes] = useState<PostcodeRow[]>([]);
  const [selectedPostcode, setSelectedPostcode] = useState<PostcodeRow | null>(null);
  const [loadingPostcodes, setLoadingPostcodes] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsTab, setStatsTab] = useState<'state' | 'lga' | 'ip'>('state');
  const [stateStats, setStateStats] = useState<StatEntry[]>([]);
  const [lgaStats, setLgaStats] = useState<StatEntry[]>([]);
  const [ipStats, setIpStats] = useState<StatEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Platform stats
  const [platformStats, setPlatformStats] = useState<{
    total_users: number; total_riders: number; total_businesses: number; total_postcodes: number;
    total_quiz_payout: number; pending_payout: number;
  }>({ total_users: 0, total_riders: 0, total_businesses: 0, total_postcodes: 0, total_quiz_payout: 0, pending_payout: 0 });

  // Properties management
  const [showProperties, setShowProperties] = useState(false);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [propertyCount, setPropertyCount] = useState(0);
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'state' | 'duplicates'>('all');
  const [propertyStateFilter, setPropertyStateFilter] = useState('');
  const [duplicates, setDuplicates] = useState<PropertyRow[][]>([]);
  const [editingProperty, setEditingProperty] = useState<PropertyRow | null>(null);
  const [editPostcode, setEditPostcode] = useState('');
  const [propertySearch, setPropertySearch] = useState('');

  // Business earnings
  const [allBusinessEarnings, setAllBusinessEarnings] = useState<{ id: string; business_id: string; amount: number; type: string; description: string | null; created_at: string; business_name?: string }[]>([]);
  const [showBusinessEarnings, setShowBusinessEarnings] = useState(false);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [earningsNameFilter, setEarningsNameFilter] = useState('');
  const [earningsDateFrom, setEarningsDateFrom] = useState('');
  const [earningsDateTo, setEarningsDateTo] = useState('');
  const [earningsTypeFilter, setEarningsTypeFilter] = useState('all');

  // Contact messages
  const [contactMessages, setContactMessages] = useState<{ id: string; name: string; email: string; phone: string | null; subject: string; message: string; status: string; created_at: string }[]>([]);
  const [showContactMessages, setShowContactMessages] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<typeof contactMessages[0] | null>(null);

  // Allowed countries
  const [allowedCountries, setAllowedCountries] = useState<{ id: string; country_code: string; country_name: string }[]>([]);
  const [showCountries, setShowCountries] = useState(false);
  const [newCountryCode, setNewCountryCode] = useState('');
  const [newCountryName, setNewCountryName] = useState('');

  // Staff management
  const [staffList, setStaffList] = useState<{ id: string; name: string; pin: string; is_active: boolean; created_at: string; last_login_at: string | null }[]>([]);
  const [showStaffPanel, setShowStaffPanel] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showLiveAnalytics, setShowLiveAnalytics] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showBusinesses, setShowBusinesses] = useState(false);
  const [showRiders, setShowRiders] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showSharesAndBans, setShowSharesAndBans] = useState(false);
  const [showNotifySender, setShowNotifySender] = useState(false);
  const [showTrialReminders, setShowTrialReminders] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');

  // Registered users
  type RegisteredUserRow = {
    user_id: string; email: string | null; full_name: string | null; phone: string | null;
    account_type: string | null; business_name: string | null; business_code: string | null;
    cac_number: string | null; postcode: string | null; location: string | null;
    referral_code: string | null; subscription_status: string | null;
    email_verified: boolean; signed_up_at: string;
    is_banned?: boolean; ban_reason?: string | null;
  };
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserRow[]>([]);
  const [showRegisteredUsers, setShowRegisteredUsers] = useState(false);
  const [loadingRegisteredUsers, setLoadingRegisteredUsers] = useState(false);
  const [registeredUsersSearch, setRegisteredUsersSearch] = useState('');
  const [selectedUserProfile, setSelectedUserProfile] = useState<RegisteredUserRow | null>(null);

  // Referral oversight
  type ReferralOverview = {
    user_accounts: number; device_accounts: number; total_accounts: number;
    total_earned: number; total_balance: number; total_referrals: number;
    pending_withdraw_count: number; pending_withdraw_amount: number;
    completed_withdraw_amount: number;
  };
  type ReferralAccountRow = {
    source: 'user' | 'device'; identifier: string; referral_code: string;
    balance: number; total_earned: number; total_referrals: number;
    created_at: string; updated_at: string;
  };
  type ReferralClaimRow = {
    id: string; amount: number; trigger_event: string;
    referred_device_id: string; referred_ip: string | null; created_at: string;
    referred_email: string | null;
    referred_name: string | null;
    referred_phone: string | null;
  };
  type ReferralSignupRow = {
    user_id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    account_type: string | null;
    country: string | null;
    signed_up_at: string;
  };
  const [referralOverview, setReferralOverview] = useState<ReferralOverview | null>(null);
  const [showReferralPanel, setShowReferralPanel] = useState(false);
  const [referralAccounts, setReferralAccounts] = useState<ReferralAccountRow[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralSearch, setReferralSearch] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<ReferralAccountRow | null>(null);
  const [referralHistory, setReferralHistory] = useState<ReferralClaimRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [referralSignups, setReferralSignups] = useState<ReferralSignupRow[]>([]);
  const [loadingSignups, setLoadingSignups] = useState(false);
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  // Password / PIN management
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  // Self-PIN change (for PIN-authenticated admin staff)
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  // Per-staff PIN reset (super admin only)
  const [resettingStaffId, setResettingStaffId] = useState<string | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');

  const loadReferralOverview = async () => {
    const { data } = await (supabase as any).rpc('admin_get_referral_overview');
    if (data) setReferralOverview(data as ReferralOverview);
  };
  const openReferralPanel = async () => {
    setShowReferralPanel(true);
    setLoadingReferrals(true);
    await loadReferralOverview();
    const { data } = await (supabase as any).rpc('admin_list_referral_accounts', {
      _limit: 200, _offset: 0, _search: referralSearch || null,
    });
    if (data) setReferralAccounts(data as ReferralAccountRow[]);
    setLoadingReferrals(false);
  };
  const refreshReferralList = async () => {
    setLoadingReferrals(true);
    const { data } = await (supabase as any).rpc('admin_list_referral_accounts', {
      _limit: 200, _offset: 0, _search: referralSearch || null,
    });
    if (data) setReferralAccounts(data as ReferralAccountRow[]);
    setLoadingReferrals(false);
  };
  const openReferralHistory = async (row: ReferralAccountRow) => {
    setSelectedReferral(row);
    setLoadingHistory(true);
    setLoadingSignups(true);
    setHistoryDateFrom('');
    setHistoryDateTo('');
    setReferralSignups([]);
    const { data } = await (supabase as any).rpc('admin_get_referral_history', { _referral_code: row.referral_code });
    setReferralHistory((data as ReferralClaimRow[]) || []);
    setLoadingHistory(false);
    const { data: signups } = await (supabase as any).rpc('admin_get_referral_signup_details', { _referral_code: row.referral_code });
    setReferralSignups((signups as ReferralSignupRow[]) || []);
    setLoadingSignups(false);
  };

  // CSV export helper — quotes every field, escapes quotes, downloads as a file.
  const exportCsv = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
    const escape = (v: string | number | null | undefined) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter referral history by date range (inclusive)
  const filteredReferralHistory = referralHistory.filter(h => {
    if (historyDateFrom && h.created_at < historyDateFrom) return false;
    if (historyDateTo && h.created_at > historyDateTo + 'T23:59:59.999Z') return false;
    return true;
  });
  const filteredHistoryTotal = filteredReferralHistory.reduce((s, h) => s + Number(h.amount || 0), 0);

  const filteredEarnings = allBusinessEarnings.filter(e => {
    if (earningsNameFilter && !(e.business_name || '').toLowerCase().includes(earningsNameFilter.toLowerCase())) return false;
    if (earningsTypeFilter !== 'all' && e.type !== earningsTypeFilter) return false;
    if (earningsDateFrom && e.created_at < earningsDateFrom) return false;
    if (earningsDateTo && e.created_at > earningsDateTo + 'T23:59:59') return false;
    return true;
  });
  const totalFilteredEarnings = filteredEarnings.reduce((s, e) => s + Number(e.amount), 0);

  const fetchData = () => {
    // Use SECURITY DEFINER RPC so PIN-authenticated staff (no Supabase session)
    // can also see all pending/completed withdrawals. Super admins fall back to
    // their JWT email being on super_admins.
    const useStaffCredentials = adminEmail.trim() && pin.trim().length === 7;
    (supabase as any).rpc('admin_list_withdrawals', {
      _admin_email: useStaffCredentials ? adminEmail.trim().toLowerCase() : null,
      _admin_pin: useStaffCredentials ? pin.trim() : null,
      _status: null,
    }).then(({ data, error }: any) => {
      if (!error && data) setWithdrawals(data as WithdrawalRow[]);
    });
    supabase.from('properties').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count !== null) setPropertyCount(count);
    });
    (supabase as any).rpc('admin_get_platform_overview', {
      _admin_email: useStaffCredentials ? adminEmail.trim().toLowerCase() : null,
      _admin_pin: useStaffCredentials ? pin.trim() : null,
    }).then(async ({ data }: any) => {
      if (data) {
        setPlatformStats({
          total_users: Number(data.total_users || 0),
          total_riders: Number(data.total_riders || 0),
          total_businesses: Number(data.total_businesses || 0),
          total_postcodes: Number(data.total_postcodes || 0),
          total_quiz_payout: Number(data.total_quiz_payout || 0),
          pending_payout: Number(data.pending_payout || 0),
        });
      }
    });
    // Always show the LIVE postcode count (overrides any cached platform_stats value
    // so a postcode generated seconds ago shows up here immediately).
    supabase.from('postcodes').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count !== null) {
        setPostcodeCount(count);
        setPlatformStats(prev => ({ ...prev, total_postcodes: count }));
      }
    });
    loadReferralOverview();
  };

  // Check if logged-in user is super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user?.email) {
        const { data, error } = await (supabase as any).rpc('is_super_admin', { _user_email: user.email });
        if (!error && data === true) {
          setIsSuperAdmin(true);
          setAuthenticated(true);
          setLoggedInAdminName('Super Admin');
          setLoginTimestamp(new Date());
        }
      }
    };
    checkSuperAdmin();
    // Re-check when auth state changes (e.g. after token refresh on page reload)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSuperAdmin();
    });
    return () => subscription.unsubscribe();
  }, []);

  // Verify visitor IP against the admin allowlist before showing the login form
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ip = await getUserIp();
        if (cancelled) return;
        setVisitorIp(ip || '');
        const { data, error } = await (supabase as any).rpc('is_admin_ip_allowed', { _ip: ip || '' });
        if (cancelled) return;
        if (error) { setIpAllowed(true); return; } // fail open on RPC error
        setIpAllowed(!!data);
      } catch { if (!cancelled) setIpAllowed(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchData();
    // Auto-refresh every 15s so the admin dashboard stays fresh even when
    // the realtime channel misses an event.
    const interval = setInterval(fetchData, 15000);

    // Realtime: refresh instantly when withdrawals or referral balances change
    const channel = supabase
      .channel('admin-referral-withdrawal-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_referral_balances' }, () => loadReferralOverview())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_referrals' }, () => loadReferralOverview())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_referral_claims' }, () => loadReferralOverview())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, async () => {
        // Refresh open contact-messages panel in real time
        const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
        if (data) setContactMessages(data as any);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [authenticated]);

  const loadPostcodes = async () => {
    setShowPostcodes(true);
    setLoadingPostcodes(true);
    // Fetch all postcodes (paginate past 1000 limit). IP addresses are no longer
    // readable from the table directly — the super-admin RPC returns full rows.
    let allData: PostcodeRow[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await (supabase as any).rpc('admin_list_postcodes_full', {
        _limit: PAGE,
        _offset: from,
      });
      if (!data || data.length === 0) break;
      allData = allData.concat(data as PostcodeRow[]);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    setPostcodes(allData);
    setLoadingPostcodes(false);
  };

  const loadStats = async () => {
    setShowStats(true);
    setLoadingStats(true);
    const { data } = await (supabase as any).rpc('admin_get_postcode_ip_stats', { _limit: 1000 });
    if (data) {
      const stateMap: Record<string, number> = {};
      const lgaMap: Record<string, number> = {};
      const ipMap: Record<string, number> = {};
      for (const row of data) {
        stateMap[row.state || 'Unknown'] = (stateMap[row.state || 'Unknown'] || 0) + 1;
        lgaMap[row.lga || 'Unknown'] = (lgaMap[row.lga || 'Unknown'] || 0) + 1;
        ipMap[row.ip_address || 'Unknown'] = (ipMap[row.ip_address || 'Unknown'] || 0) + 1;
      }
      setStateStats(Object.entries(stateMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count));
      setLgaStats(Object.entries(lgaMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count));
      setIpStats(Object.entries(ipMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count));
    }
    setLoadingStats(false);
  };

  const loadProperties = async () => {
    setShowProperties(true);
    setLoadingProperties(true);
    let query = supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (propertyStateFilter) query = query.eq('state_name', propertyStateFilter);
    if (propertySearch) query = query.or(`postcode.ilike.%${propertySearch}%,address.ilike.%${propertySearch}%,lga_name.ilike.%${propertySearch}%`);
    const { data } = await query.limit(200);
    if (data) setProperties(data as PropertyRow[]);
    setLoadingProperties(false);
  };

  const findDuplicates = async () => {
    setPropertyFilter('duplicates');
    setLoadingProperties(true);
    // Get all properties and find ones within ~15m of each other
    const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: true }).limit(1000);
    if (!data) { setLoadingProperties(false); return; }
    
    const props = data as PropertyRow[];
    const groups: PropertyRow[][] = [];
    const used = new Set<string>();
    
    for (let i = 0; i < props.length; i++) {
      if (used.has(props[i].id)) continue;
      const group = [props[i]];
      for (let j = i + 1; j < props.length; j++) {
        if (used.has(props[j].id)) continue;
        const dist = haversineDistance(props[i].lat, props[i].lng, props[j].lat, props[j].lng);
        if (dist <= 15) { // 15 meters
          group.push(props[j]);
          used.add(props[j].id);
        }
      }
      if (group.length > 1) {
        used.add(props[i].id);
        groups.push(group);
      }
    }
    setDuplicates(groups);
    setLoadingProperties(false);
  };

  const mergeProperties = async (group: PropertyRow[]) => {
    if (group.length < 2) return;
    const keep = group[0]; // Keep the oldest
    const toDelete = group.slice(1);
    for (const p of toDelete) {
      await supabase.from('properties').delete().eq('id', p.id);
    }
    setDuplicates(prev => prev.filter(g => g[0].id !== keep.id));
    fetchData();
  };

  const deleteProperty = async (id: string) => {
    if (!confirm('Delete this property?')) return;
    await supabase.from('properties').delete().eq('id', id);
    setProperties(prev => prev.filter(p => p.id !== id));
    fetchData();
  };

  const updatePropertyPostcode = async () => {
    if (!editingProperty || !editPostcode.trim()) return;
    await supabase.from('properties').update({ postcode: editPostcode.trim() }).eq('id', editingProperty.id);
    setProperties(prev => prev.map(p => p.id === editingProperty.id ? { ...p, postcode: editPostcode.trim() } : p));
    setEditingProperty(null);
    setEditPostcode('');
  };

  const markCompleted = async (id: string) => {
    const email = adminEmail.trim().toLowerCase();
    const hasStaff = !!email && pin.trim().length === 7;
    const tryStaff = async () => {
      const { data, error } = await supabase.rpc('admin_update_withdrawal_status', {
        _id: id, _status: 'completed', _admin_email: email, _admin_pin: pin.trim(),
      });
      return { data: data as any, error };
    };
    const trySuper = async () => {
      const { data, error } = await supabase.rpc('update_withdrawal_status', {
        _id: id, _status: 'completed',
      });
      return { data: data as any, error };
    };
    // Try the path that fits the current session first, then fall back to the
    // other one so a JWT/PIN mismatch doesn't block completion.
    let attempt = hasStaff ? await tryStaff() : await trySuper();
    let ok = !attempt.error && attempt.data?.success === true;
    let lastError = attempt.error?.message || attempt.data?.error;
    if (!ok) {
      const fallback = hasStaff ? await trySuper() : (email ? await tryStaff() : null);
      if (fallback) {
        ok = !fallback.error && fallback.data?.success === true;
        if (!ok) lastError = fallback.error?.message || fallback.data?.error || lastError;
      }
    }
    if (!ok) {
      alert(
        `Failed to mark as completed: ${lastError || 'unknown error'}\n\n` +
        `Tip: enter your Admin Email + 7-digit PIN at the top of the page, then try again.`
      );
      return;
    }
    // Verify the DB actually changed before trusting it.
    const { data: verify } = await supabase.from('withdrawals').select('status').eq('id', id).maybeSingle();
    if (verify?.status !== 'completed') {
      alert('The update did not persist. Please refresh and try again.');
      return;
    }
    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'completed' } : w));
    fetchData();
  };

  const rejectWithdrawal = async (id: string) => {
    if (!confirm('Reject this withdrawal? The user will not be paid for this request.')) return;
    const email = adminEmail.trim().toLowerCase();
    const hasStaff = !!email && pin.trim().length === 7;
    const tryStaff = () => supabase.rpc('admin_update_withdrawal_status', {
      _id: id, _status: 'rejected', _admin_email: email, _admin_pin: pin.trim(),
    });
    const trySuper = () => supabase.rpc('update_withdrawal_status', { _id: id, _status: 'rejected' });
    let attempt: any = hasStaff ? await tryStaff() : await trySuper();
    let ok = !attempt.error && attempt.data?.success === true;
    if (!ok) {
      const fb: any = hasStaff ? await trySuper() : (email ? await tryStaff() : null);
      if (fb) ok = !fb.error && fb.data?.success === true;
      if (!ok) {
        alert(`Failed to reject: ${attempt.error?.message || attempt.data?.error || 'unknown error'}`);
        return;
      }
    }
    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'rejected' } : w));
    fetchData();
  };

  const banWithdrawalUser = async (w: WithdrawalRow) => {
    const reason = prompt(`Ban ${w.full_name} (${w.email})?\n\nEnter a reason — the user will see this on next load and be signed out.`)?.trim();
    if (!reason) return;
    const { data, error } = await (supabase as any).rpc('admin_ban_account_by_email', {
      p_email: w.email,
      p_reason: reason,
      p_admin_email: adminEmail.trim().toLowerCase() || null,
      p_admin_pin: pin.trim() || null,
    });
    if (error || (data && data.success === false)) {
      alert(`Could not ban account: ${error?.message || data?.error || 'unknown error'}`);
      return;
    }
    alert(`Account banned. ${w.full_name} will be signed out on next load.`);
    setRegisteredUsers(prev => prev.map(u => u.email?.toLowerCase() === w.email.toLowerCase()
      ? { ...u, is_banned: true, ban_reason: reason } : u));
  };

  const filtered = withdrawals.filter(w => filter === 'all' || w.status === filter);

  const handleAdminLogin = async () => {
    setLoginError('');
    setLoggingIn(true);
    // Best-effort caller IP so the server-side allow-list check can enforce
    // the same restriction the UI does. Failures fall through to server denial.
    let callerIp: string | null = null;
    try {
      const { data: ipData } = await supabase.functions.invoke('get-ip');
      callerIp = (ipData?.ip as string) || null;
    } catch {}
    const { data, error } = await (supabase as any).rpc('admin_staff_login', {
      _email: adminEmail.trim().toLowerCase(),
      _pin: pin.trim(),
      _ip: callerIp,
    });
    const staff = Array.isArray(data) ? data[0] : data;
    if (error || !staff) {
      setLoginError('Invalid email or PIN');
      setLoggingIn(false);
      return;
    }
    setLoggedInAdminName(staff.name);
    setLoginTimestamp(new Date());
    setAuthenticated(true);
    setLoggingIn(false);
  };

  const handleSuperAdminLogin = async () => {
    setLoginError('');
    setLoggingIn(true);
    const email = adminEmail.trim().toLowerCase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: superPassword });
    if (authError) {
      setLoginError(authError.message || 'Invalid email or password');
      setLoggingIn(false);
      return;
    }
    const { data: superRow } = await supabase.from('super_admins').select('id').eq('email', email).maybeSingle();
    if (!superRow) {
      setLoginError('This account is not a super admin');
      await supabase.auth.signOut();
      setLoggingIn(false);
      return;
    }
    setIsSuperAdmin(true);
    setLoggedInAdminName('Super Admin');
    setLoginTimestamp(new Date());
    setAuthenticated(true);
    setLoggingIn(false);
  };

  const handleSendMagicLink = async () => {
    setLoginError('');
    const email = adminEmail.trim().toLowerCase();
    if (!email) { setLoginError('Enter your super admin email first'); return; }
    const { data: superRow } = await supabase.from('super_admins').select('id').eq('email', email).maybeSingle();
    if (!superRow) { setLoginError('This email is not a registered super admin'); return; }
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setLoggingIn(false);
    if (error) { setLoginError(error.message); return; }
    setLoginError('');
    alert(`Magic sign-in link sent to ${email}. Check your inbox and click the link to enter the admin panel.`);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card rounded-xl ring-1 ring-border shadow-lg p-8 w-full max-w-sm space-y-5">
          <div className="text-center">
            <img src={logoImg} alt="Loca8tor" className="w-14 h-14 rounded-xl mx-auto mb-3 object-cover" />
            <h1 className="font-heading text-lg font-bold text-foreground">Admin Access</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {loginMode === 'staff' ? 'Enter your email and 7-digit PIN' : 'Sign in with your super admin account'}
            </p>
          </div>
          {ipAllowed === false && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-center">
              <p className="text-xs font-semibold text-destructive">Access denied from this network</p>
              <p className="text-[10px] text-muted-foreground mt-1">Your IP ({visitorIp || 'unknown'}) is not on the admin allowlist.</p>
            </div>
          )}
          <fieldset disabled={ipAllowed === false} className={ipAllowed === false ? 'opacity-50 pointer-events-none space-y-5' : 'space-y-5'}>
          <div className="grid grid-cols-2 gap-1 bg-secondary/50 p-1 rounded-lg">
            <button type="button" onClick={() => { setLoginMode('staff'); setLoginError(''); }}
              className={`text-xs font-semibold py-2 rounded-md transition-colors ${loginMode === 'staff' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              Admin Staff (PIN)
            </button>
            <button type="button" onClick={() => { setLoginMode('super'); setLoginError(''); }}
              className={`text-xs font-semibold py-2 rounded-md transition-colors ${loginMode === 'super' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              Super Admin
            </button>
          </div>
          <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
            placeholder="Email Address"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          {loginMode === 'staff' ? (
            <input type="password" value={pin} onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdminLogin(); }}
              placeholder="7-digit PIN" maxLength={7}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-center tracking-widest ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          ) : (
            <input type="password" value={superPassword} onChange={e => setSuperPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSuperAdminLogin(); }}
              placeholder="Password"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          )}
          {loginError && <p className="text-xs text-destructive text-center">{loginError}</p>}
          {loginMode === 'staff' ? (
            <button onClick={handleAdminLogin} disabled={loggingIn || !adminEmail.trim() || pin.length !== 7}
              className="w-full bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-50">
              {loggingIn ? 'Verifying...' : 'Login'}
            </button>
          ) : (
            <button onClick={handleSuperAdminLogin} disabled={loggingIn || !adminEmail.trim() || superPassword.length < 6}
              className="w-full bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-50">
              {loggingIn ? 'Signing in...' : 'Sign in as Super Admin'}
            </button>
          )}
          {loginMode === 'super' && (
            <button type="button" onClick={handleSendMagicLink} disabled={loggingIn || !adminEmail.trim()}
              className="w-full text-xs font-semibold text-primary hover:underline disabled:opacity-50">
              No password? Email me a sign-in link
            </button>
          )}
          {loginMode === 'super' && (
            <Link to="/reset-password" className="block text-center text-xs text-muted-foreground hover:text-primary hover:underline">
              Set a new password
            </Link>
          )}
          <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to app</Link>
          </fieldset>
        </div>
      </div>
    );
  }

  const currentStats = statsTab === 'state' ? stateStats : statsTab === 'lga' ? lgaStats : ipStats;
  const totalForTab = currentStats.reduce((s, e) => s + e.count, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-secondary transition-colors"><ArrowLeft className="w-4 h-4 text-muted-foreground" /></Link>
          <img src={logoImg} alt="Loca8tor" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <h1 className="font-heading text-lg font-bold tracking-tight leading-none flex items-center gap-2">
              Admin Panel
              {isSuperAdmin && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Super Admin</span>}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Logged in as <span className="font-semibold text-foreground">{loggedInAdminName}</span>
              {loginTimestamp && <> · {loginTimestamp.toLocaleString()}</>}
            </p>
          </div>
          <button onClick={() => { setAuthenticated(false); setPin(''); setAdminEmail(''); setLoggedInAdminName(''); setLoginTimestamp(null); }} className="ml-auto p-2 rounded-lg hover:bg-secondary transition-colors text-xs text-muted-foreground hover:text-foreground" title="Logout">
            Logout
          </button>
          <button onClick={fetchData} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Platform Stats Dashboard */}
        <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
          <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Platform Overview
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => setShowUsers(true)}
              className="bg-primary/10 rounded-lg p-3 text-center hover:bg-primary/20 transition-colors group">
              <p className="text-2xl font-heading font-bold text-primary group-hover:underline">{platformStats.total_users}</p>
              <p className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                Users <ChevronRight className="w-3 h-3" />
              </p>
            </button>
            <button onClick={() => setShowRiders(true)}
              className="bg-primary/10 rounded-lg p-3 text-center hover:bg-primary/20 transition-colors group">
              <p className="text-2xl font-heading font-bold text-primary group-hover:underline">{platformStats.total_riders}</p>
              <p className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                Riders <ChevronRight className="w-3 h-3" />
              </p>
            </button>
            <button onClick={() => setShowBusinesses(true)}
              className="bg-primary/10 rounded-lg p-3 text-center hover:bg-primary/20 transition-colors group">
              <p className="text-2xl font-heading font-bold text-primary group-hover:underline">{platformStats.total_businesses}</p>
              <p className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                Businesses <ChevronRight className="w-3 h-3" />
              </p>
            </button>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-heading font-bold text-primary">{platformStats.total_postcodes}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Postcodes</p>
            </div>
          </div>
        </div>

        {/* Live Analytics */}
        <button onClick={() => setShowLiveAnalytics(true)}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <div className="relative">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping" />
            </div>
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
                Live Analytics
                <span className="text-[9px] uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Live</span>
              </p>
              <p className="text-xs text-muted-foreground">Real-time KPIs, charts and a scrolling activity ticker</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Trial reminder email deliveries */}
        <button onClick={() => setShowTrialReminders(true)}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Trial Reminder Emails</p>
              <p className="text-xs text-muted-foreground">Verify who received the 24h trial-ending reminder and delivery status</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Payment reconciliation */}
        <button onClick={() => setShowReconciliation(true)}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Payment Reconciliation</p>
              <p className="text-xs text-muted-foreground">Compare wallet debits vs subscription renewals for a date range — spot missing or mismatched charges</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-lg ring-1 ring-border p-4 text-center">
            <p className="text-2xl font-heading font-bold text-foreground">{withdrawals.length}</p>
            <p className="text-xs text-muted-foreground">Requests</p>
          </div>
          <div className="bg-card rounded-lg ring-1 ring-border p-4 text-center">
            <p className="text-2xl font-heading font-bold text-accent-foreground">{withdrawals.filter(w => w.status === 'pending').length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <button onClick={loadPostcodes} className="bg-card rounded-lg ring-1 ring-border p-4 text-center hover:bg-secondary transition-colors group">
            <p className="text-2xl font-heading font-bold text-foreground">{postcodeCount}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">Postcodes <ChevronRight className="w-3 h-3" /></p>
          </button>
          <button onClick={loadProperties} className="bg-card rounded-lg ring-1 ring-border p-4 text-center hover:bg-secondary transition-colors group">
            <p className="text-2xl font-heading font-bold text-primary">{propertyCount}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">Properties <ChevronRight className="w-3 h-3" /></p>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-lg ring-1 ring-border p-4 text-center">
            <p className="text-xl font-heading font-bold text-primary">₦{platformStats.total_quiz_payout.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Quiz Payout</p>
          </div>
          <div className="bg-card rounded-lg ring-1 ring-border p-4 text-center">
            <p className="text-xl font-heading font-bold text-accent-foreground">₦{platformStats.pending_payout.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending Payout</p>
          </div>
        </div>

        {/* Referral overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-lg ring-1 ring-border p-4 text-center">
            <p className="text-2xl font-heading font-bold text-primary">{referralOverview?.total_referrals ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Credited Referrals ({referralOverview?.total_accounts ?? 0} accounts)</p>
          </div>
          <div className="bg-card rounded-lg ring-1 ring-border p-4 text-center">
            <p className="text-xl font-heading font-bold text-primary">₦{(referralOverview?.total_earned ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Earned (Lifetime)</p>
          </div>
          <div className="bg-card rounded-lg ring-1 ring-border p-4 text-center">
            <p className="text-xl font-heading font-bold text-foreground">₦{(referralOverview?.total_balance ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Current Balance</p>
          </div>
          <div className="bg-card rounded-lg ring-1 ring-border p-4 text-center">
            <p className="text-xl font-heading font-bold text-accent-foreground">₦{(referralOverview?.pending_withdraw_amount ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Pending Withdrawals ({referralOverview?.pending_withdraw_count ?? 0})</p>
          </div>
        </div>

        {/* Referral Users Button */}
        <button onClick={openReferralPanel}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Referral Users</p>
              <p className="text-xs text-muted-foreground">Browse every referral account, earnings & history</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Change Password / PIN Button */}
        <button onClick={() => { setShowPasswordPanel(true); setPwMsg(null); }}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Change {isSuperAdmin ? 'Password' : 'PIN'}</p>
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin ? 'Update your super-admin login password' : 'Update your 7-digit admin PIN'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Business Earnings Section */}
        <button onClick={async () => {
          setShowBusinessEarnings(true);
          setLoadingEarnings(true);
          const { data: earnings } = await supabase.from('business_earnings').select('*').order('created_at', { ascending: false }).limit(200);
          if (earnings) {
            // Get unique business_ids and fetch names
            const bizIds = [...new Set(earnings.map((e: any) => e.business_id))];
            const { data: riders } = await supabase.from('riders').select('id, business_name, full_name').in('id', bizIds);
            const nameMap: Record<string, string> = {};
            if (riders) riders.forEach((r: any) => { nameMap[r.id] = r.business_name || r.full_name; });
            setAllBusinessEarnings(earnings.map((e: any) => ({ ...e, business_name: nameMap[e.business_id] || 'Unknown' })));
          }
          setLoadingEarnings(false);
        }}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Business Earnings</p>
              <p className="text-xs text-muted-foreground">Monitor income logged by businesses</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Contact Messages Button */}
        <button onClick={async () => {
          setShowContactMessages(true);
          setLoadingMessages(true);
          const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
          if (data) setContactMessages(data as any);
          setLoadingMessages(false);
        }}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Contact Messages</p>
              <p className="text-xs text-muted-foreground">View messages from the contact form</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Allowed Countries Button */}
        <button onClick={async () => {
          setShowCountries(true);
          const { data, error } = await (supabase as any).rpc('admin_list_allowed_countries', {
            _admin_email: adminEmail.trim().toLowerCase() || null,
            _admin_pin: pin.trim() || null,
          });
          if (error) { alert(error.message || 'Failed to load allowed countries'); return; }
          if (data) setAllowedCountries(data as any);
        }}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Geo-Blocking / Allowed Countries</p>
              <p className="text-xs text-muted-foreground">Manage which countries can access the website</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Staff Management Button */}
        <button onClick={async () => {
          setShowStaffPanel(true);
          setLoadingStaff(true);
          const { data } = await supabase.from('admin_staff')
            .select('id, name, email, is_active, created_at, last_login_at')
            .order('created_at', { ascending: false });
          if (data) setStaffList(data as any);
          setLoadingStaff(false);
        }}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Staff Management</p>
              <p className="text-xs text-muted-foreground">Add, remove, or deactivate admin staff accounts</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Admin Landmarks */}
        <button onClick={() => setShowLandmarks(true)}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Admin Landmarks</p>
              <p className="text-xs text-muted-foreground">Search popular addresses, generate postcodes and save them so users can find places by name</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Send Notification */}
        <button onClick={() => setShowNotifySender(true)}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <Megaphone className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Send Notification</p>
              <p className="text-xs text-muted-foreground">Message users, riders, businesses — or everyone — with in-app notifications</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Registered Users Button — super admin only */}
        <button onClick={async () => {
          setShowRegisteredUsers(true);
          setLoadingRegisteredUsers(true);
          const useStaffCredentials = adminEmail.trim() && pin.trim().length === 7;
          const { data, error } = await (supabase as any).rpc('admin_list_registered_users', {
            _admin_email: useStaffCredentials ? adminEmail.trim().toLowerCase() : null,
            _admin_pin: useStaffCredentials ? pin.trim() : null,
          });
          if (error) {
            alert(error.message || 'Failed to load registered users');
            setRegisteredUsers([]);
          } else if (data) {
            setRegisteredUsers(data as RegisteredUserRow[]);
          }
          setLoadingRegisteredUsers(false);
        }}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Registered Users</p>
              <p className="text-xs text-muted-foreground">Browse and download every account (email, phone, state, postcode) as CSV — for security & compliance</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* WhatsApp Shares & Banned Accounts — super admin only */}
        {isSuperAdmin && (
          <button onClick={() => setShowSharesAndBans(true)}
            className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-heading font-semibold text-sm text-foreground">WhatsApp Shares & Banned Accounts</p>
                <p className="text-xs text-muted-foreground">See every share, find your top sharers, and review banned identifiers</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {showRegisteredUsers && (
          <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Registered Users ({registeredUsers.length})
              </p>
              <button onClick={() => setShowRegisteredUsers(false)} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <input
              value={registeredUsersSearch}
              onChange={e => setRegisteredUsersSearch(e.target.value)}
              placeholder="Search by name, email, phone, postcode, business…"
              className="w-full h-9 text-xs rounded-md border border-input bg-background px-3"
            />
            {(() => {
              const q = registeredUsersSearch.trim().toLowerCase();
              const filtered = q ? registeredUsers.filter(u =>
                [u.email, u.full_name, u.phone, u.postcode, u.location, u.business_name, u.business_code, u.cac_number, u.referral_code]
                  .some(v => (v || '').toLowerCase().includes(q))
              ) : registeredUsers;
              return (
                <>
                  <button
                    onClick={async () => {
                      exportCsv(
                        'registered-users',
                        ['Signed Up', 'Email', 'Verified', 'Full Name', 'Phone', 'Account Type', 'Business Name', 'Business Code', 'CAC Number', 'Postcode', 'Address / Location', 'Referral Code', 'Subscription', 'User ID'],
                        filtered.map(u => [
                        new Date(u.signed_up_at).toISOString(),
                        u.email || '',
                        u.email_verified ? 'yes' : 'no',
                        u.full_name || '',
                        u.phone || '',
                        u.account_type || '',
                        u.business_name || '',
                        u.business_code || '',
                        u.cac_number || '',
                        u.postcode || '',
                        u.location || '',
                        u.referral_code || '',
                        u.subscription_status || '',
                        u.user_id,
                        ]),
                      );
                      try {
                        const ip = await getUserIp();
                        await (supabase as any).rpc('admin_log_export', {
                          _action: 'export_csv',
                          _target: 'registered_users',
                          _row_count: filtered.length,
                          _ip_address: ip,
                          _metadata: { search: registeredUsersSearch || null, total_loaded: registeredUsers.length },
                        });
                      } catch (e) {
                        console.warn('Audit log failed', e);
                      }
                    }}
                    disabled={filtered.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-bold text-xs py-2 rounded-lg hover:brightness-110 transition disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" /> Download CSV — {filtered.length} user{filtered.length === 1 ? '' : 's'}
                  </button>
                  {loadingRegisteredUsers ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No users match your search.</p>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto space-y-1.5">
                      {filtered.slice(0, 200).map(u => (
                        <div
                          key={u.user_id}
                          onClick={() => setSelectedUserProfile(u)}
                          className="bg-secondary/50 rounded-lg p-3 text-xs cursor-pointer hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-foreground truncate">{u.full_name || '—'}</p>
                            <div className="flex items-center gap-1.5">
                              {u.is_banned && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold">BANNED</span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.email_verified ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                                {u.email_verified ? 'verified' : 'unverified'}
                              </span>
                            </div>
                          </div>
                          <p className="text-foreground font-medium break-all">{u.email || 'no email'}</p>
                          {u.phone && <p className="text-muted-foreground truncate">{u.phone}</p>}
                          <p className="text-[10px] text-muted-foreground truncate">
                            {u.account_type || 'individual'}{u.business_name ? ` · ${u.business_name}` : ''}{u.postcode ? ` · ${u.postcode}` : ''}{u.location ? ` · ${u.location}` : ''}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{new Date(u.signed_up_at).toLocaleString()}</p>
                          <div className="mt-2 flex gap-2">
                            {u.is_banned ? (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm(`Unban ${u.full_name || u.email}?`)) return;
                                  const { error } = await (supabase as any).rpc('admin_unban_account', { p_user_id: u.user_id });
                                  if (error) { alert(error.message); return; }
                                  setRegisteredUsers(prev => prev.map(x => x.user_id === u.user_id ? { ...x, is_banned: false, ban_reason: null } : x));
                                }}
                                className="flex-1 bg-primary/10 text-primary text-[10px] font-bold py-1.5 rounded hover:bg-primary/20"
                              >Unban</button>
                            ) : (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const reason = prompt(`Ban ${u.full_name || u.email}?\n\nEnter the reason the user will see:`);
                                  if (!reason || reason.trim().length < 3) return;
                                  const { error } = await (supabase as any).rpc('admin_ban_account', { p_user_id: u.user_id, p_reason: reason.trim() });
                                  if (error) { alert(error.message); return; }
                                  setRegisteredUsers(prev => prev.map(x => x.user_id === u.user_id ? { ...x, is_banned: true, ban_reason: reason.trim() } : x));
                                }}
                                className="flex-1 bg-destructive/10 text-destructive text-[10px] font-bold py-1.5 rounded hover:bg-destructive/20"
                              >Ban account</button>
                            )}
                          </div>
                        </div>
                      ))}
                      {filtered.length > 200 && (
                        <p className="text-[10px] text-muted-foreground text-center py-2">Showing first 200. CSV includes all {filtered.length}.</p>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {selectedUserProfile && (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setSelectedUserProfile(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-lg ring-1 ring-border p-5 max-w-md w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> User Profile
                </p>
                <button onClick={() => setSelectedUserProfile(null)} className="p-1 rounded hover:bg-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2.5 text-xs">
                {([
                  ['Full Name', selectedUserProfile.full_name],
                  ['Email', selectedUserProfile.email],
                  ['Email Verified', selectedUserProfile.email_verified ? 'Yes' : 'No'],
                  ['Phone', selectedUserProfile.phone],
                  ['Account Type', selectedUserProfile.account_type],
                  ['Business Name', selectedUserProfile.business_name],
                  ['Business Code', selectedUserProfile.business_code],
                  ['CAC Number', selectedUserProfile.cac_number],
                  ['Postcode', selectedUserProfile.postcode],
                  ['Address / Location', selectedUserProfile.location],
                  ['Referral Code', selectedUserProfile.referral_code],
                  ['Subscription', selectedUserProfile.subscription_status],
                  ['Signed Up', new Date(selectedUserProfile.signed_up_at).toLocaleString()],
                  ['User ID', selectedUserProfile.user_id],
                  ['Status', selectedUserProfile.is_banned ? `BANNED — ${selectedUserProfile.ban_reason || 'no reason'}` : 'Active'],
                ] as [string, string | null | undefined][]).map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5 border-b border-border/50 pb-2 last:border-0">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
                    <span className={`text-foreground break-words ${label === 'Status' && selectedUserProfile.is_banned ? 'text-destructive font-bold' : ''}`}>
                      {value || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showCountries && (
          <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Allowed Countries ({allowedCountries.length})
              </p>
              <button onClick={() => setShowCountries(false)} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <button
              onClick={() => exportCsv(
                'allowed-countries',
                ['Country Code', 'Country Name'],
                allowedCountries.map(c => [c.country_code, c.country_name]),
              )}
              disabled={allowedCountries.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground font-heading font-bold text-xs py-2 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export accounts (CSV) — {allowedCountries.length}
            </button>
            <div className="space-y-2">
              {allowedCountries.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{c.country_code}</span>
                    <span className="text-sm text-foreground">{c.country_name}</span>
                  </div>
                  <button onClick={async () => {
                    if (!confirm(`Remove ${c.country_name} from allowed countries?`)) return;
                    const { error } = await (supabase as any).rpc('admin_delete_allowed_country', {
                      _id: c.id,
                      _admin_email: adminEmail.trim().toLowerCase() || null,
                      _admin_pin: pin.trim() || null,
                    });
                    if (error) { alert(error.message || 'Failed to remove country'); return; }
                    setAllowedCountries(prev => prev.filter(x => x.id !== c.id));
                  }} className="p-1.5 rounded hover:bg-destructive/20 text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCountryCode} onChange={e => setNewCountryCode(e.target.value.toUpperCase())}
                placeholder="Code (e.g. GH)" maxLength={3}
                className="w-20 h-9 text-xs rounded-md border border-input bg-background px-2 text-center uppercase" />
              <input value={newCountryName} onChange={e => setNewCountryName(e.target.value)}
                placeholder="Country name (e.g. Ghana)"
                className="flex-1 h-9 text-xs rounded-md border border-input bg-background px-3" />
              <button onClick={async () => {
                if (!newCountryCode.trim() || !newCountryName.trim()) return;
                const { data, error } = await (supabase as any).rpc('admin_add_allowed_country', {
                  _country_code: newCountryCode.trim().toUpperCase(),
                  _country_name: newCountryName.trim(),
                  _admin_email: adminEmail.trim().toLowerCase() || null,
                  _admin_pin: pin.trim() || null,
                });
                if (!error && data) {
                  setAllowedCountries(prev => [...prev, data as any]);
                  setNewCountryCode('');
                  setNewCountryName('');
                } else if (error) {
                  alert(error.message || 'Failed to add country');
                }
              }} className="h-9 px-4 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:brightness-110 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        )}


        {showContactMessages && (
          <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Contact Messages ({contactMessages.length})
              </p>
              <button onClick={() => { setShowContactMessages(false); setSelectedMessage(null); }} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <button
              onClick={() => exportCsv(
                'contact-messages',
                ['Name', 'Email', 'Phone', 'Subject', 'Message', 'Status', 'Created'],
                contactMessages.map(m => [m.name, m.email, m.phone || '', m.subject, m.message, m.status, new Date(m.created_at).toLocaleString()]),
              )}
              disabled={contactMessages.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground font-heading font-bold text-xs py-2 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export accounts (CSV) — {contactMessages.length}
            </button>
            {loadingMessages ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
            ) : selectedMessage ? (
              <div className="space-y-3">
                <button onClick={() => setSelectedMessage(null)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ArrowLeft className="w-3 h-3" /> Back to list
                </button>
                <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-heading font-bold text-foreground">{selectedMessage.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${selectedMessage.status === 'read' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}>
                      {selectedMessage.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedMessage.email}{selectedMessage.phone ? ` · ${selectedMessage.phone}` : ''}</p>
                  <p className="text-xs font-semibold text-foreground mt-2">Subject: {selectedMessage.subject}</p>
                  <p className="text-sm text-foreground bg-background rounded-lg p-3 mt-1 whitespace-pre-wrap">{selectedMessage.message}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(selectedMessage.created_at).toLocaleString()}</p>
                  {selectedMessage.status !== 'read' && (
                    <button onClick={async () => {
                      await supabase.from('contact_messages').update({ status: 'read' }).eq('id', selectedMessage.id);
                      setContactMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, status: 'read' } : m));
                      setSelectedMessage({ ...selectedMessage, status: 'read' });
                    }} className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md">
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ) : contactMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No contact messages yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {contactMessages.map(m => (
                  <button key={m.id} onClick={() => setSelectedMessage(m)}
                    className="w-full text-left bg-secondary/50 rounded-lg p-3 hover:bg-secondary transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">{m.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${m.status === 'read' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}>
                        {m.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{m.subject}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.message}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showBusinessEarnings && (
          <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-heading font-bold text-sm text-foreground">Business Earnings Log</p>
              <button onClick={() => setShowBusinessEarnings(false)} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={earningsNameFilter} onChange={e => setEarningsNameFilter(e.target.value)}
                  placeholder="Filter by business name..."
                  className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-input bg-background" />
              </div>
              <select value={earningsTypeFilter} onChange={e => setEarningsTypeFilter(e.target.value)}
                className="h-8 text-xs rounded-md border border-input bg-background px-2">
                <option value="all">All Types</option>
                <option value="delivery_fee">Delivery Fee</option>
                <option value="contract">Contract</option>
                <option value="bonus">Bonus</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">From</label>
                <input type="date" value={earningsDateFrom} onChange={e => setEarningsDateFrom(e.target.value)}
                  className="w-full h-8 text-xs rounded-md border border-input bg-background px-2" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">To</label>
                <input type="date" value={earningsDateTo} onChange={e => setEarningsDateTo(e.target.value)}
                  className="w-full h-8 text-xs rounded-md border border-input bg-background px-2" />
              </div>
            </div>

            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-heading font-bold text-primary">₦{totalFilteredEarnings.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {earningsNameFilter || earningsDateFrom || earningsDateTo || earningsTypeFilter !== 'all' ? 'Filtered' : 'Total'} Business Revenue ({filteredEarnings.length} entries)
              </p>
            </div>
            <button
              onClick={() => {
                const rows = [['Business Name', 'Type', 'Amount (₦)', 'Description', 'Date']];
                filteredEarnings.forEach(e => rows.push([
                  e.business_name || '', e.type.replace(/_/g, ' '), String(e.amount), e.description || '', new Date(e.created_at).toLocaleString()
                ]));
                const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `business-earnings-${new Date().toISOString().slice(0,10)}.csv`;
                a.click(); URL.revokeObjectURL(url);
              }}
              disabled={filteredEarnings.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground font-heading font-bold text-xs py-2 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export to CSV
            </button>
            {loadingEarnings ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
            ) : filteredEarnings.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No earnings found</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredEarnings.map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{e.business_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{e.type.replace(/_/g, ' ')}{e.description ? ` — ${e.description}` : ''}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                    </div>
                    <p className="font-heading font-bold text-primary text-sm">₦{Number(e.amount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={loadStats}
          className="w-full flex items-center justify-between bg-card rounded-lg ring-1 ring-border p-4 hover:bg-secondary transition-colors group">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-heading font-semibold text-sm text-foreground">Postcode Statistics</p>
              <p className="text-xs text-muted-foreground">By State, LGA & IP Address</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <Suspense fallback={<div className="bg-card rounded-lg ring-1 ring-border p-4 text-xs text-muted-foreground">Loading withdrawal candidates…</div>}>
          <WithdrawalCandidates />
        </Suspense>

        <Suspense fallback={<div className="bg-card rounded-lg ring-1 ring-border p-4 text-xs text-muted-foreground">Loading bank transfers…</div>}>
          <PendingTransfersPanel />
        </Suspense>

        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {(['pending', 'completed', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-md text-sm font-heading font-semibold transition-all capitalize ${filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={() => exportCsv(
            `withdrawals-${filter}`,
            ['Name', 'Phone', 'Email', 'Network', 'State', 'Address', 'Postcode', 'Type', 'Source', 'Amount (₦)', 'Status', 'IP', 'Created'],
            filtered.map(w => [w.full_name, w.phone, w.email, w.network_provider, w.state_of_residence, w.address, w.postcode, w.type, (w.source ?? 'quiz'), w.amount, w.status, w.ip_address || '', new Date(w.created_at).toLocaleString()]),
          )}
          disabled={filtered.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground font-heading font-bold text-xs py-2 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" /> Export accounts (CSV) — {filtered.length}
        </button>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No {filter} withdrawals</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((w) => (
              <div key={w.id} className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-heading font-bold text-foreground">{w.full_name}</p>
                    <p className="text-xs text-muted-foreground">{w.phone} · {w.network_provider} · {w.email}</p>
                    <p className="text-xs text-muted-foreground">{w.state_of_residence} · {w.address}</p>
                    <p className="text-xs text-muted-foreground font-mono">Postcode: {w.postcode}</p>
                    {w.ip_address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Globe className="w-3 h-3" /> IP: <span className="font-mono">{w.ip_address}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-heading font-bold text-primary">₦{w.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{w.type}</p>
                    <span className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${
                      (w.source ?? 'quiz') === 'referral'
                        ? 'bg-blue-500/10 text-blue-500 ring-blue-500/30'
                        : 'bg-amber-500/10 text-amber-600 ring-amber-500/30'
                    }`}>
                      {(w.source ?? 'quiz') === 'referral' ? 'Referral Bonus' : 'Quiz Earnings'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border gap-2 flex-wrap">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                    w.status === 'pending' ? 'text-accent-foreground'
                      : w.status === 'rejected' ? 'text-destructive'
                      : 'text-primary'}`}>
                    {w.status === 'pending' ? <Clock className="w-3.5 h-3.5" />
                      : w.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {w.status === 'pending' ? 'Pending' : w.status === 'rejected' ? 'Rejected' : 'Completed'}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</span>
                    {w.status === 'pending' && (
                      <>
                        <button onClick={() => markCompleted(w.id)}
                          className="flex items-center gap-1 bg-primary text-primary-foreground text-[11px] font-semibold px-2.5 py-1.5 rounded-md hover:bg-primary/90 transition-all active:scale-[0.97]">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </button>
                        <button onClick={() => rejectWithdrawal(w.id)}
                          className="flex items-center gap-1 bg-destructive text-destructive-foreground text-[11px] font-semibold px-2.5 py-1.5 rounded-md hover:bg-destructive/90 transition-all active:scale-[0.97]">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}
                    <button onClick={() => banWithdrawalUser(w)}
                      className="flex items-center gap-1 bg-secondary ring-1 ring-destructive/40 text-destructive text-[11px] font-semibold px-2.5 py-1.5 rounded-md hover:bg-destructive/10 transition-all active:scale-[0.97]">
                      <Ban className="w-3 h-3" /> Ban
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Postcodes Modal */}
      {showPostcodes && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => { setShowPostcodes(false); setSelectedPostcode(null); }} />
          <div className="relative bg-card w-full max-w-lg max-h-[80vh] rounded-t-xl sm:rounded-xl shadow-2xl ring-1 ring-border flex flex-col animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-heading font-bold text-base tracking-tight">
                {selectedPostcode ? 'Postcode Details' : `Generated Postcodes (${postcodeCount})`}
              </h3>
              <div className="flex items-center gap-1">
                {!selectedPostcode && (
                  <button
                    onClick={() => exportCsv(
                      'postcodes',
                      ['Postcode', 'Address', 'LGA', 'State', 'Country', 'Lat', 'Lng', 'IP', 'Created'],
                      postcodes.map(p => [p.postcode, p.address || '', p.lga || '', p.state, p.country || '', p.lat, p.lng, p.ip_address || '', new Date(p.created_at).toLocaleString()]),
                    )}
                    disabled={postcodes.length === 0}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-secondary transition-colors disabled:opacity-50"
                    title="Export accounts (CSV)">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                )}
                <button onClick={() => { if (selectedPostcode) setSelectedPostcode(null); else { setShowPostcodes(false); setSelectedPostcode(null); } }}
                  className="p-1 rounded hover:bg-secondary transition-colors active:scale-95">
                  {selectedPostcode ? <ArrowLeft className="w-4 h-4 text-muted-foreground" /> : <X className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            {selectedPostcode ? (
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-lg text-foreground">{selectedPostcode.postcode}</p>
                    <p className="text-xs text-muted-foreground">{new Date(selectedPostcode.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {[
                    { label: 'Address', value: selectedPostcode.address || 'N/A' },
                    { label: 'LGA', value: selectedPostcode.lga || 'N/A' },
                    { label: 'State', value: selectedPostcode.state },
                    { label: 'Country', value: selectedPostcode.country || 'Nigeria' },
                    { label: 'Lat', value: selectedPostcode.lat.toFixed(6) + '°' },
                    { label: 'Lng', value: selectedPostcode.lng.toFixed(6) + '°' },
                    { label: 'IP', value: selectedPostcode.ip_address || 'N/A' },
                  ].map((item) => (
                    <div key={item.label} className="bg-secondary/50 rounded-lg px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</p>
                      <p className="text-sm font-heading font-semibold text-foreground mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
                <a href={`https://www.google.com/maps?q=${selectedPostcode.lat},${selectedPostcode.lng}`} target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg hover:bg-primary/90 transition-all active:scale-[0.97]">
                  View on Google Maps
                </a>
              </div>
            ) : loadingPostcodes ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading postcodes…</div>
            ) : (
              <ul className="overflow-y-auto flex-1 divide-y divide-border">
                {postcodes.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setSelectedPostcode(p)}
                      className="w-full text-left px-5 py-3.5 hover:bg-secondary transition-colors flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-heading font-bold text-sm tracking-tight">{p.postcode}</p>
                        {p.address && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.address}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{p.state}{p.country && p.country !== 'Nigeria' ? ` · ${p.country}` : ' State'}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          <p className="text-[10px] text-muted-foreground font-mono">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
                          {p.ip_address && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Globe className="w-2.5 h-2.5" /> {p.ip_address}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Properties Modal */}
      {showProperties && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowProperties(false)} />
          <div className="relative bg-card w-full max-w-lg max-h-[85vh] rounded-t-xl sm:rounded-xl shadow-2xl ring-1 ring-border flex flex-col animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-heading font-bold text-base tracking-tight flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Properties ({propertyCount})
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => exportCsv(
                    'properties',
                    ['Postcode', 'Address', 'State', 'LGA', 'Ward', 'Lat', 'Lng', 'Raw Lat', 'Raw Lng', 'Created'],
                    properties.map(p => [p.postcode, p.address || '', p.state_name || '', p.lga_name || '', p.ward_number ?? '', p.lat, p.lng, p.raw_lat, p.raw_lng, new Date(p.created_at).toLocaleString()]),
                  )}
                  disabled={properties.length === 0}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-secondary transition-colors disabled:opacity-50"
                  title="Export accounts (CSV)">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => setShowProperties(false)} className="p-1 rounded hover:bg-secondary transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="px-4 pt-3 space-y-2">
              {/* Search */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={propertySearch} onChange={e => setPropertySearch(e.target.value)}
                    placeholder="Search postcode, address, LGA..."
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs"
                    onKeyDown={e => { if (e.key === 'Enter') loadProperties(); }} />
                </div>
                <button onClick={loadProperties} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg">
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
                <button onClick={() => { setPropertyFilter('all'); loadProperties(); }}
                  className={`flex-1 text-[10px] py-1.5 rounded font-medium ${propertyFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  All
                </button>
                <button onClick={() => { setPropertyFilter('state'); loadProperties(); }}
                  className={`flex-1 text-[10px] py-1.5 rounded font-medium ${propertyFilter === 'state' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  By State
                </button>
                <button onClick={findDuplicates}
                  className={`flex-1 text-[10px] py-1.5 rounded font-medium flex items-center justify-center gap-1 ${propertyFilter === 'duplicates' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  <AlertTriangle className="w-3 h-3" /> Duplicates
                </button>
              </div>

              {propertyFilter === 'state' && (
                <select value={propertyStateFilter} onChange={e => { setPropertyStateFilter(e.target.value); }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs">
                  <option value="">All States</option>
                  {['Lagos','Abuja','Kano','Rivers','Ogun','Oyo','Kaduna','Enugu','Delta','Anambra','Imo','Edo','Benue','Bauchi','Plateau','Kwara','Osun','Ekiti','Ondo','Cross River','Akwa Ibom','Abia','Ebonyi','Adamawa','Borno','Gombe','Yobe','Bayelsa','Taraba','Niger','Kogi','Nassarawa','Zamfara','Sokoto','Kebbi','Katsina','Jigawa','FCT']
                    .map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {loadingProperties ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading properties…</p>
              ) : propertyFilter === 'duplicates' ? (
                duplicates.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
                    <p className="text-sm text-foreground font-medium">No duplicates found!</p>
                    <p className="text-xs text-muted-foreground">All properties are at least 15m apart.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground text-center">
                      Found {duplicates.length} group{duplicates.length > 1 ? 's' : ''} of nearby properties (&lt;15m)
                    </p>
                    {duplicates.map((group, gi) => (
                      <div key={gi} className="bg-destructive/5 rounded-lg ring-1 ring-destructive/20 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                            {group.length} properties within 15m
                          </p>
                          <button onClick={() => mergeProperties(group)}
                            className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded font-medium flex items-center gap-1">
                            <Merge className="w-3 h-3" /> Merge (keep oldest)
                          </button>
                        </div>
                        {group.map(p => (
                          <div key={p.id} className="bg-background rounded px-3 py-2 text-xs space-y-0.5">
                            <p className="font-mono font-bold text-foreground">{p.postcode}</p>
                            <p className="text-muted-foreground">{p.address || 'No address'}</p>
                            <p className="text-muted-foreground">{p.state_name} · {p.lga_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.lat.toFixed(6)}, {p.lng.toFixed(6)} · {new Date(p.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )
              ) : properties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No properties found</p>
              ) : (
                <div className="space-y-1.5">
                  {properties.map(p => (
                    <div key={p.id} className="bg-secondary/40 rounded-lg px-3 py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-bold text-sm text-foreground">{p.postcode}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{p.address || 'No address'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.state_name || '?'} · {p.lga_name || '?'} · W{p.ward_number || 0}
                          </p>
                          <p className="text-[9px] text-muted-foreground font-mono">
                            {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-primary">
                            <MapPin className="w-3.5 h-3.5" />
                          </a>
                          <button onClick={() => { setEditingProperty(p); setEditPostcode(p.postcode); }}
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-primary">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteProperty(p.id)}
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setEditingProperty(null)} />
          <div className="relative bg-card rounded-xl ring-1 ring-border shadow-2xl p-6 w-full max-w-sm space-y-4 animate-fade-up">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <Edit className="w-4 h-4 text-primary" /> Edit Postcode
            </h3>
            <div className="bg-secondary/50 rounded-lg p-3 text-xs space-y-1">
              <p className="text-muted-foreground">{editingProperty.address || 'No address'}</p>
              <p className="text-muted-foreground">{editingProperty.state_name} · {editingProperty.lga_name}</p>
              <p className="font-mono text-muted-foreground">{editingProperty.lat.toFixed(6)}, {editingProperty.lng.toFixed(6)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Postcode</label>
              <input value={editPostcode} onChange={e => setEditPostcode(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" />
            </div>
            <div className="flex gap-2">
              <button onClick={updatePropertyPostcode}
                className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg">Save</button>
              <button onClick={() => setEditingProperty(null)}
                className="flex-1 bg-secondary text-foreground text-sm font-semibold py-2.5 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Management Modal */}
      {showStaffPanel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowStaffPanel(false)} />
          <div className="relative bg-card w-full max-w-lg max-h-[80vh] rounded-t-xl sm:rounded-xl shadow-2xl ring-1 ring-border flex flex-col animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-heading font-bold text-base tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Staff Management
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => exportCsv(
                    'admin-staff',
                    ['Name', 'Email', 'Active', 'Created', 'Last Login'],
                    staffList.map(s => [s.name, (s as any).email || '', s.is_active ? 'yes' : 'no', new Date(s.created_at).toLocaleString(), s.last_login_at ? new Date(s.last_login_at).toLocaleString() : '']),
                  )}
                  disabled={staffList.length === 0}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-secondary transition-colors disabled:opacity-50"
                  title="Export accounts (CSV)">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => setShowStaffPanel(false)} className="p-1 rounded hover:bg-secondary transition-colors active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Add new staff form */}
            <div className="px-5 py-4 border-b border-border space-y-3">
              <p className="text-xs font-semibold text-foreground">Add New Admin Staff</p>
              <div className="grid grid-cols-1 gap-2">
                <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="Staff Name"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <input type="email" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} placeholder="Email Address"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <div className="flex gap-2">
                  <input value={newStaffPin} onChange={e => setNewStaffPin(e.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="7-digit PIN" maxLength={7}
                    className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm text-center tracking-widest placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <button onClick={async () => {
                    if (!newStaffName.trim() || !newStaffEmail.trim() || newStaffPin.length !== 7) return;
                    const { data, error } = await (supabase as any).rpc('admin_create_staff', {
                      _admin_email: adminEmail.trim().toLowerCase(),
                      _name: newStaffName.trim(),
                      _email: newStaffEmail.trim().toLowerCase(),
                      _new_pin: newStaffPin,
                    });
                    if (error || !data?.success) {
                      alert(data?.error || error?.message || 'Failed to add staff');
                    } else {
                      setNewStaffName(''); setNewStaffEmail(''); setNewStaffPin('');
                      const { data: rows } = await supabase.from('admin_staff')
                        .select('id, name, email, is_active, created_at, last_login_at')
                        .order('created_at', { ascending: false });
                      if (rows) setStaffList(rows as any);
                    }
                  }} disabled={!newStaffName.trim() || !newStaffEmail.trim() || newStaffPin.length !== 7}
                    className="h-9 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg disabled:opacity-50 hover:shadow-md transition-all active:scale-95">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {loadingStaff ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading staff…</div>
            ) : (
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {staffList.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No admin staff found</p>}
                {staffList.map(staff => (
                  <div key={staff.id} className="bg-secondary/50 rounded-lg px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-heading font-semibold text-foreground truncate flex items-center gap-2">
                          {staff.name}
                          {!staff.is_active && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">Inactive</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(staff as any).email || 'No email'} · Added {new Date(staff.created_at).toLocaleDateString()}
                          {staff.last_login_at && <> · Last login: {new Date(staff.last_login_at).toLocaleString()}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isSuperAdmin && (
                          <button
                            onClick={() => { setResettingStaffId(resettingStaffId === staff.id ? null : staff.id); setResetPinValue(''); }}
                            className="p-1.5 rounded hover:bg-background transition-colors" title="Reset PIN">
                            <KeyRound className="w-3.5 h-3.5 text-primary" />
                          </button>
                        )}
                        <button onClick={async () => {
                        await supabase.from('admin_staff').update({ is_active: !staff.is_active }).eq('id', staff.id);
                        setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, is_active: !s.is_active } : s));
                      }} className="p-1.5 rounded hover:bg-background transition-colors" title={staff.is_active ? 'Deactivate' : 'Activate'}>
                        <Shield className={`w-3.5 h-3.5 ${staff.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                      <button onClick={async () => {
                        if (!confirm(`Delete admin "${staff.name}"?`)) return;
                        await supabase.from('admin_staff').delete().eq('id', staff.id);
                        setStaffList(prev => prev.filter(s => s.id !== staff.id));
                      }} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                      </div>
                    </div>
                    {isSuperAdmin && resettingStaffId === staff.id && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          value={resetPinValue}
                          onChange={e => setResetPinValue(e.target.value.replace(/\D/g, '').slice(0, 7))}
                          placeholder="New 7-digit PIN" maxLength={7}
                          className="flex-1 h-8 rounded border border-input bg-background px-2 text-xs text-center tracking-widest" />
                        <button
                          disabled={resetPinValue.length !== 7}
                          onClick={async () => {
                            const adminEmailForRpc = (await supabase.auth.getSession()).data.session?.user?.email || '';
                            const { data, error } = await (supabase as any).rpc('super_admin_set_staff_pin', {
                              _admin_email: adminEmailForRpc,
                              _staff_id: staff.id,
                              _new_pin: resetPinValue,
                            });
                            if (error || !data?.success) { alert(data?.error || error?.message || 'Failed'); return; }
                            // Do not cache the PIN in client state; it is now stored as a bcrypt hash on the server.
                            setResettingStaffId(null); setResetPinValue('');
                          }}
                          className="h-8 px-3 bg-primary text-primary-foreground text-[11px] font-semibold rounded disabled:opacity-50">
                          Save
                        </button>
                        <button onClick={() => { setResettingStaffId(null); setResetPinValue(''); }} className="h-8 px-2 text-[11px] text-muted-foreground">Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowStats(false)} />
          <div className="relative bg-card w-full max-w-lg max-h-[80vh] rounded-t-xl sm:rounded-xl shadow-2xl ring-1 ring-border flex flex-col animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-heading font-bold text-base tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Postcode Statistics
              </h3>
              <button onClick={() => setShowStats(false)} className="p-1 rounded hover:bg-secondary transition-colors active:scale-95">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-1 bg-secondary rounded-lg p-1 mx-4 mt-4">
              {(['state', 'lga', 'ip'] as const).map(t => (
                <button key={t} onClick={() => setStatsTab(t)}
                  className={`flex-1 py-2 rounded-md text-xs font-heading font-semibold transition-all uppercase ${statsTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t === 'ip' ? 'IP Address' : t}
                </button>
              ))}
            </div>
            {loadingStats ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading statistics…</div>
            ) : (
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  {currentStats.length} unique {statsTab === 'ip' ? 'IP addresses' : statsTab === 'lga' ? 'LGAs' : 'states'} · {totalForTab} total
                </p>
                {currentStats.map((entry, i) => {
                  const pct = totalForTab > 0 ? (entry.count / totalForTab) * 100 : 0;
                  return (
                    <div key={entry.label + i} className="bg-secondary/50 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-heading font-semibold text-foreground truncate max-w-[70%]">
                          {statsTab === 'ip' && <Globe className="w-3 h-3 inline mr-1.5 text-muted-foreground" />}
                          {entry.label}
                        </p>
                        <p className="text-sm font-heading font-bold text-primary shrink-0">{entry.count}</p>
                      </div>
                      <div className="w-full bg-border rounded-full h-1.5">
                        <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(1)}%</p>
                    </div>
                  );
                })}
                {currentStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data available</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Referral Users Modal */}
      {showReferralPanel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => { setShowReferralPanel(false); setSelectedReferral(null); }} />
          <div className="relative bg-card w-full max-w-3xl max-h-[88vh] rounded-t-xl sm:rounded-xl shadow-2xl ring-1 ring-border flex flex-col animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-heading font-bold text-base tracking-tight flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" /> Referral Users
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => exportCsv(
                    'referral-accounts',
                    ['Source', 'Identifier', 'Referral Code', 'Total Earned (₦)', 'Balance (₦)', 'Total Referrals', 'Created', 'Updated'],
                    referralAccounts.map(r => [r.source, r.identifier, r.referral_code, r.total_earned, r.balance, r.total_referrals, new Date(r.created_at).toLocaleString(), new Date(r.updated_at).toLocaleString()]),
                  )}
                  disabled={referralAccounts.length === 0}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-secondary transition-colors disabled:opacity-50"
                  title="Export accounts (CSV)">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => { setShowReferralPanel(false); setSelectedReferral(null); }} className="p-1 rounded hover:bg-secondary transition-colors active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-4 border-b border-border">
              <div className="bg-secondary/50 rounded-lg p-2 text-center">
                <p className="text-base font-heading font-bold text-primary">{referralOverview?.total_referrals ?? 0}</p>
                <p className="text-[9px] text-muted-foreground">Credited Referrals</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2 text-center">
                <p className="text-sm font-heading font-bold text-primary">₦{(referralOverview?.total_earned ?? 0).toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">Earned (lifetime)</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2 text-center">
                <p className="text-sm font-heading font-bold text-foreground">₦{(referralOverview?.total_balance ?? 0).toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">Current balance</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2 text-center">
                <p className="text-sm font-heading font-bold text-accent-foreground">₦{(referralOverview?.pending_withdraw_amount ?? 0).toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">Pending withdraw ({referralOverview?.pending_withdraw_count ?? 0})</p>
              </div>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-border flex gap-2">
              <input value={referralSearch} onChange={e => setReferralSearch(e.target.value)}
                placeholder="Search by code or user/device id…"
                className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm" />
              <button onClick={refreshReferralList} className="h-9 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg active:scale-95">Search</button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
              {loadingReferrals ? (
                <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>
              ) : referralAccounts.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">No referral accounts found</div>
              ) : (
                referralAccounts.map((r) => (
                  <button key={`${r.source}-${r.identifier}-${r.referral_code}`}
                    onClick={() => openReferralHistory(r)}
                    className="w-full text-left bg-secondary/50 hover:bg-secondary rounded-lg px-3 py-2 flex items-center justify-between gap-3 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono font-bold text-primary tracking-wider truncate">
                        {r.referral_code}
                        <span className="ml-2 text-[9px] uppercase font-sans bg-background/60 text-muted-foreground px-1.5 py-0.5 rounded">{r.source}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.identifier}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">₦{r.total_earned.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">{r.total_referrals} ref · ₦{r.balance.toLocaleString()} bal</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>

            {/* History sub-modal */}
            {selectedReferral && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-2 bg-foreground/40 backdrop-blur-sm">
                <div className="bg-card w-full max-w-md max-h-[80vh] rounded-xl ring-1 ring-border flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Referral history</p>
                      <p className="font-mono font-bold text-sm text-primary">{selectedReferral.referral_code}</p>
                    </div>
                    <button onClick={() => setSelectedReferral(null)} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
                  </div>
                  {/* Date range filter */}
                  <div className="px-4 pt-3 space-y-2 border-b border-border pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">From</label>
                        <input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)}
                          className="w-full h-8 text-xs rounded-md border border-input bg-background px-2" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">To</label>
                        <input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)}
                          className="w-full h-8 text-xs rounded-md border border-input bg-background px-2" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="bg-primary/10 rounded-md px-2 py-1 text-[10px] flex-1">
                        <span className="text-muted-foreground">Total in range:</span>{' '}
                        <span className="font-bold text-primary">₦{filteredHistoryTotal.toLocaleString()}</span>
                        <span className="text-muted-foreground"> · {filteredReferralHistory.length} entries</span>
                      </div>
                      {(historyDateFrom || historyDateTo) && (
                        <button onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline">Clear</button>
                      )}
                      <button
                        onClick={() => exportCsv(
                          `referral-history-${selectedReferral.referral_code}`,
                          ['Amount (₦)', 'Trigger', 'Referred Device', 'Referred IP', 'Created'],
                          filteredReferralHistory.map(h => [h.amount, h.trigger_event, h.referred_device_id, h.referred_ip || '', new Date(h.created_at).toLocaleString()]),
                        )}
                        disabled={filteredReferralHistory.length === 0}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
                        title="Export accounts (CSV)">
                        <Download className="w-3 h-3" /> CSV
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto p-3 space-y-1.5 flex-1">
                    {/* Signup details for this referral code */}
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-2">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-bold mb-2">Signup details</p>
                      {loadingSignups ? (
                        <p className="text-[11px] text-muted-foreground">Loading…</p>
                      ) : referralSignups.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No signed-up user is linked to this code (still anonymous / device-only).</p>
                      ) : (
                        <div className="space-y-2">
                          {referralSignups.map(s => (
                            <div key={s.user_id} className="text-[11px] text-foreground space-y-0.5">
                              <p className="font-semibold">{s.full_name || '—'} <span className="text-muted-foreground font-normal">· {s.account_type || 'individual'}</span></p>
                              <p className="text-muted-foreground">{s.email || '—'}{s.phone ? ` · ${s.phone}` : ''}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {s.country ? `${s.country} · ` : ''}Signed up {new Date(s.signed_up_at).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {loadingHistory ? (
                      <div className="text-center text-sm text-muted-foreground py-6">Loading…</div>
                    ) : filteredReferralHistory.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-6">
                        {referralHistory.length === 0 ? 'No referrals credited yet for this code.' : 'No referrals in the selected date range.'}
                      </div>
                    ) : filteredReferralHistory.map(h => (
                      <div key={h.id} className="bg-secondary/50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-foreground truncate font-medium">
                            {h.referred_name || h.referred_email || `…${h.referred_device_id?.slice(-10) || 'unknown'}`}
                          </p>
                          {h.referred_email && (
                            <p className="text-[10px] text-muted-foreground truncate">{h.referred_email}{h.referred_phone ? ` · ${h.referred_phone}` : ''}</p>
                          )}
                          <p className="text-[9px] text-muted-foreground truncate">
                            IP: {h.referred_ip || '—'} · {h.trigger_event} · {new Date(h.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-primary">+₦{h.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Password / PIN Modal */}
      {showPasswordPanel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowPasswordPanel(false)} />
          <div className="relative bg-card w-full max-w-md rounded-t-xl sm:rounded-xl shadow-2xl ring-1 ring-border flex flex-col animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-heading font-bold text-base tracking-tight flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" /> Change {isSuperAdmin ? 'Password' : 'PIN'}
              </h3>
              <button onClick={() => setShowPasswordPanel(false)} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            {isSuperAdmin ? (
              <div className="p-5 space-y-3">
                <p className="text-xs text-muted-foreground">Set a new password for your super-admin login. You'll stay signed in on this device.</p>
                <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="New password (min 8 chars)"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Confirm new password"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                {pwMsg && (
                  <p className={`text-xs ${pwMsg.type === 'ok' ? 'text-primary' : 'text-destructive'}`}>{pwMsg.text}</p>
                )}
                <button
                  disabled={pwBusy || pwNew.length < 8 || pwNew !== pwConfirm}
                  onClick={async () => {
                    setPwBusy(true); setPwMsg(null);
                    const { error } = await supabase.auth.updateUser({ password: pwNew });
                    setPwBusy(false);
                    if (error) { setPwMsg({ type: 'err', text: error.message }); return; }
                    setPwMsg({ type: 'ok', text: 'Password updated successfully.' });
                    setPwNew(''); setPwConfirm('');
                  }}
                  className="w-full h-10 bg-primary text-primary-foreground text-sm font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98]">
                  {pwBusy ? 'Updating…' : 'Update password'}
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="text-xs text-muted-foreground">Enter your current 7-digit PIN, then choose a new one.</p>
                <input value={pinCurrent} onChange={e => setPinCurrent(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="Current PIN" maxLength={7}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-center tracking-widest" />
                <input value={pinNew} onChange={e => setPinNew(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="New 7-digit PIN" maxLength={7}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-center tracking-widest" />
                <input value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="Confirm new PIN" maxLength={7}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-center tracking-widest" />
                {pwMsg && (
                  <p className={`text-xs ${pwMsg.type === 'ok' ? 'text-primary' : 'text-destructive'}`}>{pwMsg.text}</p>
                )}
                <button
                  disabled={pwBusy || pinCurrent.length !== 7 || pinNew.length !== 7 || pinNew !== pinConfirm}
                  onClick={async () => {
                    setPwBusy(true); setPwMsg(null);
                    const { data, error } = await (supabase as any).rpc('admin_staff_change_pin', {
                      _email: adminEmail.trim().toLowerCase(),
                      _current_pin: pinCurrent,
                      _new_pin: pinNew,
                    });
                    setPwBusy(false);
                    if (error || !data?.success) {
                      setPwMsg({ type: 'err', text: data?.error || error?.message || 'Failed to update PIN' });
                      return;
                    }
                    setPwMsg({ type: 'ok', text: 'PIN updated successfully. Use it on your next login.' });
                    setPinCurrent(''); setPinNew(''); setPinConfirm('');
                    setPin(pinNew);
                  }}
                  className="w-full h-10 bg-primary text-primary-foreground text-sm font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98]">
                  {pwBusy ? 'Updating…' : 'Update PIN'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {showLiveAnalytics && (
        <Suspense fallback={null}>
          <LiveAnalyticsPanel onClose={() => setShowLiveAnalytics(false)} />
        </Suspense>
      )}
      {showLandmarks && (
        <Suspense fallback={null}>
          <AdminLandmarksPanel
            onClose={() => setShowLandmarks(false)}
            adminEmail={adminEmail}
            adminPin={pin}
          />
        </Suspense>
      )}
      {showSharesAndBans && (
        <Suspense fallback={null}>
          <WhatsappAndBansPanel onClose={() => setShowSharesAndBans(false)} isSuperAdmin={isSuperAdmin} />
        </Suspense>
      )}
      {showBusinesses && (
        <Suspense fallback={null}>
          <BusinessAccountsPanel onClose={() => setShowBusinesses(false)} adminEmail={adminEmail} adminPin={pin} />
        </Suspense>
      )}
      {showRiders && (
        <Suspense fallback={null}>
          <BusinessAccountsPanel onClose={() => setShowRiders(false)} mode="rider" adminEmail={adminEmail} adminPin={pin} />
        </Suspense>
      )}
      {showUsers && (
        <Suspense fallback={null}>
          <BusinessAccountsPanel onClose={() => setShowUsers(false)} mode="individual" adminEmail={adminEmail} adminPin={pin} />
        </Suspense>
      )}
      {showNotifySender && (
        <Suspense fallback={null}>
          <AdminNotifySender onClose={() => setShowNotifySender(false)} adminEmail={adminEmail} adminPin={pin} />
        </Suspense>
      )}
      {showTrialReminders && (
        <Suspense fallback={null}>
          <TrialReminderEmailsPanel onClose={() => setShowTrialReminders(false)} adminEmail={adminEmail} adminPin={pin} />
        </Suspense>
      )}

      {showReconciliation && (
        <Suspense fallback={null}>
          <PaymentReconciliationPanel onClose={() => setShowReconciliation(false)} />
        </Suspense>
      )}
    </div>
  );
}

// Haversine distance in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
