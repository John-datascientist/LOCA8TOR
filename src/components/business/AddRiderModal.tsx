import { useState } from 'react';
import { X, Copy, MessageCircle, Share2, Mail, UserPlus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  businessCode: string;
  businessName: string;
  onClose: () => void;
  onGoToRequests: () => void;
}

export default function AddRiderModal({ businessCode, businessName, onClose, onGoToRequests }: Props) {
  const [phone, setPhone] = useState('');

  const inviteText = `You're invited to join ${businessName || 'our delivery team'} on Loca8tor.\n\nDownload Loca8tor, sign up as a Rider / Driver, then search for our business code: ${businessCode}\n\nhttps://loca8tor.com`;

  const copy = async (text: string, label = 'Copied') => {
    try { await navigator.clipboard.writeText(text); toast.success(label); }
    catch { toast.error('Could not copy'); }
  };

  const sendWhatsApp = () => {
    const digits = phone.replace(/[^0-9]/g, '');
    const target = digits ? (digits.startsWith('0') ? '234' + digits.slice(1) : digits) : '';
    const url = `https://wa.me/${target}?text=${encodeURIComponent(inviteText)}`;
    window.open(url, '_blank');
  };

  const sendEmail = () => {
    const url = `mailto:?subject=${encodeURIComponent('Join our Loca8tor team')}&body=${encodeURIComponent(inviteText)}`;
    window.location.href = url;
  };

  const nativeShare = async () => {
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: 'Join us on Loca8tor', text: inviteText }); return; } catch {}
    }
    copy(inviteText, 'Invite copied');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl ring-1 ring-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <p className="font-heading font-bold text-sm text-foreground">Add a Rider / Driver</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Business code */}
          <div className="bg-primary/5 ring-1 ring-primary/20 rounded-xl p-4 text-center space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Your business code</p>
            <p className="font-mono font-extrabold text-2xl text-primary tracking-widest">{businessCode || '—'}</p>
            <button
              onClick={() => copy(businessCode, 'Business code copied')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              <Copy className="w-3 h-3" /> Copy code
            </button>
          </div>

          {/* Steps */}
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Rider downloads Loca8tor and signs up as a <b>Rider / Driver</b>.</li>
            <li>They search for your business code above and tap <b>Request to Join</b>.</li>
            <li>You approve them under <b>Join Requests</b>.</li>
          </ol>

          {/* Direct invite */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-foreground">Send a direct invite</p>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Rider phone (optional)"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
              <button
                onClick={sendWhatsApp}
                className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-md bg-[#25D366] text-white hover:brightness-110">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={sendEmail}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-secondary hover:bg-secondary/70">
                <Mail className="w-3.5 h-3.5" /> Email invite
              </button>
              <button onClick={() => copy(inviteText, 'Invite copied')}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-secondary hover:bg-secondary/70">
                <Copy className="w-3.5 h-3.5" /> Copy message
              </button>
              <button onClick={nativeShare}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-secondary hover:bg-secondary/70">
                <Share2 className="w-3.5 h-3.5" /> Share…
              </button>
            </div>
          </div>

          <button
            onClick={onGoToRequests}
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-bold py-2.5 rounded-lg hover:brightness-110">
            View Join Requests <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}