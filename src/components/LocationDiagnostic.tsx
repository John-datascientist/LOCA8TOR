import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Activity, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { generatePostcode, generatePostcodeWithAddress } from '@/lib/postcodeGenerator';

type Status = 'idle' | 'running' | 'pass' | 'fail' | 'warn';

interface Check {
  key: string;
  label: string;
  status: Status;
  detail?: string;
}

interface Props {
  /** Called with the diagnostic GPS coordinates so the parent can drop a pin / generate. */
  onApplyLocation?: (lat: number, lng: number) => void;
  /** Current map pin position, used to verify the parent reacted to onApplyLocation. */
  currentPin?: [number, number] | null;
  /** Current generated postcode shown by the parent, used to verify the postcode rendered. */
  currentPostcode?: string | null;
}

const INITIAL: Check[] = [
  { key: 'support', label: 'Browser supports geolocation', status: 'idle' },
  { key: 'context', label: 'Page is in a secure / non-blocked context', status: 'idle' },
  { key: 'permission', label: 'Location permission granted', status: 'idle' },
  { key: 'fix', label: 'GPS returned coordinates', status: 'idle' },
  { key: 'postcode', label: 'Postcode generated from coordinates', status: 'idle' },
  { key: 'pin', label: 'Map pin updated to GPS position', status: 'idle' },
];

export default function LocationDiagnostic({ onApplyLocation, currentPin, currentPostcode }: Props) {
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [running, setRunning] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const update = (key: string, status: Status, detail?: string) =>
    setChecks(prev => prev.map(c => (c.key === key ? { ...c, status, detail } : c)));

  const run = async () => {
    setRunning(true);
    setChecks(INITIAL.map(c => ({ ...c, status: 'idle', detail: undefined })));

    // 1. Browser support
    if (!('geolocation' in navigator)) {
      update('support', 'fail', 'navigator.geolocation is unavailable');
      setRunning(false);
      return;
    }
    update('support', 'pass');

    // 2. Secure context (HTTPS / localhost) and not in a blocking in-app browser/iframe
    const ua = navigator.userAgent || '';
    const inApp = /(FBAN|FBAV|Instagram|Line|TikTok|Snapchat|Twitter|Pinterest|MicroMessenger)/i.test(ua);
    const iframed = (() => { try { return window.self !== window.top; } catch { return true; } })();
    if (!window.isSecureContext) {
      update('context', 'fail', 'Page is not served over HTTPS — geolocation will be blocked');
      setRunning(false);
      return;
    }
    if (inApp || iframed) {
      update('context', 'warn', inApp
        ? 'In-app browser detected. Open in Chrome/Safari for full GPS access.'
        : 'Page is inside an iframe. Some browsers block GPS prompts here.');
    } else {
      update('context', 'pass');
    }

    // 3. Permission state (Permissions API where available)
    update('permission', 'running');
    let permState: PermissionState | 'unknown' = 'unknown';
    try {
      // @ts-ignore - older TS DOM lib
      const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
      permState = (status?.state as PermissionState) || 'unknown';
    } catch {
      permState = 'unknown';
    }
    if (permState === 'denied') {
      update('permission', 'fail', 'Permission denied. Re-allow location in your browser/site settings.');
      setRunning(false);
      return;
    }
    if (permState === 'granted') update('permission', 'pass', 'granted');
    else update('permission', 'warn', permState === 'prompt' ? 'Will prompt now…' : 'Permission state unknown');

    // 4. Get a real fix
    update('fix', 'running');
    let coords: { lat: number; lng: number; accuracy: number } | null = null;
    try {
      coords = await new Promise<{ lat: number; lng: number; accuracy: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
      });
    } catch (err: any) {
      const code = err?.code;
      const msg = code === 1 ? 'Permission denied at prompt'
        : code === 2 ? 'Position unavailable (no GPS/network signal)'
        : code === 3 ? 'GPS request timed out'
        : err?.message || 'Unknown geolocation error';
      update('fix', 'fail', msg);
      if ((permState as string) !== 'denied') {
        update('permission', code === 1 ? 'fail' : 'warn', code === 1 ? 'Denied at prompt' : 'Prompt resolved without grant');
      }
      setRunning(false);
      return;
    }
    setLastCoords(coords);
    update('permission', 'pass', 'granted');
    update('fix', 'pass', `±${Math.round(coords.accuracy)}m  ·  ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);

    // 5. Generate postcode (deterministic) and verify it has the expected shape
    update('postcode', 'running');
    let pc: string | null = null;
    try {
      const quick = generatePostcode(coords.lat, coords.lng);
      pc = quick?.postcode || null;
      // Kick off the enriched lookup but don't block the diagnostic on it
      generatePostcodeWithAddress(coords.lat, coords.lng).catch(() => {});
    } catch (err: any) {
      update('postcode', 'fail', err?.message || 'Postcode generator threw');
      setRunning(false);
      return;
    }
    if (!pc) {
      update('postcode', 'fail', 'Generator returned an empty postcode');
      setRunning(false);
      return;
    }
    update('postcode', 'pass', pc);

    // 6. Hand off to parent so the map pin + postcode card update live, then verify
    update('pin', 'running');
    onApplyLocation?.(coords.lat, coords.lng);
    // Give React a tick to apply state, then verify the parent moved its pin near our GPS
    await new Promise(r => setTimeout(r, 600));
    if (!currentPin) {
      update('pin', 'warn', 'Parent did not expose a pin. Trigger "Use My Location" to confirm visually.');
    } else {
      const dLat = Math.abs(currentPin[0] - coords.lat);
      const dLng = Math.abs(currentPin[1] - coords.lng);
      const close = dLat < 0.001 && dLng < 0.001; // ~110m
      update('pin', close ? 'pass' : 'warn',
        close ? `Pin at ${currentPin[0].toFixed(5)}, ${currentPin[1].toFixed(5)}`
              : `Pin moved but is offset (Δlat ${dLat.toFixed(4)}, Δlng ${dLng.toFixed(4)})`);
    }

    setRunning(false);
  };

  const allPass = checks.every(c => c.status === 'pass');
  const anyFail = checks.some(c => c.status === 'fail');
  const headerTone = anyFail ? 'border-destructive/40 bg-destructive/5'
    : allPass && !running ? 'border-primary/40 bg-primary/5'
    : 'border-border bg-secondary/40';

  return (
    <div className={`rounded-xl border ${headerTone} transition-colors`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-heading text-sm font-bold text-foreground">Location Diagnostic</span>
          {!open && anyFail && <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">issues</span>}
          {!open && allPass && !running && <span className="text-[10px] font-bold uppercase tracking-wider text-primary">all good</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Runs a one-shot check: browser support → secure context → permission → GPS fix → postcode → map pin sync.
            Use this if "Use My Location" isn't producing a postcode or the pin doesn't move.
          </p>

          <button
            onClick={run}
            disabled={running}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-xs disabled:opacity-60"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            {running ? 'Running diagnostic…' : 'Run diagnostic'}
          </button>

          <ul className="space-y-1.5">
            {checks.map(c => (
              <li key={c.key} className="flex items-start gap-2.5 text-xs">
                <span className="mt-0.5 shrink-0">
                  {c.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  {c.status === 'fail' && <XCircle className="w-4 h-4 text-destructive" />}
                  {c.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {c.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  {c.status === 'idle' && <span className="block w-4 h-4 rounded-full border border-border" />}
                </span>
                <span className="flex-1">
                  <span className="text-foreground">{c.label}</span>
                  {c.detail && (
                    <span className="block text-[11px] text-muted-foreground mt-0.5 break-words">{c.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {lastCoords && currentPostcode && (
            <div className="bg-background border border-border rounded-lg p-2.5 text-[11px] text-muted-foreground">
              Live result: <span className="font-mono font-bold text-primary">{currentPostcode}</span>
              <span className="block">at {lastCoords.lat.toFixed(5)}, {lastCoords.lng.toFixed(5)} (±{Math.round(lastCoords.accuracy)}m)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}