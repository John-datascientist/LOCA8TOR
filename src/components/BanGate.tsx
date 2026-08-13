import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert } from 'lucide-react';

/**
 * Globally checks the signed-in user's `riders.is_banned` flag. If banned,
 * shows a full-screen modal with the reason and signs the user out on
 * acknowledgement. Also subscribes to live updates so an admin ban kicks
 * the user out within seconds.
 */
export default function BanGate({ children }: { children: React.ReactNode }) {
  const [banned, setBanned] = useState<{ reason: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const check = async (userId: string) => {
      const { data } = await supabase
        .from('riders')
        .select('is_banned, ban_reason')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.is_banned) setBanned({ reason: data.ban_reason });
      else setBanned(null);
    };

    const subscribe = (userId: string) => {
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel(`ban-gate-${userId}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'riders', filter: `user_id=eq.${userId}` },
          (payload: any) => {
            if (payload.new?.is_banned) setBanned({ reason: payload.new.ban_reason });
          })
        .subscribe();
    };

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) { await check(data.user.id); subscribe(data.user.id); }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user?.id) { check(session.user.id); subscribe(session.user.id); }
      else { setBanned(null); if (channel) { supabase.removeChannel(channel); channel = null; } }
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); if (channel) supabase.removeChannel(channel); };
  }, []);

  if (banned) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-destructive/40 rounded-2xl p-6 space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="font-heading text-xl font-extrabold text-foreground">Your account has been banned</h2>
          <p className="text-sm text-muted-foreground">
            {banned.reason
              ? <>Reason: <span className="text-foreground font-semibold">{banned.reason}</span></>
              : 'An administrator has banned this account.'}
          </p>
          <p className="text-xs text-muted-foreground">
            If you believe this is a mistake, please email <a className="text-primary underline" href="mailto:support@loca8tor.com">support@loca8tor.com</a>.
          </p>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
            className="w-full py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg hover:brightness-110 transition-all"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}