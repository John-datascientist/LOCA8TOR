import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import Navbar from "@/components/Navbar";
import GeoBlocker from "@/components/GeoBlocker";
import BanGate from "@/components/BanGate";
import LandingPage from "./pages/LandingPage";
import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import GoogleAccountTypeModal from "@/components/GoogleAccountTypeModal";
const Index = lazy(() => import("./pages/Index"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LiveMap = lazy(() => import("./pages/LiveMap"));
const Admin = lazy(() => import("./pages/Admin"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Legal = lazy(() => import("./pages/Legal"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const RiderApp = lazy(() => import("./pages/RiderApp"));
const BusinessPage = lazy(() => import("./pages/BusinessPage"));
const TrackDelivery = lazy(() => import("./pages/TrackDelivery"));
const Pricing = lazy(() => import("./pages/Pricing"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const ApiProduct = lazy(() => import("./pages/ApiProduct"));
const Refer = lazy(() => import("./pages/Refer"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const PostcodeHistoryPage = lazy(() => import("./pages/PostcodeHistoryPage"));
const Billing = lazy(() => import("./pages/Billing"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const Wallet = lazy(() => import("./pages/Wallet"));
const OnboardingBilling = lazy(() => import("./pages/OnboardingBilling"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
import { capturePendingReferral, tryClaimReferral } from "@/lib/deviceReferral";
import RequireAuthForNonNG from "@/components/RequireAuthForNonNG";
import RedirectIfAuthed from "@/components/RedirectIfAuthed";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_SIGNIN_PENDING_KEY } from "@/integrations/auth/social";
import { toast } from "@/hooks/use-toast";
import { ensureRiderProfileFromMetadata } from "@/lib/authProfile";

const queryClient = new QueryClient();

function ReferralBootstrap() {
  useEffect(() => {
    capturePendingReferral();
    // Try to credit the referrer as soon as the referred device lands on the site.
    // The postcode-generation flow also calls this as a backup trigger.
    tryClaimReferral();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setTimeout(() => { void tryClaimReferral(); }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}

// Business accounts must use email+password (CAC number, business name etc.
// don't fit an OAuth redirect) — same for anyone whose account is ALREADY an
// established rider/driver signing in via Google, to keep that identity
// consistent with however it was originally created. supabase.auth.signInWithOAuth
// always does a full-page redirect, so this can't be checked synchronously in
// the click handler — it's enforced here, on the SIGNED_IN event fired once
// the browser lands back with a session, scoped to Google-initiated signins
// via GOOGLE_SIGNIN_PENDING_KEY so normal email/password logins are untouched.
//
// A brand-new Google sign-up (no rider row yet) gets a default 'individual'
// (Earn Rewards) profile via ensureRiderProfileFromMetadata, then
// onNewGoogleSignup fires so App can offer them the Rider/Driver choice —
// Google's redirect flow has no step where they could pick that up front.
function GoogleAccountRuleEnforcer({ onNewGoogleSignup }: { onNewGoogleSignup: (userId: string) => void }) {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN') return;
      if (sessionStorage.getItem(GOOGLE_SIGNIN_PENDING_KEY) !== '1') return;
      sessionStorage.removeItem(GOOGLE_SIGNIN_PENDING_KEY);
      const user = session?.user;
      if (!user?.id) return;
      supabase
        .from('riders')
        .select('account_type, worker_type')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(async ({ data: rider }) => {
          const isBusiness = rider?.account_type === 'business';
          const isExistingRider = rider?.account_type === 'rider' || rider?.worker_type === 'rider' || rider?.worker_type === 'driver';
          if (isBusiness || isExistingRider) {
            await supabase.auth.signOut();
            toast({
              title: 'Google sign-in not available',
              description: `${isBusiness ? 'Business' : 'Rider/driver'} accounts must sign in with email and password.`,
              variant: 'destructive',
            });
            return;
          }
          if (!rider) {
            await ensureRiderProfileFromMetadata(user);
            onNewGoogleSignup(user.id);
          }
        });
    });
    return () => subscription.unsubscribe();
  }, [onNewGoogleSignup]);
  return null;
}

// Offers a brand-new Google sign-up the choice between Earn Rewards
// (already the default) and Rider/Driver. Riders chosen this way start as
// independent/solo (rider_mode='individual') since there's no signup-form
// step to collect a business code during an OAuth redirect — they can link
// to a business later from their dashboard, same as any other solo rider.
function GoogleAccountTypePrompt() {
  const [newSignupUserId, setNewSignupUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChooseRider = async (userId: string) => {
    await supabase
      .from('riders')
      .update({ account_type: 'rider', worker_type: 'rider', vehicle_type: 'bike', rider_mode: 'individual' } as any)
      .eq('user_id', userId);
    setNewSignupUserId(null);
    navigate('/rider');
  };

  return (
    <>
      <GoogleAccountRuleEnforcer onNewGoogleSignup={setNewSignupUserId} />
      {newSignupUserId && (
        <GoogleAccountTypeModal
          onChooseIndividual={() => setNewSignupUserId(null)}
          onChooseRider={() => handleChooseRider(newSignupUserId)}
        />
      )}
    </>
  );
}

const App = () => (
  <HelmetProvider>
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GeoBlocker>
        <BrowserRouter>
          <ReferralBootstrap />
          <GoogleAccountTypePrompt />
          <BanGate>
          <Navbar />
          <div className="pt-16">
            <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/generate" element={<RequireAuthForNonNG><Index /></RequireAuthForNonNG>} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/quiz" element={<RequireAuthForNonNG requireVerified><Index /></RequireAuthForNonNG>} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/map" element={<LiveMap />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/terms" element={<Legal />} />
              <Route path="/privacy" element={<Legal />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
              <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/rider" element={<RequireAuthForNonNG requireVerified><RiderApp /></RequireAuthForNonNG>} />
              <Route path="/business" element={<RequireAuthForNonNG requireVerified requireRoles={['business']} requirePaid><BusinessPage /></RequireAuthForNonNG>} />
              <Route path="/onboarding/billing" element={<RequireAuthForNonNG requireVerified allowPaused><OnboardingBilling /></RequireAuthForNonNG>} />
              <Route path="/track" element={<TrackDelivery />} />
              <Route path="/track/:code" element={<TrackDelivery />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/api" element={<ApiProduct />} />
              <Route path="/billing" element={<RequireAuthForNonNG requireVerified allowPaused><Billing /></RequireAuthForNonNG>} />
              <Route path="/api-keys" element={<RequireAuthForNonNG requireVerified allowPaused><ApiKeys /></RequireAuthForNonNG>} />
              <Route path="/wallet" element={<RequireAuthForNonNG requireVerified allowPaused><Wallet /></RequireAuthForNonNG>} />
              <Route path="/refer" element={<Refer />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/history" element={<RequireAuthForNonNG><PostcodeHistoryPage /></RequireAuthForNonNG>} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </div>
          </BanGate>
        </BrowserRouter>
      </GeoBlocker>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </HelmetProvider>
);

export default App;
