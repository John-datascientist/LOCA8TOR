import { History, X, MapPin, Trash2, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { PostcodeResult } from '@/lib/postcodeGenerator';

interface PostcodeHistoryProps {
  items: PostcodeResult[];
  onSelect: (item: PostcodeResult) => void;
  onClear: () => void;
}

export default function PostcodeHistory({ items, onSelect, onClear }: PostcodeHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 bg-card text-foreground font-heading font-semibold text-sm px-4 py-3 rounded-lg shadow-lg ring-1 ring-border hover:shadow-xl transition-all duration-200 active:scale-[0.97]"
      >
        <History className="w-4 h-4 text-primary" />
        <span>{items.length}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-card w-full max-w-md max-h-[70vh] rounded-t-xl sm:rounded-xl shadow-2xl ring-1 ring-border flex flex-col opacity-0 animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-heading font-bold text-base tracking-tight">History</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClear}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors active:scale-95"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-secondary transition-colors active:scale-95"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <ul className="overflow-y-auto flex-1 divide-y divide-border">
              {items.map((item, i) => (
                <li key={i}>
                  <button
                    onClick={() => { onSelect(item); setIsOpen(false); }}
                    className="w-full text-left px-5 py-3.5 hover:bg-secondary transition-colors active:scale-[0.99] flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-sm tracking-tight">{item.postcode}</p>
                      {item.address && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.address}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">{item.state}{item.country && item.country !== 'Nigeria' ? ` · ${item.country}` : ' State'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground font-mono tabular-nums">
                          {item.lat.toFixed(4)}°N, {item.lng.toFixed(4)}°E
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
