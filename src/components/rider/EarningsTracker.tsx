import { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const EARNINGS_KEY = 'loca8tor-rider-earnings';

interface Earning {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'delivery' | 'tip' | 'bonus';
}

function loadEarnings(): Earning[] {
  try { return JSON.parse(localStorage.getItem(EARNINGS_KEY) || '[]'); }
  catch { return []; }
}
function saveEarnings(e: Earning[]) { localStorage.setItem(EARNINGS_KEY, JSON.stringify(e)); }

export default function EarningsTracker() {
  const [earnings, setEarnings] = useState<Earning[]>(loadEarnings);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<Earning['type']>('delivery');

  const today = new Date().toISOString().split('T')[0];
  const todayEarnings = useMemo(() => earnings.filter(e => e.date.startsWith(today)).reduce((s, e) => s + e.amount, 0), [earnings, today]);
  const weekStart = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);
  const weekEarnings = useMemo(() => earnings.filter(e => e.date >= weekStart).reduce((s, e) => s + e.amount, 0), [earnings, weekStart]);
  const totalEarnings = useMemo(() => earnings.reduce((s, e) => s + e.amount, 0), [earnings]);

  const addEarning = () => {
    if (!amount || isNaN(Number(amount))) return;
    const entry: Earning = {
      id: Date.now().toString(),
      amount: Number(amount),
      description: desc || type.charAt(0).toUpperCase() + type.slice(1),
      date: new Date().toISOString(),
      type,
    };
    const updated = [entry, ...earnings];
    setEarnings(updated);
    saveEarnings(updated);
    setAmount(''); setDesc(''); setShowAdd(false);
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" /> Earnings Tracker
        </p>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-primary font-medium hover:underline">
          {showAdd ? 'Cancel' : '+ Log Earning'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-primary/5 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Today</p>
          <p className="font-heading font-bold text-sm text-primary">₦{todayEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-secondary rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">This Week</p>
          <p className="font-heading font-bold text-sm text-foreground">₦{weekEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-secondary rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">All Time</p>
          <p className="font-heading font-bold text-sm text-foreground">₦{totalEarnings.toLocaleString()}</p>
        </div>
      </div>

      {showAdd && (
        <div className="space-y-2 bg-secondary/40 rounded-lg p-3">
          <div className="flex gap-2">
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₦)"
              type="number" className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <select value={type} onChange={e => setType(e.target.value as Earning['type'])}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm">
              <option value="delivery">Delivery</option>
              <option value="tip">Tip</option>
              <option value="bonus">Bonus</option>
            </select>
          </div>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={addEarning} className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg">
            Add Earning
          </button>
        </div>
      )}

      {earnings.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {earnings.slice(0, 10).map(e => (
            <div key={e.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-1.5">
              <div>
                <p className="text-xs font-medium text-foreground">{e.description}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(e.date).toLocaleString()}</p>
              </div>
              <p className="text-xs font-bold text-primary flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> ₦{e.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
