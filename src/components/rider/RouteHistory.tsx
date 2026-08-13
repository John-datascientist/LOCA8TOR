import { useState, useMemo } from 'react';
import { Route, MapPin, Calendar, Trash2 } from 'lucide-react';

const ROUTE_KEY = 'loca8tor-route-history';

export interface RouteEntry {
  id: string;
  from: string;
  to: string;
  fromPostcode?: string;
  toPostcode?: string;
  date: string;
  distance?: string;
}

function loadRoutes(): RouteEntry[] {
  try { return JSON.parse(localStorage.getItem(ROUTE_KEY) || '[]'); }
  catch { return []; }
}
function saveRoutes(r: RouteEntry[]) { localStorage.setItem(ROUTE_KEY, JSON.stringify(r)); }

export default function RouteHistory() {
  const [routes, setRoutes] = useState<RouteEntry[]>(loadRoutes);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ from: '', to: '', fromPostcode: '', toPostcode: '', distance: '' });

  const addRoute = () => {
    if (!form.from || !form.to) return;
    const entry: RouteEntry = {
      id: Date.now().toString(),
      from: form.from,
      to: form.to,
      fromPostcode: form.fromPostcode || undefined,
      toPostcode: form.toPostcode || undefined,
      distance: form.distance || undefined,
      date: new Date().toISOString(),
    };
    const updated = [entry, ...routes].slice(0, 50);
    setRoutes(updated);
    saveRoutes(updated);
    setForm({ from: '', to: '', fromPostcode: '', toPostcode: '', distance: '' });
    setShowAdd(false);
  };

  const deleteRoute = (id: string) => {
    const updated = routes.filter(r => r.id !== id);
    setRoutes(updated);
    saveRoutes(updated);
  };

  const groupedByDate = useMemo(() => {
    const groups: Record<string, RouteEntry[]> = {};
    routes.forEach(r => {
      const day = r.date.split('T')[0];
      if (!groups[day]) groups[day] = [];
      groups[day].push(r);
    });
    return groups;
  }, [routes]);

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <Route className="w-4 h-4 text-primary" /> Route History
        </p>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-primary font-medium">
          {showAdd ? 'Cancel' : '+ Log Route'}
        </button>
      </div>

      {showAdd && (
        <div className="space-y-2 bg-secondary/40 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value }))}
              placeholder="From (location)" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <input value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))}
              placeholder="To (location)" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={form.fromPostcode} onChange={e => setForm(p => ({ ...p, fromPostcode: e.target.value }))}
              placeholder="From postcode" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <input value={form.toPostcode} onChange={e => setForm(p => ({ ...p, toPostcode: e.target.value }))}
              placeholder="To postcode" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <input value={form.distance} onChange={e => setForm(p => ({ ...p, distance: e.target.value }))}
              placeholder="Distance (km)" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
          </div>
          <button onClick={addRoute} className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg">
            Save Route
          </button>
        </div>
      )}

      {routes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No routes logged yet</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {Object.entries(groupedByDate).slice(0, 7).map(([day, dayRoutes]) => (
            <div key={day}>
              <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" /> {new Date(day).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                <span className="ml-auto">{dayRoutes.length} trips</span>
              </p>
              {dayRoutes.map(r => (
                <div key={r.id} className="flex items-start gap-2 bg-secondary/20 rounded px-3 py-1.5 mb-1">
                  <MapPin className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{r.from} → {r.to}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {r.fromPostcode && `${r.fromPostcode} → `}{r.toPostcode || ''}
                      {r.distance && ` · ${r.distance}km`}
                    </p>
                  </div>
                  <button onClick={() => deleteRoute(r.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
