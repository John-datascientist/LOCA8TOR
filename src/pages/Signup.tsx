import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/loca8tor-logo-green.png';
import { getSignupRedirectUrl } from '@/lib/authProfile';
import SEO from '@/components/SEO';
import GoogleSignInButton from '@/components/GoogleSignInButton';

type AccountType = 'individual' | 'rider' | 'business';

function getPendingReferralCode(): string | null {
  try {
    return localStorage.getItem('loca8tor-pending-ref');
  } catch {
    return null;
  }
}

export default function Signup() {
  const [searchParams] = useSearchParams();
  const pendingRefCode = searchParams.get('ref') || getPendingReferralCode();
  // Only the dedicated Refer & Earn signup is fixed to individual.
  // A shared referral link can be used by a Business account too.
  const isReferralFlow = (searchParams.get('redirect') || '').startsWith('/refer');
  const initialType: AccountType = isReferralFlow
    ? 'individual'
    : ((searchParams.get('type') as AccountType) || 'individual');
  const [accountType, setAccountType] = useState<AccountType>(initialType);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [businessCode, setBusinessCode] = useState('');
  const [validatedBusinessId, setValidatedBusinessId] = useState<string | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [riderPostcode, setRiderPostcode] = useState('');
  const [workerType, setWorkerType] = useState<'rider' | 'driver'>('rider');
  const [vehicleType, setVehicleType] = useState<'bike' | 'car' | 'bus' | 'truck'>('bike');
  const [riderMode, setRiderMode] = useState<'individual' | 'company'>('company');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  // While the OTP step is active, warn before the user navigates away — losing
 // this tab would leave them with an unverified auth user and no profile row.
  useEffect(() => {
    if (!success) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [success]);

  const strengthScore = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthColor = ['bg-destructive', 'bg-destructive', 'bg-amber-500', 'bg-primary', 'bg-primary'][strengthScore];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !phone) { setError('Please fill in all required fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (accountType === 'business' && !businessName) { setError('Business name is required'); return; }
    if (accountType === 'rider') {
      if (riderMode === 'company') {
        const code = businessCode.trim().toUpperCase();
        if (!code) { setError('A business code is required to register as a company rider'); return; }
      }
      if (!riderPostcode.trim()) { setError('Your home/location postcode is required'); return; }
      if (workerType === 'driver' && vehicleType === 'bike') {
        setError('Please choose a vehicle type (car, bus, or truck) for driver accounts');
        return;
      }
    }

    setLoading(true);
    setError('');

    // Validate rider's home postcode against generated postcodes.
    if (accountType === 'rider') {
      const { data: pData, error: pErr } = await (supabase as any).rpc('validate_generated_postcode', {
        p_code: riderPostcode.trim().toUpperCase(),
      });
      const prow = Array.isArray(pData) ? pData[0] : pData;
      if (pErr || !prow?.ok) {
        setError(prow?.message || 'Postcode not found. Please generate it first from the Generate page.');
        setLoading(false);
        return;
      }
    }

    // Company riders must be tied to a business that has an active subscription.
    // Independent riders skip this — they can link to a business later.
    if (accountType === 'rider' && riderMode === 'company') {
      const { data: vData, error: vErr } = await (supabase as any).rpc('validate_business_code', {
        p_code: businessCode.trim().toUpperCase(),
      });
      const row = Array.isArray(vData) ? vData[0] : vData;
      if (vErr || !row?.ok) {
        setError(row?.message || 'Invalid business code. Ask your business for a valid code.');
        setLoading(false);
        return;
      }
      setValidatedBusinessId(row.business_user_id);
    }

    // Validate manually entered referral code (optional field).
    const _manualRef = referralCodeInput.trim().toUpperCase();
    if (!pendingRefCode && _manualRef) {
      const { data: rData, error: rErr } = await (supabase as any).rpc('validate_referral_code', {
        p_code: _manualRef,
      });
      const rrow = Array.isArray(rData) ? rData[0] : rData;
      if (rErr || !rrow?.ok) {
        setError(rrow?.message || 'Invalid referral code. Please check and try again.');
        setLoading(false);
        return;
      }
    }

    // Accept Nigerian numbers in local (0801...) or international (+2348...) form.
    let normalizedPhone = phone.trim().replace(/[\s-]/g, '');
    if (normalizedPhone.startsWith('+234')) normalizedPhone = '0' + normalizedPhone.slice(4);
    else if (normalizedPhone.startsWith('234')) normalizedPhone = '0' + normalizedPhone.slice(3);

    // Detect country + IP up-front. The IP is stored on the rider row so admins
    // can ban a network and so duplicate signups from the same IP are blocked.
    let detectedCountry = '';
    let detectedIp = '';
    try {
      const { data: ipData } = await supabase.functions.invoke('get-ip');
      detectedCountry = String(ipData?.country || '').toUpperCase();
      detectedIp = String(ipData?.ip || '');
    } catch {}

    // Server-side uniqueness check: blocks duplicate name/phone/IP and any
    // identifiers an admin has explicitly banned.
    const { data: uniq, error: uniqErr } = await (supabase as any).rpc('check_signup_unique', {
      p_email: email.trim(),
      p_full_name: fullName.trim(),
      p_phone: normalizedPhone,
      p_ip: detectedIp,
    });
    if (!uniqErr) {
      const row = Array.isArray(uniq) ? uniq[0] : uniq;
      if (row && row.ok === false) {
        setError(row.message || 'Signup blocked — duplicate or banned details.');
        setLoading(false);
        return;
      }
    }

    const manualRef = referralCodeInput.trim().toUpperCase();
    const effectiveRef = pendingRefCode || (manualRef.length > 0 ? manualRef : null);
    const generatedBusinessCode = accountType === 'business'
      ? `BIZ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : null;
    const generatedReferralCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getSignupRedirectUrl(),
        data: {
          full_name: fullName.trim(),
          phone: normalizedPhone,
          country: detectedCountry || null,
          signup_ip: detectedIp || null,
          account_type: accountType,
          business_name: accountType === 'business' ? businessName.trim() : null,
          business_code: generatedBusinessCode,
          location: location || '',
          home_postcode: accountType === 'rider' ? riderPostcode.trim().toUpperCase() : null,
          referral_code: generatedReferralCode,
          referrer_code: effectiveRef,
          rider_mode: accountType === 'rider' ? riderMode : null,
          pending_business_code: accountType === 'rider' && riderMode === 'company'
            ? businessCode.trim().toUpperCase()
            : null,
          worker_type: accountType === 'rider' ? workerType : null,
          vehicle_type: accountType === 'rider'
            ? (workerType === 'rider' ? 'bike' : vehicleType)
            : null,
        },
      },
    });

    if (authError) {
      const lower = (authError.message || '').toLowerCase();
      // If the auth user already exists but is unverified, send a fresh
      // verification link instead of forcing them to start again.
      if (lower.includes('already') || lower.includes('registered') || lower.includes('exists')) {
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: getSignupRedirectUrl() },
        });
        if (!resendError) {
          setSuccess(true);
          setLoading(false);
          return;
        }
        // Resend only fails when the user is already verified — then they
        // really should sign in.
        setError('This email is already registered and verified. Please sign in instead.');
        setLoading(false);
        return;
      }
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getSignupRedirectUrl() },
    });
    if (resendError) setError(resendError.message);
    setResending(false);
  };

  if (success) {
    const successCopy = accountType === 'business'
      ? {
          title: 'Check your email',
          body: `We sent a verification link to ${email}. Open the link to activate your Business account, then sign in to choose a plan.`,
          ctaLabel: 'Go to sign in →',
          ctaTo: '/login',
        }
      : accountType === 'rider'
        ? {
            title: 'Check your email',
            body: `We sent a verification link to ${email}. Open the link to activate your Rider / Driver account, then sign in.`,
            ctaLabel: 'Go to sign in →',
            ctaTo: '/login',
          }
        : {
            title: 'Check your email',
            body: `We sent a verification link to ${email}. Open it to activate your account, then sign in.`,
            ctaLabel: 'Go to sign in →' as string | null,
            ctaTo: '/login' as string | null,
          };
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center space-y-4 max-w-[420px]">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-heading text-2xl font-bold">{successCopy.title}</h2>
          <p className="text-muted-foreground text-sm">{successCopy.body}</p>
          {successCopy.ctaLabel && successCopy.ctaTo ? (
            <div className="pt-2 space-y-2">
              {error && (
                <div className="text-destructive text-xs bg-destructive/10 rounded-lg p-3 text-center">{error}</div>
              )}
              <button
                type="button"
                onClick={() => navigate(successCopy.ctaTo!)}
                className="w-full py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg hover:brightness-110 transition-all"
              >
                {successCopy.ctaLabel}
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                {resending ? 'Sending…' : 'Resend verification link'}
              </button>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Redirecting...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
    <SEO
      title="Create a Loca8tor Account — Free Signup"
      description="Sign up free for Loca8tor to generate postcodes, share locations, join as a rider, or set up a delivery business across Nigeria, UK, US, and Canada."
      path="/signup"
    />
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden lg:flex bg-card border-r border-border px-12 py-16 flex-col justify-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 max-w-[420px]">
          <Link to="/" className="inline-flex items-center gap-1.5 font-heading text-xl font-black mb-12">
            <img src={logoImg} alt="Loca8tor" className="w-8 h-8 rounded-lg object-cover" />
            LOCA<span className="text-primary">8</span>TOR
          </Link>
          <h2 className="font-heading text-[clamp(28px,3.5vw,42px)] font-extrabold leading-tight tracking-[-1px]">
            Join Loca8tor.<br /><span className="text-primary">Deliver Precisely.</span>
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed mt-4 max-w-sm">
            Whether you're a rider or a business, Loca8tor gives you the tools for smarter deliveries.
          </p>
          <div className="flex flex-col gap-2.5 mt-6">
            {[
              'Street-level location codes for 4 countries',
            'Live rider/driver tracking & fleet management',
              'Customer-facing delivery tracking link',
              'Businesses: 7-day free trial, then from ₦10,000/mo',
              'Riders / Drivers: Always free',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="text-primary font-bold">✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex items-center justify-center px-5 md:px-12 py-20">
        <div className="w-full max-w-[440px]">
          <h1 className="font-heading text-2xl font-extrabold mb-1">Create your account</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Already have one? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>

          {/* Type selector — hidden only for dedicated Refer & Earn signups so the choice is fixed to Individual */}
          {isReferralFlow ? (
            <div className="mb-7 rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm font-bold text-foreground">Earn Rewards account</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  You're signing up via a referral link. Your account will be set up to refer friends and withdraw rewards.
                </p>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-3 gap-2 mb-7">
            {[
              { type: 'individual' as const, icon: '🎁', name: 'Earn Rewards', desc: 'Refer & withdraw. Free.' },
              { type: 'rider' as const, icon: '🚴', name: 'Rider / Driver', desc: 'Deliver & earn.' },
              { type: 'business' as const, icon: '🏢', name: 'Business', desc: 'Manage your fleet.' },
            ].map(t => {
              const locked = false;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      setError(`${t.name} accounts are coming soon. Sign up as "Earn Rewards" for now.`);
                      return;
                    }
                    setError('');
                    setAccountType(t.type);
                  }}
                  aria-disabled={locked}
                  className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                    accountType === t.type
                      ? 'border-primary bg-primary/5'
                      : locked
                        ? 'border-border bg-secondary/40 opacity-60 cursor-not-allowed'
                        : 'border-border bg-secondary hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="text-2xl mb-1">{t.icon}</div>
                  <div className="font-heading text-xs font-bold">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</div>
                  {locked && (
                    <div className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-foreground/80 text-background">
                      Locked
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          )}

          <form onSubmit={handleSignup} className="space-y-3.5">
            {accountType === 'individual' && (
              <div className="mb-2">
                <GoogleSignInButton label="Sign up with Google" />
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or use email</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+234..."
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
            </div>
            {accountType === 'business' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Business Name *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="Your company name"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Lagos, Nigeria"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
              </>
            )}
            {accountType === 'rider' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  How are you registering? *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: 'individual' as const, icon: '🚴', name: 'Independent', desc: 'No company — ride solo.' },
                    { mode: 'company' as const, icon: '🏢', name: 'Joining a company', desc: 'I have a business code.' },
                  ].map(o => (
                    <button
                      key={o.mode}
                      type="button"
                      onClick={() => { setRiderMode(o.mode); setError(''); }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        riderMode === o.mode
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-secondary hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="text-xl mb-0.5">{o.icon}</div>
                      <div className="font-heading text-xs font-bold">{o.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{o.desc}</div>
                    </button>
                  ))}
                </div>
                {riderMode === 'individual' && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Independent riders get their own dashboard with a distance calculator. You can join a company later.
                  </p>
                )}
              </div>
            )}
            {accountType === 'rider' && riderMode === 'company' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Business Code *
                </label>
                <input
                  type="text"
                  value={businessCode}
                  onChange={e => setBusinessCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BIZ-ABC123"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Rider / Driver accounts require a business code from a subscribed business. Ask your business owner for theirs.
                </p>
              </div>
            )}
            {accountType === 'rider' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    I am a *
                  </label>
                  <select
                    value={workerType}
                    onChange={e => {
                      const v = e.target.value as 'rider' | 'driver';
                      setWorkerType(v);
                      if (v === 'rider') setVehicleType('bike');
                      else if (vehicleType === 'bike') setVehicleType('car');
                    }}
                    className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors"
                  >
                    <option value="rider">🚴 Rider (bike)</option>
                    <option value="driver">🚗 Driver</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Vehicle *
                  </label>
                  {workerType === 'rider' ? (
                    <div className="w-full px-3 py-2.5 bg-secondary/60 border border-border rounded-lg text-sm text-muted-foreground">
                      🚴 Bike
                    </div>
                  ) : (
                    <select
                      value={vehicleType === 'bike' ? 'car' : vehicleType}
                      onChange={e => setVehicleType(e.target.value as 'car' | 'bus' | 'truck')}
                      className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors"
                    >
                      <option value="car">🏍️ Motorcycle</option>
                      <option value="bus">🚐 Van</option>
                      <option value="truck">🚚 Truck</option>
                    </select>
                  )}
                </div>
              </div>
            )}
            {accountType === 'rider' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Home / Location Postcode *
                </label>
                <input
                  type="text"
                  value={riderPostcode}
                  onChange={e => setRiderPostcode(e.target.value.toUpperCase())}
                  placeholder="e.g. LAG 4K2"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Must be a postcode already generated on Loca8tor. Generate yours on the <Link to="/generate" className="text-primary hover:underline">Generate page</Link> first.
                </p>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-2.5 pr-12 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="h-1 bg-secondary rounded mt-1.5 overflow-hidden">
                  <div className={`h-full rounded transition-all ${strengthColor}`} style={{ width: `${strengthScore * 25}%` }} />
                </div>
              )}
            </div>

            {!pendingRefCode && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Referral Code <span className="text-muted-foreground/70 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={referralCodeInput}
                  onChange={e => setReferralCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. REF-ABC123"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Have a referral code from a business or user? Enter it here.
                  {accountType === 'business' ? (
                    <> They earn <span className="text-foreground font-semibold">₦2,000</span> after your first subscription payment (post 7-day trial).</>
                  ) : accountType === 'rider' ? (
                    <> Rider referrals do not pay a cash reward.</>
                  ) : null}
                </p>
              </div>
            )}

            {pendingRefCode && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                <p className="text-foreground">
                  Referral code applied: <span className="font-mono font-bold text-primary">{pendingRefCode}</span>
                </p>
              </div>
            )}

            {error && (
              <div className="text-destructive text-xs bg-destructive/10 rounded-lg p-3 text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {accountType === 'business'
                ? 'Create Business Account →'
                : accountType === 'rider'
                  ? 'Create Rider / Driver Account →'
                  : 'Create Account & Claim Rewards →'}
            </button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground mt-5">
            By signing up, you agree to our{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>{' '}and{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
