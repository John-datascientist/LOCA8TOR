import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Palette, Save, Image as ImageIcon } from 'lucide-react';

/** Lets the business control how their public tracking page looks. */
export default function BrandingSettings({ businessId }: { businessId: string }) {
  const [b, setB] = useState<any>({
    brand_name: '', brand_color: '#B8F53A', logo_url: '', support_phone: '', support_email: '',
    tagline: '', show_tip_jar: true, show_rating: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('business_branding')
        .select('*').eq('business_user_id', businessId).maybeSingle();
      if (data) setB(data);
      setLoading(false);
    })();
  }, [businessId]);

  const save = async () => {
    setSaving(true);
    const payload = { ...b, business_user_id: businessId, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('business_branding')
      .upsert(payload, { onConflict: 'business_user_id' });
    setSaving(false);
    if (error) { toast.error('Could not save branding'); return; }
    toast.success('Branding saved!');
  };

  if (loading) return <div className="text-xs text-muted-foreground p-4">Loading…</div>;

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        <p className="font-heading font-bold text-sm">Branded Tracking Page</p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Customize what customers see at <span className="font-mono">/track/[code]</span>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Brand Name" value={b.brand_name} onChange={v => setB({ ...b, brand_name: v })} placeholder="My Logistics Co." />
        <Field label="Tagline" value={b.tagline} onChange={v => setB({ ...b, tagline: v })} placeholder="Fastest delivery in town" />
        <Field label="Support Phone" value={b.support_phone} onChange={v => setB({ ...b, support_phone: v })} placeholder="+234…" />
        <Field label="Support Email" value={b.support_email} onChange={v => setB({ ...b, support_email: v })} placeholder="help@…" />
        <Field label="Logo URL" value={b.logo_url} onChange={v => setB({ ...b, logo_url: v })} placeholder="https://…/logo.png" icon={<ImageIcon className="w-3 h-3" />} />
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Brand Color</label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={b.brand_color || '#B8F53A'}
              onChange={e => setB({ ...b, brand_color: e.target.value })}
              className="w-12 h-9 rounded border border-border" />
            <input value={b.brand_color || ''} onChange={e => setB({ ...b, brand_color: e.target.value })}
              className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-xs font-mono" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        <Toggle label="Show ⭐ rating box" value={b.show_rating} onChange={v => setB({ ...b, show_rating: v })} />
        <Toggle label="Show 💰 tip jar" value={b.show_tip_jar} onChange={v => setB({ ...b, show_tip_jar: v })} />
      </div>

      <button onClick={save} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50">
        <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Branding'}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, icon }: any) {
  return (
    <div>
      <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
        {icon} {label}
      </label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full px-2 py-1.5 bg-background border border-border rounded text-xs" />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${
        value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'
      }`}>
      {label} <span className={`w-2 h-2 rounded-full ${value ? 'bg-primary' : 'bg-muted-foreground'}`} />
    </button>
  );
}