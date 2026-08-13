import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import SEO from '@/components/SEO';
import { useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';

function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isInStandaloneMode = typeof window !== 'undefined' && (
    window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
  );

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    const timer = setTimeout(() => {
      setShowManual(prev => !deferredPrompt ? true : prev);
    }, 3000);
    return () => { window.removeEventListener('beforeinstallprompt', handler); clearTimeout(timer); };
  }, []);

  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    } else if (isInIframe) {
      // Open in standalone browser where install prompt can fire
      window.open(window.location.href, '_blank');
    } else {
      setShowManual(true);
    }
  };

  if (installed || isInStandaloneMode) return null;

  // Show on both desktop and mobile so Android users can install too.
  return (
    <div className="flex flex-col items-center gap-1.5 pb-2">
      <button onClick={isIOS ? () => setShowManual(true) : handleInstall}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-heading font-bold text-sm px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer">
        <Download className="w-4 h-4" /> {isIOS ? 'Install Loca8tor on iPhone (Free)' : 'Download Loca8tor for Windows / Android (Free)'}
      </button>
      {isIOS && showManual && (
        <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground max-w-sm text-center space-y-1">
          <p className="font-semibold text-foreground">Install on iPhone / iPad:</p>
          <p>1. Open this site in <strong>Safari</strong> (not Chrome or in-app browsers).</p>
          <p>2. Tap the <strong>Share</strong> icon <span aria-hidden>⬆️</span> at the bottom of Safari.</p>
          <p>3. Scroll and tap <strong>"Add to Home Screen"</strong>, then tap <strong>Add</strong>.</p>
          <p className="pt-1 opacity-80">Apple doesn't allow one-tap install on iPhone — this is the official way.</p>
        </div>
      )}
      {!isIOS && showManual && !deferredPrompt && (
        <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground max-w-sm text-center space-y-1">
          <p className="font-semibold text-foreground">How to install:</p>
          <p><strong>Windows (Chrome/Edge):</strong> Click the install icon (⊕) in the address bar, or open Menu → "Install Loca8tor".</p>
          <p><strong>Android (Chrome):</strong> Tap the ⋮ menu → "Install app" or "Add to Home screen".</p>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">Works on Windows, Mac, Android & iPhone</p>
    </div>
  );
}
import { Navigation, Loader2, Share2 } from 'lucide-react';
import AppTour, { TourTrigger } from '@/components/AppTour';
import MapView from '@/components/MapView';
import { Progress } from '@/components/ui/progress';
import PostcodeCard from '@/components/PostcodeCard';
import SavedLocations from '@/components/SavedLocations';
import LocationSearch from '@/components/LocationSearch';
import PostcodeHistory from '@/components/PostcodeHistory';
const LocationQuiz = lazy(() => import('@/components/LocationQuiz'));
import PostcodeSearchPanel from '@/components/PostcodeSearchPanel';
import { generatePostcode, generatePostcodeWithAddress, type PostcodeResult } from '@/lib/postcodeGenerator';
import { addPostcodeToDB } from '@/lib/postcodeDatabase';
import { tryClaimReferral } from '@/lib/deviceReferral';
import { savePostcodeHistory } from '@/lib/postcodeHistory';
import LocationDiagnostic from '@/components/LocationDiagnostic';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';

const STORAGE_KEY = '9ja-postcode-history';

function loadHistory(): PostcodeResult[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(items: PostcodeResult[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

const NIGERIA_CENTER: [number, number] = [9.082, 8.6753];

export default function Index() {
  const routeLocation = useLocation();
  const [position, setPosition] = useState<[number, number]>(NIGERIA_CENTER);
  const [result, setResult] = useState<PostcodeResult | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locatingProgress, setLocatingProgress] = useState(0);
  const [locatingMessage, setLocatingMessage] = useState('');
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PostcodeResult[]>(loadHistory);

  // Derive active tab from route
  const activeTab = routeLocation.pathname === '/quiz' ? 'quiz' : 'postcode' as 'postcode' | 'quiz';

  const addToHistory = useCallback((item: PostcodeResult) => {
    setHistory((prev) => {
      const next = [item, ...prev.filter((p) => p.postcode !== item.postcode)].slice(0, 50);
      saveHistory(next);
      return next;
    });
    // Best-effort cross-device sync for signed-in users (no-op when guest).
    void savePostcodeHistory(item, 'generate');
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    const quickPc = generatePostcode(lat, lng);
    setResult(quickPc);
    const fullPc = await generatePostcodeWithAddress(lat, lng);
    setResult(fullPc);
    addToHistory(fullPc);
    addPostcodeToDB(fullPc);
    tryClaimReferral();
    setError(null);
  }, [addToHistory]);

  const stopProgress = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setLocatingProgress(0);
    setLocatingMessage('');
  }, []);

  const startProgress = useCallback(() => {
    setLocatingProgress(0);
    setLocatingMessage('Searching for GPS signal…');
    let tick = 0;
    progressTimer.current = setInterval(() => {
      tick++;
      if (tick < 8) {
        setLocatingProgress(Math.min(tick * 10, 70));
        setLocatingMessage('Searching for GPS signal…');
      } else if (tick < 15) {
        setLocatingProgress(Math.min(70 + (tick - 8) * 3, 85));
        setLocatingMessage('Trying network location…');
      } else {
        setLocatingProgress(Math.min(85 + (tick - 15), 95));
        setLocatingMessage('Almost there…');
      }
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Detect in-app browsers (Facebook, Instagram, TikTok, etc.) — we still
    // attempt the prompt directly; only show fallback guidance if it fails.
    const ua = navigator.userAgent || '';
    const isInAppBrowser = /(FBAN|FBAV|Instagram|Line|TikTok|Snapchat|Twitter|Pinterest|MicroMessenger)/i.test(ua);

    setIsLocating(true);
    setError(null);
    startProgress();

    // Laptops/desktops usually rely on Wi-Fi geolocation and report much lower
    // accuracy than a phone GPS. If we insist on ≤60 m the retry loop never
    // resolves and no postcode is generated. Use a looser threshold on desktop.
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    const MAX_ACCURACY_M = isMobileDevice ? 60 : 300;
    let sharpenAttempts = 0;
    const onSuccess = async (pos: GeolocationPosition) => {
      const acc = pos.coords.accuracy ?? 9999;
      if (acc > MAX_ACCURACY_M && sharpenAttempts < 3) {
        sharpenAttempts++;
        setLocatingMessage(`GPS accuracy ${Math.round(acc)} m — waiting for a sharper fix…`);
        setLocatingProgress(75);
        // Force a fresh, high-accuracy reading (no cached position)
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(onSuccess, () => onSuccess(pos), {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
          });
        }, 1200);
        return;
      }
      setLocatingMessage('Generating postcode…');
      setLocatingProgress(90);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setPosition([lat, lng]);
      const quickPc = generatePostcode(lat, lng);
      setResult(quickPc);
      setLocatingProgress(95);
      const fullPc = await generatePostcodeWithAddress(lat, lng);
      setResult(fullPc);
      addToHistory(fullPc);
      addPostcodeToDB(fullPc);
      tryClaimReferral();
      setLocatingProgress(100);
      setTimeout(() => {
        setIsLocating(false);
        stopProgress();
      }, 400);
    };

    let attempts = 0;
    const tryGetPosition = (highAccuracy: boolean, timeout: number) => {
      attempts++;
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (err) => {
          if (highAccuracy) {
            setLocatingMessage('Trying network location…');
            setLocatingProgress(70);
            tryGetPosition(false, 30000);
            return;
          }
          // On some phones, first attempt fails even when location is on - retry once more
          if (attempts <= 3) {
            setLocatingMessage('Retrying GPS…');
            setLocatingProgress(60);
            setTimeout(() => tryGetPosition(false, 20000), 1500);
            return;
          }
          setIsLocating(false);
          stopProgress();
          switch (err.code) {
            case err.PERMISSION_DENIED:
              if (isInAppBrowser) {
                setError('Location access was blocked by this in-app browser.\n\nTap the menu (⋮ or •••) at the top and choose "Open in Chrome" or "Open in Safari", then tap "Use My Location" again.');
              } else {
                setError('Location access is blocked. Please enable it:\n• iPhone: Settings → Privacy → Location Services → Safari → Allow\n• Android: Settings → Apps → Browser → Permissions → Location → Allow\n• Browser: Tap the lock icon in the address bar → Allow location\n\nThen tap "Use My Location" again.');
              }
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Could not detect your location. Please:\n1. Make sure GPS/Location is turned ON\n2. Go outside or near a window for better signal\n3. Try again');
              break;
            case err.TIMEOUT:
              setError('Location request timed out. Tips:\n• Turn GPS off and back on\n• Make sure you have internet connection\n• Move to an open area and try again');
              break;
            default:
              setError('Could not get your location. Please try again.');
          }
        },
        { enableHighAccuracy: highAccuracy, timeout, maximumAge: 120000 }
      );
    };

    tryGetPosition(true, 20000);
  }, [addToHistory, startProgress, stopProgress]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Generate Postcode — Loca8tor" description="Generate a unique postcode for any GPS location in Nigeria, UK, USA, or Canada. Instant, accurate, and shareable." path="/generate" />
      <AppTour />

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
        <EmailVerificationBanner />
        {activeTab === 'postcode' && (
          <>
            <LocationSearch onSelect={handleMapClick} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <PostcodeCard result={result} isLoading={isLocating} />
              </div>

              <div className="flex flex-col gap-3 justify-start">
                <button
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="group flex items-center justify-center gap-2.5 bg-primary text-primary-foreground font-heading font-semibold text-sm px-6 py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed glow-lime"
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                  )}
                  {isLocating ? 'Locating…' : 'Use My Location'}
                </button>

                {result && (
                  <>
                    <button
                      onClick={async () => {
                        // Share postcode only — searchable on Loca8tor. No Google Maps link.
                        const url = `${window.location.origin}/search?q=${encodeURIComponent(result.postcode)}`;
                        const text = `📍 Loca8tor Postcode: ${result.postcode}\nSearch it on Loca8tor: ${url}`;
                        if (navigator.share) {
                          try { await navigator.share({ title: `Postcode: ${result.postcode}`, text }); } catch {}
                        } else {
                          await navigator.clipboard.writeText(text);
                        }
                      }}
                      className="group flex items-center justify-center gap-2.5 bg-card text-foreground font-heading font-semibold text-sm px-6 py-3.5 rounded-lg shadow-md ring-1 ring-border hover:shadow-lg hover:ring-primary/40 transition-all duration-200 active:scale-[0.97]"
                    >
                      <Share2 className="w-4 h-4 text-primary" />
                      Share Postcode
                    </button>
                  </>
                )}

                <SavedLocations
                  currentResult={result}
                  onSelect={(item) => { setPosition([item.lat, item.lng]); setResult(item); }}
                />

                {isLocating && (
                  <div className="flex flex-col gap-1.5 animate-fade-up">
                    <Progress value={locatingProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">{locatingMessage}</p>
                  </div>
                )}

                {error && (
                  <div className="text-destructive text-xs text-center font-medium animate-fade-up whitespace-pre-line bg-destructive/10 rounded-lg p-3">
                    {error}
                  </div>
                )}

                {!isLocating && !result && (
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    Tap the map or use your GPS to generate a postcode
                  </p>
                )}
              </div>
            </div>

            <LocationDiagnostic
              currentPin={position}
              currentPostcode={result?.postcode || null}
              onApplyLocation={(lat, lng) => handleMapClick(lat, lng)}
            />

          </>
        )}
        {activeTab === 'quiz' && (
          <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
            <LocationQuiz onSaveToHistory={addToHistory} />
          </Suspense>
        )}
      </main>

      <footer className="border-t border-border py-4 space-y-2">
        <InstallButton />
        <p className="text-center text-xs text-muted-foreground">
          Postcodes are generated using global postcode standards mapped to geographic locations
        </p>
        <p className="text-center text-[10px] text-muted-foreground">
          © {new Date().getFullYear()} Loca8tor is registered under Workerholics Solutions Ltd, United Kingdom.
        </p>
        <p className="text-center text-[10px] text-muted-foreground">
          <a href="/contact" className="text-primary hover:underline">Contact Us</a>
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <a
            href="https://www.instagram.com/loca8tor/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><path d="M18 6h.01"/></svg>
          </a>
          <a
            href="https://www.facebook.com/share/18G2Jr5ky7/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
        </div>
        <div className="flex justify-center pt-1">
          <TourTrigger />
        </div>
      </footer>

      <PostcodeHistory
        items={history}
        onSelect={(item) => {
          setPosition([item.lat, item.lng]);
          setResult(item);
        }}
        onClear={() => {
          setHistory([]);
          localStorage.removeItem(STORAGE_KEY);
        }}
      />
    </div>
  );
}
