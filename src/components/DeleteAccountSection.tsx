import { useState } from 'react';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const doDelete = async () => {
    if (confirmation.trim().toUpperCase() !== 'DELETE') {
      toast({ title: 'Type DELETE to confirm', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('delete-my-account', {
      body: { confirmation: 'DELETE' },
    });
    if (error || (data as any)?.error) {
      setBusy(false);
      toast({
        title: 'Delete failed',
        description: (data as any)?.message || error?.message || 'Try again',
        variant: 'destructive',
      });
      return;
    }
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') && k.includes('-auth-token'))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem('loca8tor:profile');
    } catch {}
    toast({ title: 'Account deleted', description: 'Your account and data have been permanently removed.' });
    navigate('/');
    setTimeout(() => window.location.reload(), 200);
  };

  return (
    <section className="mt-8 bg-destructive/5 ring-1 ring-destructive/30 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-heading font-bold text-destructive text-sm">Danger zone — Delete account</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Permanently delete your Loca8tor account and associated data (profile, wallet, deliveries,
            notifications, referrals, saved postcodes). This cannot be undone.
          </p>
        </div>
      </div>
      <button
        onClick={() => { setConfirmation(''); setOpen(true); }}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-destructive text-destructive-foreground hover:brightness-110"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete my account permanently
      </button>

      <AlertDialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your account and all associated data. Active subscriptions will be cancelled.
              This action cannot be reversed. Type <span className="font-bold text-destructive">DELETE</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Type DELETE"
            className="w-full px-3 py-2 rounded-md bg-secondary text-foreground text-sm ring-1 ring-border focus:outline-none focus:ring-destructive"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doDelete(); }}
              disabled={busy || confirmation.trim().toUpperCase() !== 'DELETE'}
              className="bg-destructive text-destructive-foreground hover:brightness-110"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}