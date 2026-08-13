import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Download, TrendingUp, Users, Package, MapPin } from 'lucide-react';

interface Rider {
  id: string;
  rider_name: string;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  status: string;
  last_postcode: string | null;
  last_seen: string | null;
}

export default function FleetReport({ riders, businessName, businessId }: { riders: Rider[]; businessName: string; businessId: string }) {
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('rider_delivery_logs')
        .select('*')
        .eq('business_user_id', businessId)
        .order('created_at', { ascending: false })
        .limit(200);
      setDeliveryLogs(data || []);
    };
    load();
  }, [businessId]);

  const totalDeliveries = riders.reduce((s, r) => s + (r.total_deliveries || 0), 0);
  const totalSuccess = riders.reduce((s, r) => s + (r.successful_deliveries || 0), 0);
  const totalFailed = riders.reduce((s, r) => s + (r.failed_deliveries || 0), 0);
  const successRate = totalDeliveries > 0 ? Math.round((totalSuccess / totalDeliveries) * 100) : 0;
  const activeCount = riders.filter(r => r.status === 'active').length;
  const trackable = riders.filter(r => r.last_postcode).length;

  // Daily breakdown from logs
  const dailyMap = new Map<string, { total: number; success: number; failed: number }>();
  deliveryLogs.forEach(l => {
    const day = l.created_at.split('T')[0];
    const entry = dailyMap.get(day) || { total: 0, success: 0, failed: 0 };
    entry.total++;
    if (l.status === 'delivered') entry.success++;
    if (l.status === 'failed') entry.failed++;
    dailyMap.set(day, entry);
  });
  const dailyData = [...dailyMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);

  // Top riders
  const sortedRiders = [...riders].sort((a, b) => (b.total_deliveries || 0) - (a.total_deliveries || 0));

  const exportReport = () => {
    let csv = 'Fleet Performance Report\n';
    csv += `Business: ${businessName}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += `Total Riders,${riders.length}\n`;
    csv += `Active Riders,${activeCount}\n`;
    csv += `Total Deliveries,${totalDeliveries}\n`;
    csv += `Success Rate,${successRate}%\n`;
    csv += `Failed Deliveries,${totalFailed}\n\n`;
    csv += 'Rider Name,Deliveries,Successful,Failed,Status,Last Location\n';
    sortedRiders.forEach(r => {
      csv += `${r.rider_name},${r.total_deliveries},${r.successful_deliveries},${r.failed_deliveries},${r.status},${r.last_postcode || 'N/A'}\n`;
    });
    if (dailyData.length > 0) {
      csv += '\nDaily Breakdown\nDate,Total,Success,Failed\n';
      dailyData.forEach(([day, d]) => {
        csv += `${day},${d.total},${d.success},${d.failed}\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fleet-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Fleet Report
        </p>
        <button onClick={exportReport}
          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary/60 rounded-lg p-3 text-center">
          <Users className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="font-heading font-bold text-lg text-foreground">{riders.length}</p>
          <p className="text-[10px] text-muted-foreground">{activeCount} Active</p>
        </div>
        <div className="bg-secondary/60 rounded-lg p-3 text-center">
          <Package className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="font-heading font-bold text-lg text-foreground">{totalDeliveries}</p>
          <p className="text-[10px] text-muted-foreground">{successRate}% Success</p>
        </div>
        <div className="bg-secondary/60 rounded-lg p-3 text-center">
          <MapPin className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="font-heading font-bold text-lg text-foreground">{trackable}</p>
          <p className="text-[10px] text-muted-foreground">GPS Tracked</p>
        </div>
      </div>

      {/* Daily trend */}
      {dailyData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">Daily Deliveries (Last 7 Days)</p>
          <div className="space-y-1">
            {dailyData.map(([day, d]) => {
              const maxVal = Math.max(...dailyData.map(([, dd]) => dd.total), 1);
              const pct = (d.total / maxVal) * 100;
              return (
                <div key={day} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{day}</span>
                    <span className="text-foreground font-medium">{d.total} ({d.success}✓ {d.failed}✗)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rider performance table */}
      <div>
        <p className="text-xs font-medium text-foreground mb-2">Rider Performance</p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/60">
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Rider</th>
                <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">Del.</th>
                <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">Rate</th>
                <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedRiders.map(r => {
                const rate = r.total_deliveries > 0 ? Math.round((r.successful_deliveries / r.total_deliveries) * 100) : 0;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-1.5 text-foreground">{r.rider_name}</td>
                    <td className="text-center px-2 py-1.5 text-foreground font-medium">{r.total_deliveries}</td>
                    <td className="text-center px-2 py-1.5">
                      <span className={rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-destructive'}>{rate}%</span>
                    </td>
                    <td className="text-center px-2 py-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${r.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
