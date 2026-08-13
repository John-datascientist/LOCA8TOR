import { useEffect, useState } from 'react';
import { MessageCircle, Check, Loader2, Share2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  buildShareMessage,
  buildWhatsAppLink,
  getShareGateStatus,
  listMyShares,
  maskPhone,
  normalizeWhatsAppPhone,
  recordWhatsAppShare,
  sweepPendingReferralCredits,
  type ShareGateStatus,
} from '@/lib/whatsappShare';

interface Props {
  /** Called once the gate is fully passed (10/10). */
  onPassed?: () => void;
  /** Optional heading override. */
  title?: string;
  /** Optional subtitle/explanation. */
  subtitle?: string;
}

export default function WhatsAppShareGate({ onPassed, title, subtitle }: Props) {
  const [status, setStatus] = useState<ShareGateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shares, setShares] = useState<Array<{ id: string; recipient_phone: string; created_at: string }>>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const refresh = async () => {
    const s = await getShareGateStatus();
    setStatus(s);
    const list = await listMyShares();
    setShares(list);
    setLoading(false);
    if (s.gate_passed && onPassed) onPassed();
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: urb } = await supabase
          .from('user_referral_balances' as any)
          .select('referral_code')
          .eq('user_id', user.id)
          .maybeSingle();
        if ((urb as any)?.referral_code) setReferralCode((urb as any).referral_code);
      }
      await refresh();
    })();
  }, []);

  const handleShare = async () => {
    const normalized = normalizeWhatsAppPhone(phone);
    if (!normalized) {
      toast({ title: 'Invalid phone number', description: 'Enter a valid WhatsApp number with country code (e.g. 08012345678 or +44…).', variant: 'destructive' });
      return;
    }
    const message = buildShareMessage(referralCode);
    const url = buildWhatsAppLink(normalized, message);

    // Open WhatsApp synchronously via a real anchor click so mobile browsers
    // and Capacitor webview don't treat it as a blocked popup.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setSubmitting(true);
    const result = await recordWhatsAppShare(normalized, message);
    setSubmitting(false);

    if (!result.success) {
      const errMap: Record<string, string> = {
        invalid_phone: 'Enter a valid WhatsApp number.',
        own_phone: 'You cannot share to your own number.',
        rate_limited: 'Too many shares in 24 hours. Try again later.',
        not_authenticated: 'Please sign in first.',
      };
      toast({ title: 'Could not record share', description: errMap[result.error || ''] || result.error, variant: 'destructive' });
      return;
    }

    if (result.duplicate) {
      toast({ title: 'Already shared with this number', description: 'Each unique recipient counts once. Try a different contact.', variant: 'destructive' });
      return;
    }

    toast({ title: `Share recorded (${result.total_shares}/10)`, description: result.gate_passed ? 'Gate unlocked! 🎉' : `${result.remaining} more to go.` });
    setPhone('');
    await refresh();
    if (result.gate_passed) {
      // Credit any pending referrals waiting on the gate
      sweepPendingReferralCredits().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = status?.total_shares || 0;
  const required = status?.required || 10;
  const progressPct = Math.min(100, (total / required) * 100);
  const passed = !!status?.gate_passed;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          {title || 'WhatsApp Share Verification'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {subtitle || 'Share Loca8tor with 10 unique WhatsApp contacts to unlock withdrawals and referral rewards.'}
        </p>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-xl ring-1 ring-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
          <span className="font-heading text-sm font-bold text-foreground">
            {total} / {required}
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full transition-all ${passed ? 'bg-primary' : 'bg-primary/70'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {passed ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Check className="w-4 h-4" /> Verified — you can now withdraw and receive referral rewards.
          </div>
        ) : (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{required - total} more unique number{required - total === 1 ? '' : 's'} required.</span>
          </div>
        )}
      </div>

      {/* Share input */}
      {!passed && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Contact's WhatsApp number</label>
          <div className="flex gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678 or +44…"
              type="tel"
              className="flex h-11 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              onClick={handleShare}
              disabled={submitting || !phone.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              Share
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Each unique contact counts once. We open WhatsApp with a prefilled invite — you tap Send to deliver it.
          </p>
        </div>
      )}

      {/* Share log */}
      {shares.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your shares</p>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {shares.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-card rounded-lg ring-1 ring-border px-3 py-2">
                <span className="font-mono text-xs text-foreground">{maskPhone(s.recipient_phone)}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}