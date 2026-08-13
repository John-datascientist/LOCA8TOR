import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ensureRiderProfileFromMetadata } from '@/lib/authProfile';

/**
 * Wraps /login and /signup. If a session already exists AND the email is
 * confirmed, push the user away from auth screens so they can't re-enter
 * the signup/OTP flow while logged in.
 *
 * Unconfirmed users (mid-OTP) stay on the page so they can finish verifying.
 */
export default function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    const routeFor = async (user: any) => {
      if (cancelled || !user) return;
      const isConfirmed = !!user.email_confirmed_at || !!user.confirmed_at;
      if (!isConfirmed) return;
      // If the user is already signed in AND confirmed, push them out of the
      // auth screens — even when arriving from the verification link
      // (`?verified=1`). The /verify callback auto-creates a session, so
      // asking them to sign in again is redundant and causes "Email not
      // confirmed" errors when the browser autofills a different account.
      const redirect = searchParams.get('redirect');
      if (redirect) { setRedirectTo(redirect); return; }
      const { data: rider } = await supabase
        .from('riders')
        .select('account_type, worker_type')
        .eq('user_id', user.id)
        .maybeSingle();
      const profile = rider || await ensureRiderProfileFromMetadata(user).catch(() => null);
      if (searchParams.get('type') === 'business') setRedirectTo('/billing');
      else if (profile?.account_type === 'business') setRedirectTo('/business');
      else if (
        (profile as any)?.account_type === 'rider' ||
        ['rider', 'driver'].includes(String((profile as any)?.worker_type || ''))
      ) setRedirectTo('/rider');
      else setRedirectTo('/refer');
    };

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      await routeFor(data.user);
      setChecked(true);
    })();

    // Also react to the SIGNED_IN event that fires after the /verify hash
    // tokens are parsed by the Supabase client on this page load.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) routeFor(session.user);
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [searchParams]);

  if (!checked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}