import { useEffect, useRef } from 'react';

interface RiderNotificationsProps {
  deliveries: any[];
  enabled: boolean;
}

export function useRiderNotifications(deliveries: any[], enabled: boolean) {
  const prevCountRef = useRef(deliveries.length);
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if (!enabled || !('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        permissionRef.current = p;
      });
    } else {
      permissionRef.current = Notification.permission;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !('Notification' in window)) return;

    const newCount = deliveries.length;
    if (newCount > prevCountRef.current) {
      const newDelivery = deliveries[0]; // most recent
      if (Notification.permission === 'granted') {
        try {
          new Notification('🚴 New Delivery Assigned!', {
            body: `Customer: ${newDelivery?.customer_name || 'Unknown'}\nFrom: ${newDelivery?.from_postcode || '—'} → To: ${newDelivery?.to_postcode || '—'}`,
            icon: '/placeholder.svg',
            tag: `delivery-${newDelivery?.id}`,
            requireInteraction: true,
          });
        } catch {
          // Notification API may fail on some browsers
        }
      }
      // Also play a sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGSdwr+ffs14jFCJcu+3lq1kYESFYuO3oqVoZESBXt+3oqlwaER9Wtu3prFwbER5Vte3qrV0cERxUtO3rrF4eERpTs+3sr2AhEBdRsu3tsmMlDxNNqOvvs2coEgxHoOTqtXCuHAxFnuLodG/t3M1GHWGocy8sW43G3GCoce3rGo5H22AnMOyp2U7Im19lsCuomE9JWp5kr2roF4+KGd3kLuon1w/K2R1jrmmmlo/LmFzjLekmFg/MF5xibWil1Y/M1tvh7Ogk1M/NlhthLKej1A/OVVrgrCcjE0/PFFpgK6aikk/P05nfa2YhkU/QUxlequWhEM/REljd6mUgkA/R0dhdaeRfz0/SkVfc6WPfDs/TUJdcaONejs/UEBbbqGLdzo/UjxZa5+Ic');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {
        // Audio may fail silently
      }
    }
    prevCountRef.current = newCount;
  }, [deliveries.length, enabled]);
}

export function NotificationBanner({ onEnable }: { onEnable: () => void }) {
  if (!('Notification' in window)) return null;
  if (Notification.permission === 'granted') return null;
  if (Notification.permission === 'denied') {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 text-xs text-destructive">
        🔕 Notifications are blocked. Enable them in your browser settings to get delivery alerts.
      </div>
    );
  }

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5 flex items-center justify-between">
      <span className="text-xs font-medium text-foreground">🔔 Enable notifications to get instant delivery alerts</span>
      <button
        onClick={onEnable}
        className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-md"
      >
        Enable
      </button>
    </div>
  );
}
