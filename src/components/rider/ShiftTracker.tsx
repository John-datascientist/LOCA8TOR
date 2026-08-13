import { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, StopCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SHIFT_KEY = 'loca8tor-shift';
const SHIFT_HISTORY_KEY = 'loca8tor-shift-history';

interface ShiftRecord {
  id: string;
  start: string;
  end: string;
  duration: number; // minutes
}

function loadShiftHistory(): ShiftRecord[] {
  try { return JSON.parse(localStorage.getItem(SHIFT_HISTORY_KEY) || '[]'); }
  catch { return []; }
}

interface ShiftTrackerProps {
  businessRiderId?: string | null;
  businessUserId?: string | null;
}

export default function ShiftTracker({ businessRiderId, businessUserId }: ShiftTrackerProps = {}) {
  const [active, setActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [history, setHistory] = useState<ShiftRecord[]>(loadShiftHistory);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentShiftDbIdRef = useRef<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SHIFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setActive(true);
      setStartTime(new Date(parsed.start));
      setElapsed(Math.floor((Date.now() - new Date(parsed.start).getTime()) / 1000));
      if (parsed.dbId) currentShiftDbIdRef.current = parsed.dbId;
    }
  }, []);

  useEffect(() => {
    if (active && !paused) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, paused]);

  const clockIn = async () => {
    const now = new Date();
    setStartTime(now);
    setActive(true);
    setPaused(false);
    setElapsed(0);
    let dbId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('rider_shifts').insert({
          rider_user_id: user.id,
          business_rider_id: businessRiderId || null,
          business_user_id: businessUserId || null,
          started_at: now.toISOString(),
        } as any).select('id').maybeSingle();
        dbId = (data as any)?.id || null;
        currentShiftDbIdRef.current = dbId;
      }
    } catch { /* offline — history still stored locally */ }
    localStorage.setItem(SHIFT_KEY, JSON.stringify({ start: now.toISOString(), dbId }));
    // Broadcast so live-location trackers can start streaming.
    window.dispatchEvent(new CustomEvent('loca8tor-shift-started'));
  };

  const clockOut = async () => {
    if (!startTime) return;
    const endTime = new Date();
    const durationMin = Math.round(elapsed / 60);
    const record: ShiftRecord = {
      id: Date.now().toString(),
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      duration: durationMin,
    };
    const updated = [record, ...history].slice(0, 30);
    setHistory(updated);
    localStorage.setItem(SHIFT_HISTORY_KEY, JSON.stringify(updated));
    localStorage.removeItem(SHIFT_KEY);
    const dbId = currentShiftDbIdRef.current;
    if (dbId) {
      try {
        await supabase.from('rider_shifts').update({
          ended_at: endTime.toISOString(),
          duration_minutes: durationMin,
        } as any).eq('id', dbId);
      } catch { /* best-effort */ }
      currentShiftDbIdRef.current = null;
    }
    setActive(false);
    setStartTime(null);
    setElapsed(0);
    setPaused(false);
    // Broadcast so live-location trackers can immediately stop streaming.
    window.dispatchEvent(new CustomEvent('loca8tor-shift-ended'));
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const todayShifts = history.filter(h => h.start.startsWith(new Date().toISOString().split('T')[0]));
  const todayMinutes = todayShifts.reduce((s, h) => s + h.duration, 0) + (active ? Math.round(elapsed / 60) : 0);

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" /> Shift Tracker
      </p>

      {active ? (
        <div className="text-center space-y-2">
          <p className="font-heading font-bold text-3xl tabular-nums text-primary">{formatTime(elapsed)}</p>
          <p className="text-[10px] text-muted-foreground">
            Started at {startTime?.toLocaleTimeString()}
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setPaused(!paused)}
              className="flex items-center gap-1 bg-secondary text-foreground text-xs font-semibold px-4 py-2 rounded-lg">
              {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={clockOut}
              className="flex items-center gap-1 bg-destructive text-destructive-foreground text-xs font-semibold px-4 py-2 rounded-lg">
              <StopCircle className="w-3.5 h-3.5" /> Clock Out
            </button>
          </div>
        </div>
      ) : (
        <button onClick={clockIn}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-3 rounded-lg active:scale-[0.97] transition-transform">
          <Play className="w-4 h-4" /> Clock In
        </button>
      )}

      <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
        <p className="text-xs text-muted-foreground">Today's total</p>
        <p className="text-xs font-bold text-foreground">
          {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m
        </p>
      </div>

      {history.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          <p className="text-[10px] font-medium text-muted-foreground">Recent Shifts</p>
          {history.slice(0, 5).map(h => (
            <div key={h.id} className="flex justify-between text-[10px] bg-secondary/20 rounded px-2 py-1">
              <span className="text-muted-foreground">{new Date(h.start).toLocaleDateString()} {new Date(h.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="font-bold text-foreground">{Math.floor(h.duration / 60)}h {h.duration % 60}m</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
