import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Clock, MapPin, User } from 'lucide-react';

interface DeliveryEntry {
  id: string;
  customerName: string;
  postcode: string;
  note: string;
  timestamp: string;
  status: 'delivered' | 'failed' | 'returned';
}

const STORAGE_KEY = 'loca8tor-delivery-log';

function loadDeliveries(): DeliveryEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveDeliveries(items: DeliveryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function DeliveryLog() {
  const [entries, setEntries] = useState<DeliveryEntry[]>(loadDeliveries);
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<DeliveryEntry['status']>('delivered');
  const [filter, setFilter] = useState<'all' | DeliveryEntry['status']>('all');

  useEffect(() => { saveDeliveries(entries); }, [entries]);

  const addEntry = () => {
    if (!customerName.trim() || !postcode.trim()) return;
    const entry: DeliveryEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      customerName: customerName.trim(),
      postcode: postcode.trim().toUpperCase(),
      note: note.trim(),
      timestamp: new Date().toISOString(),
      status,
    };
    setEntries(prev => [entry, ...prev]);
    setCustomerName('');
    setPostcode('');
    setNote('');
    setStatus('delivered');
    setShowForm(false);
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter);

  const todayCount = entries.filter(e => {
    const d = new Date(e.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const statusColors = {
    delivered: 'bg-green-500/10 text-green-700 dark:text-green-400',
    failed: 'bg-destructive/10 text-destructive',
    returned: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <p className="text-sm font-heading font-bold text-foreground">Delivery Log</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            Today: {todayCount}
          </span>
          <button
            onClick={() => setShowForm(!showForm)}
            className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="space-y-2 bg-secondary/40 rounded-lg p-3 animate-fade-up">
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            value={postcode}
            onChange={e => setPostcode(e.target.value.toUpperCase())}
            placeholder="Delivery postcode"
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-1.5">
            {(['delivered', 'failed', 'returned'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 text-[10px] py-1.5 rounded-md font-medium capitalize transition-colors ${
                  status === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={addEntry}
            disabled={!customerName.trim() || !postcode.trim()}
            className="w-full bg-primary text-primary-foreground text-xs font-heading font-semibold py-2 rounded-md hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            Log Delivery
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1">
        {(['all', 'delivered', 'failed', 'returned'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-medium capitalize transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No deliveries logged yet. Tap + to add one.
        </p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {filtered.map(entry => (
            <div key={entry.id} className="flex items-start gap-2.5 bg-secondary/40 rounded-lg p-2.5 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate">{entry.customerName}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize shrink-0 ${statusColors[entry.status]}`}>
                    {entry.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground font-mono">{entry.postcode}</span>
                </div>
                {entry.note && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">📝 {entry.note}</p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeEntry(entry.id)}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded transition-all shrink-0"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            Total: {entries.length} | Delivered: {entries.filter(e => e.status === 'delivered').length}
          </span>
          <button
            onClick={() => { if (confirm('Clear all delivery logs?')) setEntries([]); }}
            className="text-[10px] text-destructive hover:text-destructive/80 font-medium"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
