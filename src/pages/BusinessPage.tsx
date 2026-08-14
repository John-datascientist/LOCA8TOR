import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ensureRiderProfileFromMetadata } from '@/lib/authProfile';
const BusinessDashboard = lazy(() => import('@/components/BusinessDashboard'));

export default function BusinessPage() {
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    // Block unverified users — they must complete the email OTP flow first.
    const isConfirmed = !!user.email_confirmed_at || !!(user as any).confirmed_at;
    if (!isConfirmed) {
      await supabase.auth.signOut();
      navigate('/signup');
      return;
    }

    const { data: riderData } = await supabase.from('riders')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    const profile = riderData || await ensureRiderProfileFromMetadata(user).catch(() => null);

    if (!profile || profile.account_type !== 'business') {
      navigate('/signup?type=business');
      return;
    }

    // Lock business dashboard until subscription is active or trialing.
    // Use the same effective-status RPC as /onboarding/billing and
    // RequireAuthForNonNG (not the raw riders.subscription_status column,
    // which doesn't get updated for wallet-started trials/subscriptions and
    // was causing this page to disagree with /onboarding/billing about
    // whether the account was paid — bouncing the user back and forth
    // between the two forever).
    const { data: effRes } = await (supabase as any).rpc('get_effective_subscription_status', { p_user_id: user.id });
    const eff = Array.isArray(effRes) ? effRes[0] : effRes;
    const effectiveStatus = (eff?.effective_status as string) || '';
    const activeLike = ['active', 'trialing', 'trial'].includes(effectiveStatus);
    if (!activeLike) {
      navigate('/onboarding/billing');
      return;
    }

    setRider(profile);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <BusinessDashboard profile={rider} />
    </Suspense>
  );
}
