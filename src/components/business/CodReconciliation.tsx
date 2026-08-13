import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Banknote, Check, Download, Filter } from 'lucide-react';

/** Daily Cash on Delivery (COD) reconciliation report for the business. */
export default function CodReconciliation({ businessId }: { businessId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<'unsettled' | 'all'>('unsettled');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const q = supabase.from('delivery_trackings')
      .select('id, customer_name, share_code, cod_amount, cod_collected, cod_settled, cod_collected_at, rider_name, created_at')
      .eq('business_user_id', businessId)
      .gt('cod_amount', 0)
      .order('cod_collected_at', { ascending: false, nullsFirst: false })
      .limit(200);
    const { data } = await q;
    setItems((data || []).filter(d =>
      filter === 'all' ? true : (d.cod_collected && !d.cod_settled)
    ));
    setLoading(false);
  };

  useEffect(() => { load(); }, [businessId, filter]);

  const settle = async (id: string) => {
    const { error } = await supabase.from('delivery_trackings')
      .update({ cod_settled: true, cod_settled_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Could not settle'); return; }
    toast.success('Marked as settled');
    load();
  };

  const settleAll = async () => {
    const ids = items.filter(i => i.cod_collected && !i.cod_settled).map(i => i.id);
    if (!ids.length) return;
    const { error } = await supabase.from('delivery_trackings')
      .update({ cod_settled: true, cod_settled_at: new Date().toISOString() })
      .in('id', ids);
    if (error) { toast.error('Could not settle batch'); return; }
    toast.success(`Settled ${ids.length} deliveries`);
    load();
  };

  const exportCsv = () => {
    let csv = 'Date,Customer,Tracking,Rider,Amount (NGN),Collected,Settled\n';
    items.forEach(i => {
      csv += `${new Date(i.created_at).toLocaleString()},${i.customer_name},${i.share_code},${i.rider_name || '-'},${i.cod_amount},${i.cod_collected ? 'Yes' : 'No'},${i.cod_settled ? 'Yes' : 'No'}\n`;
    });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `cod-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const totalCollected = items.filter(i => i.cod_collected).reduce((s, i) => s + Number(i.cod_amount), 0);
  const totalUnsettled = items.filter(i => i.cod_collected && !i.cod_settled).reduce((s, i) => s + Number(i.cod_amount), 0);

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-heading font-bold text-sm flex items-center gap-2">
          <Banknote className="w-4 h-4 text-yellow-500" /> COD Reconciliation
        </p>
        <button onClick={exportCsv} className="text-[10px] text-primary font-bold flex items-center gap-1">
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary/60 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Collected</p>
          <p className="font-heading font-bold text-base">₦{totalCollected.toLocaleString()}</p>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-2.5 text-center border border-yellow-500/30">
          <p className="text-[10px] text-yellow-700">Awaiting settlement</p>
          <p className="font-heading font-bold text-base text-yellow-700">₦{totalUnsettled.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button onClick={() => setFilter('unsettled')}
            className={`px-2.5 py-1 rounded text-[10px] font-bold ${filter === 'unsettled' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            Unsettled
          </button>
          <button onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded text-[10px] font-bold ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            All
          </button>
        </div>
        {totalUnsettled > 0 && (
          <button onClick={settleAll}
            className="px-2.5 py-1 rounded text-[10px] font-bold bg-green-600 text-white">
            Settle all
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No COD deliveries to reconcile.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden text-xs">
          <table className="w-full">
            <thead><tr className="bg-secondary/60">
              <th className="text-left px-2 py-1.5 text-muted-foreground">Customer</th>
              <th className="text-left px-2 py-1.5 text-muted-foreground">Rider</th>
              <th className="text-right px-2 py-1.5 text-muted-foreground">₦</th>
              <th className="text-center px-2 py-1.5 text-muted-foreground"></th>
            </tr></thead>
            <tbody>{items.map(i => (
              <tr key={i.id} className="border-t border-border">
                <td className="px-2 py-1.5">{i.customer_name}<div className="text-[9px] font-mono text-muted-foreground">{i.share_code}</div></td>
                <td className="px-2 py-1.5">{i.rider_name || '—'}</td>
                <td className="px-2 py-1.5 text-right font-bold">{Number(i.cod_amount).toLocaleString()}</td>
                <td className="px-2 py-1.5 text-center">
                  {i.cod_settled ? (
                    <span className="text-[10px] text-green-700 font-bold">Settled</span>
                  ) : i.cod_collected ? (
                    <button onClick={() => settle(i.id)}
                      className="px-2 py-0.5 bg-green-600 text-white rounded text-[10px] font-bold">Settle</button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Pending</span>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}