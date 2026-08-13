import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, History as HistoryIcon, MapPin, Trash2, ExternalLink, Search, Crosshair, Lock } from 'lucide-react';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchPostcodeHistory,
  deletePostcodeHistoryEntry,
  clearPostcodeHistory,
  type PostcodeHistoryEntry,
} from '@/lib/postcodeHistory';

export default function PostcodeHistoryPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PostcodeHistoryEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'generate' | 'search'>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const signedIn = !!data.user;
      setIsAuthed(signedIn);
      setAuthChecked(true);
      if (signedIn) {
        const items = await fetchPostcodeHistory();
        if (!cancelled) setEntries(items);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    await deletePostcodeHistoryEntry(id);
  };

  const handleClearAll = async () => {
    if (!confirm('Clear your entire history? This cannot be undone.')) return;
    setEntries([]);
    await clearPostcodeHistory();
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.source === filter);

  if (!authChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-5">
        <SEO title="History — Loca8tor" description="View your generated and searched postcodes across devices." path="/history" />
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">Sign in to view history</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your generated and searched postcodes are saved to your account so you can pick up
              where you left off on any device.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/signup?redirect=/history" className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm hover:brightness-110 transition-all">
              Create free account
            </Link>
            <Link to="/login?redirect=/history" className="w-full py-2.5 bg-secondary border border-border rounded-lg font-semibold text-sm hover:border-primary/40 transition-all">
              I already have an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Postcode History — Loca8tor" description="View your generated and searched postcodes across devices." path="/history" />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HistoryIcon className="w-5 h-5 text-primary" />
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">My History</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Postcodes you've generated and searched, synced to your account.
            </p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-secondary"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </header>

        <div className="flex gap-1.5 mb-5 bg-card border border-border rounded-lg p-1 w-fit">
          {(['all', 'generate', 'search'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold capitalize transition-all
                ${filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {f === 'all' ? 'All' : f === 'generate' ? 'Generated' : 'Searched'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <HistoryIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-heading font-bold text-lg mb-1">No history yet</p>
            <p className="text-sm text-muted-foreground mb-5">
              Generate or search a postcode and it will appear here automatically.
            </p>
            <div className="flex gap-2 justify-center">
              <Link to="/generate" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold">
                <Crosshair className="w-4 h-4" /> Generate
              </Link>
              <Link to="/search" className="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary border border-border rounded-lg text-sm font-bold">
                <Search className="w-4 h-4" /> Search
              </Link>
            </div>
          </div>
        ) : (
          <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {filtered.map(item => (
              <li key={item.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors">
                <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-heading font-bold text-sm tracking-tight">{item.postcode}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide
                      ${item.source === 'generate' ? 'bg-primary/15 text-primary' : 'bg-blue-500/15 text-blue-300'}`}>
                      {item.source}
                    </span>
                  </div>
                  {item.address && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.address}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.state}{item.country && item.country !== 'Nigeria' ? ` · ${item.country}` : item.state ? ' State' : ''}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span className="font-mono tabular-nums">{item.lat.toFixed(4)}°, {item.lng.toFixed(4)}°</span>
                    <a
                      href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 inline-flex items-center gap-1"
                    >
                      Map <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="ml-auto">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded transition-colors"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
