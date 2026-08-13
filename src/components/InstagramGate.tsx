import { useEffect, useState } from 'react';
import { ArrowLeft, Instagram, Facebook, ExternalLink, CheckCircle2, Heart, UserPlus, Repeat2 } from 'lucide-react';

const INSTAGRAM_URL = 'https://www.instagram.com/loca8tor/';
const FACEBOOK_URL = 'https://www.facebook.com/share/1CRaM7iD6m/?mibextid=wwXIfr';
const COOLDOWN_SECONDS = 20;

/**
 * The social-media gate is intentionally NOT persisted. Every withdrawal
 * attempt must re-prompt the user so they can't bank a single follow/like
 * session and use it to drain new earnings indefinitely.
 */
export function hasPassedInstagramGate(): boolean { return false; }
function markPassed() { /* no-op: gate must be passed for every withdrawal */ }

interface Props {
  onBack: () => void;
  onContinue: () => void;
}

type Platform = 'instagram' | 'facebook';

export default function InstagramGate({ onBack, onContinue }: Props) {
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [opened, setOpened] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [followed, setFollowed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);

  useEffect(() => {
    if (!opened || cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [opened, cooldown]);

  // Reset confirmation state when switching tabs so users can't carry checks across platforms.
  const switchPlatform = (p: Platform) => {
    if (p === platform) return;
    setPlatform(p);
    setOpened(false);
    setCooldown(0);
    setFollowed(false);
    setLiked(false);
    setReposted(false);
  };

  const url = platform === 'instagram' ? INSTAGRAM_URL : FACEBOOK_URL;
  const handle = platform === 'instagram' ? '@loca8tor' : 'Loca8tor';
  const repostWord = platform === 'instagram' ? 'reshare' : 'share';

  const openSocial = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpened(true);
    setCooldown(COOLDOWN_SECONDS);
  };

  const canContinue = opened && cooldown === 0 && followed && liked && reposted;

  const handleContinue = () => {
    if (!canContinue) return;
    markPassed();
    onContinue();
  };

  const gradient = platform === 'instagram'
    ? 'from-pink-500 via-fuchsia-500 to-amber-400'
    : 'from-blue-700 via-blue-600 to-sky-500';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">One quick step</h2>
          <p className="text-xs text-muted-foreground">Support us on Instagram <span className="font-semibold">or</span> Facebook to unlock withdrawal</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/60 rounded-xl ring-1 ring-border">
        <button
          onClick={() => switchPlatform('instagram')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-heading font-bold transition-all ${platform === 'instagram' ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground'}`}
        >
          <Instagram className="w-4 h-4" /> Instagram
        </button>
        <button
          onClick={() => switchPlatform('facebook')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-heading font-bold transition-all ${platform === 'facebook' ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground'}`}
        >
          <Facebook className="w-4 h-4" /> Facebook
        </button>
      </div>

      <div className="rounded-xl ring-1 ring-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
            {platform === 'instagram'
              ? <Instagram className="w-6 h-6 text-white" />
              : <Facebook className="w-6 h-6 text-white" />}
          </div>
          <div>
            <p className="font-heading font-bold text-foreground">{handle}</p>
            <p className="text-[11px] text-muted-foreground">Follow + like 3 + {repostWord} 3 posts to continue</p>
          </div>
        </div>

        <ol className="space-y-2.5 text-sm text-foreground">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
            <span>Open our {platform === 'instagram' ? 'Instagram' : 'Facebook'} page</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
            <span><span className="font-semibold">Follow</span> {handle}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
            <span><span className="font-semibold">Like at least 3 posts</span></span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">4</span>
            <span><span className="font-semibold">Repost / {repostWord} at least 3 posts</span></span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">5</span>
            <span>Return here and confirm below</span>
          </li>
        </ol>

        <button
          onClick={openSocial}
          className={`w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${gradient} text-white font-heading font-semibold text-sm py-3 shadow-md hover:shadow-lg transition-all active:scale-[0.98]`}
        >
          <ExternalLink className="w-4 h-4" />
          {opened ? `Open ${platform === 'instagram' ? 'Instagram' : 'Facebook'} again` : `Open ${platform === 'instagram' ? 'Instagram' : 'Facebook'}`}
        </button>

        {opened && cooldown > 0 && (
          <p className="text-center text-[11px] text-muted-foreground">
            Take a moment on {platform === 'instagram' ? 'Instagram' : 'Facebook'} — you can confirm in <span className="font-semibold text-foreground">{cooldown}s</span>
          </p>
        )}

        <div className="space-y-2 pt-1">
          <label className={`flex items-start gap-2.5 rounded-lg ring-1 p-3 cursor-pointer transition-colors ${followed ? 'ring-primary bg-primary/5' : 'ring-border bg-secondary/30'}`}>
            <input
              type="checkbox"
              checked={followed}
              onChange={e => setFollowed(e.target.checked)}
              disabled={!opened || cooldown > 0}
              className="mt-0.5 w-4 h-4 accent-primary disabled:opacity-50"
            />
            <span className="text-xs text-foreground flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-primary" />
              I have followed <span className="font-semibold">{handle}</span>
            </span>
          </label>
          <label className={`flex items-start gap-2.5 rounded-lg ring-1 p-3 cursor-pointer transition-colors ${liked ? 'ring-primary bg-primary/5' : 'ring-border bg-secondary/30'}`}>
            <input
              type="checkbox"
              checked={liked}
              onChange={e => setLiked(e.target.checked)}
              disabled={!opened || cooldown > 0}
              className="mt-0.5 w-4 h-4 accent-primary disabled:opacity-50"
            />
            <span className="text-xs text-foreground flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-pink-500" />
              I have liked at least <span className="font-semibold">3 posts</span>
            </span>
          </label>
          <label className={`flex items-start gap-2.5 rounded-lg ring-1 p-3 cursor-pointer transition-colors ${reposted ? 'ring-primary bg-primary/5' : 'ring-border bg-secondary/30'}`}>
            <input
              type="checkbox"
              checked={reposted}
              onChange={e => setReposted(e.target.checked)}
              disabled={!opened || cooldown > 0}
              className="mt-0.5 w-4 h-4 accent-primary disabled:opacity-50"
            />
            <span className="text-xs text-foreground flex items-center gap-1.5">
              <Repeat2 className="w-3.5 h-3.5 text-primary" />
              I have {repostWord}d at least <span className="font-semibold">3 posts</span>
            </span>
          </label>
        </div>

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          <CheckCircle2 className="w-4 h-4" />
          Continue to withdrawal
        </button>

        <p className="text-[10px] text-muted-foreground text-center">
          We verify follows, likes and reposts manually. False confirmations may delay or cancel your payout.
        </p>
      </div>
    </div>
  );
}