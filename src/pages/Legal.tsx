import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SEO from '@/components/SEO';
import { ArrowLeft } from 'lucide-react';
import logoImg from '@/assets/loca8tor-logo-green.png';
import Terms from './Terms';
import Privacy from './Privacy';

export default function Legal() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms & Privacy — Loca8tor"
        description="Loca8tor's combined Terms & Conditions and Privacy Policy: how the service works, what data we collect, and how it is protected."
        path="/legal"
      />
      <div className="max-w-3xl mx-auto px-5 pt-12 pb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <img src={logoImg} alt="Loca8tor" className="w-10 h-10 rounded-lg object-cover" />
          <h1 className="font-heading text-3xl font-extrabold">Legal</h1>
        </div>

        <nav className="flex flex-wrap gap-3 mb-2 text-sm">
          <a href="#terms" className="px-3 py-1.5 rounded-md border border-border hover:border-primary/40 hover:text-primary transition-colors">Terms & Conditions</a>
          <a href="#privacy" className="px-3 py-1.5 rounded-md border border-border hover:border-primary/40 hover:text-primary transition-colors">Privacy Policy</a>
        </nav>
      </div>

      <section id="terms" className="scroll-mt-20">
        <Terms embedded />
      </section>

      <div className="max-w-3xl mx-auto px-5">
        <hr className="border-border my-8" />
      </div>

      <section id="privacy" className="scroll-mt-20">
        <Privacy embedded />
      </section>
    </div>
  );
}
