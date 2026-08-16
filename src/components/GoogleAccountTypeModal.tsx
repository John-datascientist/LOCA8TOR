import { Bike, Gift, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function GoogleAccountTypeModal({
  onChooseIndividual,
  onChooseRider,
}: {
  onChooseIndividual: () => void;
  onChooseRider: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);

  const chooseRider = async () => {
    setBusy(true);
    await onChooseRider();
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
      <div className="bg-card ring-1 ring-border rounded-xl w-full max-w-sm p-6 space-y-4 text-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Welcome to Loca8tor!</h2>
          <p className="text-sm text-muted-foreground mt-1">How do you want to use your account?</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={onChooseIndividual}
            disabled={busy}
            className="flex items-center gap-3 p-4 rounded-lg ring-1 ring-border hover:ring-primary/60 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
          >
            <Gift className="w-6 h-6 text-primary shrink-0" />
            <div>
              <p className="font-heading font-bold text-sm text-foreground">Earn Rewards</p>
              <p className="text-xs text-muted-foreground">Generate postcodes, play the quiz, earn rewards.</p>
            </div>
          </button>

          <button
            onClick={chooseRider}
            disabled={busy}
            className="flex items-center gap-3 p-4 rounded-lg ring-1 ring-border hover:ring-primary/60 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-6 h-6 text-primary shrink-0 animate-spin" /> : <Bike className="w-6 h-6 text-primary shrink-0" />}
            <div>
              <p className="font-heading font-bold text-sm text-foreground">Rider / Driver</p>
              <p className="text-xs text-muted-foreground">Deliver, track routes, and get paid.</p>
            </div>
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">You can change this later from your account settings.</p>
      </div>
    </div>
  );
}
