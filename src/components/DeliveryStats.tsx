import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

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

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export default function DeliveryStats() {
  const [entries, setEntries] = useState<DeliveryEntry[]>(loadDeliveries);

  // Re-read from storage periodically
  useEffect(() => {
    const interval = setInterval(() => setEntries(loadDeliveries()), 5000);
    return () => clearInterval(interval);
  }, []);

  const last7Days = useMemo(() => getLast7Days(), []);

  const dailyData = useMemo(() => {
    return last7Days.map(day => {
      const dayEntries = entries.filter(e => e.timestamp.startsWith(day));
      return {
        date: day,
        label: new Date(day + 'T00:00').toLocaleDateString('en', { weekday: 'short' }),
        total: dayEntries.length,
        delivered: dayEntries.filter(e => e.status === 'delivered').length,
        failed: dayEntries.filter(e => e.status === 'failed').length,
        returned: dayEntries.filter(e => e.status === 'returned').length,
      };
    });
  }, [entries, last7Days]);

  const maxTotal = Math.max(...dailyData.map(d => d.total), 1);

  const totals = useMemo(() => ({
    all: entries.length,
    delivered: entries.filter(e => e.status === 'delivered').length,
    failed: entries.filter(e => e.status === 'failed').length,
    returned: entries.filter(e => e.status === 'returned').length,
  }), [entries]);

  const successRate = totals.all > 0
    ? Math.round((totals.delivered / totals.all) * 100)
    : 0;

  const todayEntries = entries.filter(e => {
    const d = new Date(e.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <p className="text-sm font-heading font-bold text-foreground">Delivery Stats</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-secondary/40 rounded-lg p-2.5 text-center">
          <p className="text-lg font-heading font-bold text-foreground">{todayEntries.length}</p>
          <p className="text-[9px] text-muted-foreground">Today</p>
        </div>
        <div className="bg-green-500/10 rounded-lg p-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <p className="text-lg font-heading font-bold text-green-700 dark:text-green-400">{totals.delivered}</p>
          </div>
          <p className="text-[9px] text-muted-foreground">Delivered</p>
        </div>
        <div className="bg-destructive/10 rounded-lg p-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <XCircle className="w-3 h-3 text-destructive" />
            <p className="text-lg font-heading font-bold text-destructive">{totals.failed}</p>
          </div>
          <p className="text-[9px] text-muted-foreground">Failed</p>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <RotateCcw className="w-3 h-3 text-yellow-600" />
            <p className="text-lg font-heading font-bold text-yellow-700 dark:text-yellow-400">{totals.returned}</p>
          </div>
          <p className="text-[9px] text-muted-foreground">Returned</p>
        </div>
      </div>

      {/* Success Rate */}
      <div className="flex items-center gap-3">
        <TrendingUp className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">Success Rate</span>
            <span className="text-xs font-heading font-bold text-primary">{successRate}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 7-Day Bar Chart */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-2">Last 7 Days</p>
        <div className="flex items-end gap-1.5 h-24">
          {dailyData.map(day => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-medium text-foreground">{day.total || ''}</span>
              <div className="w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${Math.max((day.total / maxTotal) * 100, day.total > 0 ? 8 : 2)}%` }}>
                {day.delivered > 0 && (
                  <div className="bg-green-500/70 w-full" style={{ flex: day.delivered }} />
                )}
                {day.failed > 0 && (
                  <div className="bg-destructive/70 w-full" style={{ flex: day.failed }} />
                )}
                {day.returned > 0 && (
                  <div className="bg-yellow-500/70 w-full" style={{ flex: day.returned }} />
                )}
                {day.total === 0 && (
                  <div className="bg-secondary w-full flex-1" />
                )}
              </div>
              <span className="text-[8px] text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-green-500/70" />
            <span className="text-[8px] text-muted-foreground">Delivered</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-destructive/70" />
            <span className="text-[8px] text-muted-foreground">Failed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-yellow-500/70" />
            <span className="text-[8px] text-muted-foreground">Returned</span>
          </div>
        </div>
      </div>

      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Log deliveries to see your stats here.
        </p>
      )}
    </div>
  );
}
