import { useEffect, useRef } from 'react';

interface AdSenseProps {
  slot: string;
  format?: string;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const CLIENT = 'ca-pub-9710714050490431';

/**
 * Google AdSense ad unit. Pass the slot ID from your AdSense dashboard.
 * Example: <AdSense slot="1234567890" />
 */
export default function AdSense({ slot, format = 'auto', responsive = true, className, style }: AdSenseProps) {
  const ref = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // adsbygoogle isn't ready yet — script loads async
    }
  }, [slot]);

  return (
    <ins
      ref={ref as any}
      className={`adsbygoogle block ${className ?? ''}`}
      style={{ display: 'block', ...style }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}