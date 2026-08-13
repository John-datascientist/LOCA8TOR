import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Crosshair, Search, Package, Bike, Brain, MapPin, Users, Send, Navigation, Bell } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';

const TOUR_STORAGE_KEY = 'loca8tor_tour_seen';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  audience: 'all' | 'rider' | 'business';
}

const steps: TourStep[] = [
  {
    title: 'Welcome to Loca8tor!',
    description: 'Loca8tor helps you generate postcodes, search locations, track deliveries, and manage rider fleets — all in one app. Let\'s walk you through the key features.',
    icon: <MapPin className="w-6 h-6" />,
    audience: 'all',
  },
  {
    title: 'Generate Postcodes',
    description: 'Tap "Use My Location" or search any address to instantly generate a unique postcode. Share it with anyone so they can find you easily.',
    icon: <Crosshair className="w-6 h-6" />,
    audience: 'all',
  },
  {
    title: 'Search Postcodes',
    description: 'Enter any postcode in the Search tab to find the exact location, see it on the map, and even view nearby riders in real-time.',
    icon: <Search className="w-6 h-6" />,
    audience: 'all',
  },
  {
    title: 'Track Deliveries',
    description: 'Customers can track their packages live using a tracking code — no registration needed. Just enter the code in the Track tab.',
    icon: <Package className="w-6 h-6" />,
    audience: 'all',
  },
  {
    title: 'For Riders: Join a Business',
    description: 'Sign up as an Individual Rider, then search for a business using their code or phone number to send a join request. Once accepted, you\'ll see deliveries assigned to you.',
    icon: <Bike className="w-6 h-6" />,
    audience: 'rider',
  },
  {
    title: 'For Riders: Manage Deliveries',
    description: 'When a business assigns a delivery, you\'ll see it in your Active Deliveries panel. Accept it, pick up the package, then mark it as delivered — all from your dashboard.',
    icon: <Bell className="w-6 h-6" />,
    audience: 'rider',
  },
  {
    title: 'For Riders: Messages & Navigation',
    description: 'Receive messages from your company, reply directly, and use the built-in navigation map to reach your destination without leaving the app.',
    icon: <Navigation className="w-6 h-6" />,
    audience: 'rider',
  },
  {
    title: 'For Business: Manage Your Fleet',
    description: 'Register as a Business account and share your business code with riders. Accept join requests, then assign deliveries, send messages, and track riders live from your dashboard.',
    icon: <Users className="w-6 h-6" />,
    audience: 'business',
  },
  {
    title: 'For Business: Book & Track Deliveries',
    description: 'Log a delivery for any rider — a tracking code is auto-generated. Share it with your customer via WhatsApp or copy the link. See rider locations and in-transit status on the Map tab.',
    icon: <Send className="w-6 h-6" />,
    audience: 'business',
  },
  {
    title: 'Test Your Knowledge!',
    description: 'Try the Quiz tab to test your knowledge of Nigerian roads, traffic rules, and locations. Compete on the leaderboard!',
    icon: <Brain className="w-6 h-6" />,
    audience: 'all',
  },
];

export default function AppTour() {
  const { ready, showNgFeatures } = useUserAccess();
  const [visible, setVisible] = useState(() => {
    return !localStorage.getItem(TOUR_STORAGE_KEY);
  });
  const [step, setStep] = useState(0);

  if (!visible) return null;
  // Wait for country detection so we don't briefly flash the tour to non-NG users.
  if (!ready) return null;
  // Tour content is Nigeria-focused (rider/business onboarding) — hide for
  // international visitors. Super admins & preview always see it.
  if (!showNgFeatures) return null;

  const current = steps[step];

  const dismiss = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setVisible(false);
  };

  const audienceColor = current.audience === 'rider'
    ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400'
    : current.audience === 'business'
      ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400'
      : 'text-primary bg-primary/10';

  const audienceLabel = current.audience === 'rider' ? '🏍️ For Riders'
    : current.audience === 'business' ? '🏢 For Business' : '👋 Everyone';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl ring-1 ring-border shadow-2xl max-w-md w-full overflow-hidden animate-fade-up">
        {/* Progress bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-6 space-y-4">
          {/* Audience badge */}
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${audienceColor}`}>
              {audienceLabel}
            </span>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Icon */}
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${audienceColor}`}>
            {current.icon}
          </div>

          {/* Content */}
          <div>
            <h2 className="font-heading font-bold text-lg text-foreground">{current.title}</h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{current.description}</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-primary w-5' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            <div className="flex-1" />
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1 bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={dismiss}
                className="bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Get Started! 🚀
              </button>
            )}
          </div>

          {step < steps.length - 1 && (
            <button onClick={dismiss} className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Button to re-open the tour from settings/help */
export function TourTrigger() {
  const reopen = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    window.location.reload();
  };

  return (
    <button
      onClick={reopen}
      className="text-[10px] text-primary font-medium hover:underline flex items-center gap-1"
    >
      <MapPin className="w-3 h-3" /> Take a tour
    </button>
  );
}
