import { useState } from 'react';
import { Clock, Plus, Calendar, User, Trash2 } from 'lucide-react';

interface Rider {
  id: string;
  rider_name: string;
}

interface Shift {
  id: string;
  riderId: string;
  riderName: string;
  date: string;
  startTime: string;
  endTime: string;
  zone: string;
  status: 'scheduled' | 'active' | 'completed' | 'missed';
}

export default function ShiftScheduler({ riders }: { riders: Rider[] }) {
  const [shifts, setShifts] = useState<Shift[]>(() => {
    try { return JSON.parse(localStorage.getItem('biz_shifts') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ riderId: '', date: '', startTime: '08:00', endTime: '17:00', zone: '' });

  const save = (updated: Shift[]) => {
    setShifts(updated);
    localStorage.setItem('biz_shifts', JSON.stringify(updated));
  };

  const addShift = (e: React.FormEvent) => {
    e.preventDefault();
    const rider = riders.find(r => r.id === form.riderId);
    if (!rider) return;
    const shift: Shift = {
      id: crypto.randomUUID(),
      riderId: form.riderId,
      riderName: rider.rider_name,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      zone: form.zone,
      status: 'scheduled',
    };
    save([shift, ...shifts]);
    setForm({ riderId: '', date: '', startTime: '08:00', endTime: '17:00', zone: '' });
    setShowForm(false);
  };

  const removeShift = (id: string) => save(shifts.filter(s => s.id !== id));

  const today = new Date().toISOString().split('T')[0];
  const todayShifts = shifts.filter(s => s.date === today);
  const upcoming = shifts.filter(s => s.date > today).slice(0, 10);
  const past = shifts.filter(s => s.date < today).slice(0, 5);

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Shift Scheduler
        </p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add Shift
        </button>
      </div>

      {showForm && (
        <form onSubmit={addShift} className="bg-secondary/60 rounded-lg p-3 space-y-2">
          <select required value={form.riderId} onChange={e => setForm({ ...form, riderId: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select Rider</option>
            {riders.map(r => <option key={r.id} value={r.id}>{r.rider_name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              min={today} className="rounded-md border border-input bg-background px-2 py-2 text-sm" />
            <input type="time" required value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm" />
            <input type="time" required value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm" />
          </div>
          <input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })}
            placeholder="Delivery zone (optional)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button type="submit" className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg">
            Schedule Shift
          </button>
        </form>
      )}

      {/* Today's shifts */}
      <div>
        <p className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Today's Shifts ({todayShifts.length})</p>
        {todayShifts.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-2">No shifts scheduled for today</p>
        ) : (
          <div className="space-y-1">
            {todayShifts.map(s => (
              <ShiftCard key={s.id} shift={s} onRemove={removeShift} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">Upcoming ({upcoming.length})</p>
          <div className="space-y-1">
            {upcoming.map(s => <ShiftCard key={s.id} shift={s} onRemove={removeShift} />)}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Past Shifts</p>
          <div className="space-y-1 opacity-60">
            {past.map(s => <ShiftCard key={s.id} shift={s} onRemove={removeShift} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ShiftCard({ shift, onRemove }: { shift: Shift; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">
        <User className="w-3 h-3 text-muted-foreground" />
        <div>
          <p className="text-xs font-medium text-foreground">{shift.riderName}</p>
          <p className="text-[10px] text-muted-foreground">
            {shift.date} · {shift.startTime}–{shift.endTime}{shift.zone ? ` · ${shift.zone}` : ''}
          </p>
        </div>
      </div>
      <button onClick={() => onRemove(shift.id)} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

