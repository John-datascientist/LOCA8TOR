import { useState, useEffect } from 'react';
import { Star, StarOff, MapPin, Copy, Check, ExternalLink } from 'lucide-react';
import type { PostcodeResult } from '@/lib/postcodeGenerator';

const FAVORITES_KEY = 'loca8tor-favorites';

function loadFavorites(): PostcodeResult[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
}
function saveFavorites(items: PostcodeResult[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items.slice(0, 20)));
}

interface SavedLocationsProps {
  currentResult?: PostcodeResult | null;
  onSelect: (item: PostcodeResult) => void;
}

export default function SavedLocations({ currentResult, onSelect }: SavedLocationsProps) {
  const [favorites, setFavorites] = useState<PostcodeResult[]>(loadFavorites);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isFavorite = currentResult ? favorites.some(f => f.postcode === currentResult.postcode) : false;

  const toggleFavorite = () => {
    if (!currentResult) return;
    setFavorites(prev => {
      const exists = prev.some(f => f.postcode === currentResult.postcode);
      const next = exists
        ? prev.filter(f => f.postcode !== currentResult.postcode)
        : [currentResult, ...prev].slice(0, 20);
      saveFavorites(next);
      return next;
    });
  };

  const handleCopy = async (postcode: string) => {
    await navigator.clipboard.writeText(postcode);
    setCopiedId(postcode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-3">
      {currentResult && (
        <button
          onClick={toggleFavorite}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-heading font-semibold ring-1 transition-all active:scale-[0.97] ${
            isFavorite
              ? 'bg-primary/10 text-primary ring-primary/30'
              : 'bg-card text-foreground ring-border hover:ring-primary/40'
          }`}
        >
          {isFavorite ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
          {isFavorite ? 'Remove from Favorites' : 'Save to Favorites'}
        </button>
      )}

      {favorites.length > 0 && (
        <div className="bg-card rounded-lg ring-1 ring-border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Star className="w-3 h-3 text-primary" /> Saved Locations ({favorites.length})
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {favorites.map((fav, i) => (
              <div key={`${fav.postcode}-${i}`} className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 hover:bg-secondary transition-colors">
                <button
                  onClick={() => onSelect(fav)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="font-heading font-bold text-xs text-foreground truncate">{fav.postcode}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {fav.lga ? `${fav.lga}, ` : ''}{fav.state}
                  </p>
                </button>
                <button
                  onClick={() => handleCopy(fav.postcode)}
                  className="p-1 rounded hover:bg-secondary"
                >
                  {copiedId === fav.postcode
                    ? <Check className="w-3 h-3 text-primary" />
                    : <Copy className="w-3 h-3 text-muted-foreground" />
                  }
                </button>
                <a
                  href={`https://www.google.com/maps?q=${fav.lat},${fav.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-secondary"
                >
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
