import { useState, useRef, useCallback } from 'react';
import { Search, Loader2, X } from 'lucide-react';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationSearchProps {
  onSelect: (lat: number, lng: number) => void;
}

export default function LocationSearch({ onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`
      );
      const data: SearchResult[] = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.display_name.split(',')[0]);
    setIsOpen(false);
    setResults([]);
    onSelect(parseFloat(result.lat), parseFloat(result.lon));
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-card rounded-lg ring-1 ring-border shadow-sm focus-within:ring-2 focus-within:ring-primary transition-shadow">
        <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder='Type your current address or use the "Use My Location" button'
          className="w-full bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none font-body"
        />
        {isSearching && <Loader2 className="w-4 h-4 text-muted-foreground mr-3 animate-spin shrink-0" />}
        {query && !isSearching && (
          <button onClick={handleClear} className="mr-3 p-0.5 rounded hover:bg-secondary transition-colors active:scale-95">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-card rounded-lg ring-1 ring-border shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors active:scale-[0.99] border-b border-border last:border-0"
              >
                <span className="font-medium text-foreground">{r.display_name.split(',')[0]}</span>
                <span className="text-muted-foreground text-xs block mt-0.5 truncate">
                  {r.display_name.split(',').slice(1).filter(p => !p.trim().toLowerCase().includes('nipost')).join(',').trim()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
