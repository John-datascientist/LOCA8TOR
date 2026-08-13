import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/loca8tor-logo-green.png';
import { useUserAccess } from '@/hooks/useUserAccess';
import NotificationBell from '@/components/NotificationBell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type NavLinkDef = { href: string; label: string; ngOnly?: boolean };

const publicLinks: NavLinkDef[] = [
  { href: '/', label: 'Home' },
  { href: '/generate', label: 'Generate' },
  { href: '/search', label: 'Search' },
  // Nigeria-only features (super admins / preview always see them).
  { href: '/quiz', label: 'Quiz', ngOnly: true },
];

// Secondary links surfaced in the footer on desktop, and the burger menu on mobile.
const secondaryLinks: NavLinkDef[] = [
  { href: '/track', label: 'Track Delivery' },
  { href: '/api', label: 'Developers' },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [riderType, setRiderType] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const { ready, isSuperAdmin, showNgFeatures } = useUserAccess();
  // showNgFeatures is now always true (NG-only gating removed for these
  // features), so don't block the nav while country detection is in-flight —
  // otherwise a slow get-ip call hides Quiz/etc. indefinitely.
  const showNg = showNgFeatures;
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    // Hydrate immediately from cached profile so a refresh doesn't flash
    // "Account User" while the riders query is in flight.
    try {
      const cached = localStorage.getItem('loca8tor:profile');
      if (cached) {
        const p = JSON.parse(cached);
        if (p?.fullName) setFullName(p.fullName);
        if (p?.riderType) setRiderType(p.riderType);
      }
    } catch {}

    const fetchProfile = async (u: any, attempt = 0) => {
      if (cancelled || !u) return;
      const { data, error } = await supabase
        .from('riders')
        .select('account_type, worker_type, full_name')
        .eq('user_id', u.id)
        .maybeSingle();
      if (cancelled) return;
      // If RLS hasn't picked up the session yet, retry a couple times.
      if (error && attempt < 3) {
        setTimeout(() => fetchProfile(u, attempt + 1), 400 * (attempt + 1));
        return;
      }
      const name = (data?.full_name as string | undefined)
        || (u.user_metadata?.full_name as string | undefined)
        || (u.email ? String(u.email).split('@')[0] : null);
      const isRiderish = ['rider', 'driver'].includes(String((data as any)?.worker_type || ''));
      const rType = isRiderish ? 'rider' : (data?.account_type || null);
      setRiderType(rType);
      setFullName(name || null);
      try {
        localStorage.setItem('loca8tor:profile', JSON.stringify({ fullName: name, riderType: rType }));
      } catch {}
    };

    const applyUser = (u: any) => {
      if (cancelled) return;
      setUser(u);
      if (u) {
        fetchProfile(u);
      } else {
        setRiderType(null);
        setFullName(null);
        try { localStorage.removeItem('loca8tor:profile'); } catch {}
      }
    };

    // getSession reads from local storage immediately (no network), avoiding
    // the race where getUser resolves after onAuthStateChange fires INITIAL_SESSION.
    supabase.auth.getSession().then(({ data: { session } }) => applyUser(session?.user || null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      applyUser(session?.user || null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    // Close the modal and reset UI immediately so the user isn't stuck on a
    // spinner if the network call hangs (e.g. expired token, offline).
    setConfirmSignOut(false);
    setUser(null);
    setRiderType(null);
    setFullName(null);
    try { localStorage.removeItem('loca8tor:profile'); } catch {}
    try {
      // `local` scope clears the session from this browser without needing a
      // round-trip to revoke server-side refresh tokens, which can hang when
      // the stored session is already invalid.
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch (e) {
      console.error('signOut error', e);
    }
    // Hard-clear any lingering Supabase auth keys as a safety net.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') && k.includes('-auth-token'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    navigate('/');
  };

  // Hide Nigeria-only links from non-NG users (super admins & preview always see them).
  const links: NavLinkDef[] = publicLinks.filter(l => !l.ngOnly || showNg);
  if (user) links.push({ href: '/billing', label: 'Billing' });
  if (user && riderType === 'business') links.push({ href: '/business', label: 'Dashboard' });
  if (user && riderType === 'rider') links.push({ href: '/rider', label: 'Rider / Driver App' });

  // Mobile menu also shows secondary links + History (for signed-in users).
  const mobileLinks: NavLinkDef[] = [
    ...links,
    ...secondaryLinks,
    ...(user ? [{ href: '/history', label: 'History' } as NavLinkDef] : []),
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-5 md:px-7 transition-all duration-300 border-b
          ${scrolled ? 'bg-card/95 backdrop-blur-xl shadow-lg shadow-black/20 border-border' : 'bg-background/90 backdrop-blur-md border-transparent'}`}
      >
        <Link to="/" className="flex items-center gap-1.5 no-underline">
          <img src={logoImg} alt="Loca8tor" className="w-9 h-9 object-contain bg-primary rounded-lg p-0.5" />
          <span className="font-heading text-xl font-black tracking-tight text-foreground">
            LOCA<span className="text-primary">8</span>TOR
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-0.5">
          {links.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all
                ${location.pathname === l.href
                  ? 'text-primary bg-primary/15 font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 text-primary rounded-full text-[11px] font-bold max-w-[180px]"
                title={fullName || undefined}
              >
                <span className="truncate">
                  {fullName ? fullName.trim().split(/\s+/)[0] : 'Account'}
                </span>
                <span className="opacity-70 font-medium">
                  · {isSuperAdmin ? 'Super Admin' : riderType === 'business' ? 'Business' : riderType === 'rider' ? 'Rider / Driver' : 'User'}
                </span>
              </span>
              <button
                onClick={() => setConfirmSignOut(true)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </>
          ) : (
            showNg && (
              <>
                <Link to="/login" className="px-4 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">Sign In</Link>
                <Link to="/signup" className="px-5 py-2 rounded-lg text-[13px] font-bold bg-primary text-primary-foreground hover:brightness-110 transition-all hover:-translate-y-px">Get Started</Link>
              </>
            )
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          {user && <NotificationBell />}
          <button className="text-foreground p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-background z-40 pt-20 px-6 flex flex-col gap-1 md:hidden">
          {mobileLinks.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`py-3.5 px-4 font-heading text-lg font-bold border-b border-border transition-colors
                ${location.pathname === l.href ? 'text-primary' : 'text-foreground'}`}
            >
              {l.label}
            </Link>
          ))}
          <div className="py-3.5 px-4 border-b border-border flex items-center justify-between">
            <span className="font-heading text-lg font-bold text-foreground">Theme</span>
            <ThemeToggle />
          </div>
          {user ? (
            <button
              onClick={() => setConfirmSignOut(true)}
              className="py-3.5 px-4 font-heading text-lg font-bold text-destructive border-b border-border text-left"
            >
              Sign Out
            </button>
          ) : (
            showNg && (
              <>
                <Link to="/login" className="py-3.5 px-4 font-heading text-lg font-bold text-primary border-b border-border">Sign In →</Link>
                <Link to="/signup" className="mt-4 py-3 rounded-lg text-center font-bold bg-primary text-primary-foreground">Get Started</Link>
              </>
            )
          )}
        </div>
      )}

      <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of Loca8tor?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, stay signed in</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Yes, sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
