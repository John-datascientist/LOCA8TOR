import { X } from 'lucide-react';

interface ComingSoonOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function ComingSoonOverlay({ open, onClose }: ComingSoonOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-6 animate-slide-down">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="text-6xl mb-6">🚀</div>
      <h1 className="font-heading text-2xl md:text-3xl font-black text-center tracking-tight">
        Coming Soon!
      </h1>
      <p className="text-muted-foreground text-center text-[15px] md:text-base leading-relaxed mt-4 max-w-md">
        Use the <span className="text-primary font-bold">Generate Postcode</span>,{' '}
        <span className="text-primary font-bold">Share</span> and{' '}
        <span className="text-primary font-bold">Quiz</span> features for free.
      </p>
      <p className="text-muted-foreground text-center text-[15px] md:text-base mt-1">
        Business &amp; Rider features coming soon.
      </p>

      <button
        onClick={onClose}
        className="mt-10 inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-heading font-bold text-[15px] rounded-lg transition-all hover:brightness-110 hover:-translate-y-px glow-lime"
      >
        ← Go Back
      </button>
    </div>
  );
}
