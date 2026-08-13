import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2 } from 'lucide-react';
import { useRef } from 'react';
import type { PostcodeResult } from '@/lib/postcodeGenerator';

interface PostcodeQRProps {
  result: PostcodeResult;
}

export default function PostcodeQR({ result }: PostcodeQRProps) {
  const svgRef = useRef<HTMLDivElement>(null);

  const qrData = JSON.stringify({
    postcode: result.postcode,
    lat: result.lat,
    lng: result.lng,
    state: result.state,
    address: result.address,
  });

  const handleShare = async () => {
    const text = `📍 Postcode: ${result.postcode}\n📌 ${result.address || result.state}\n🗺️ https://www.google.com/maps?q=${result.lat},${result.lng}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Postcode: ${result.postcode}`, text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">QR Code</p>
      <div ref={svgRef} className="flex justify-center">
        <QRCodeSVG
          value={qrData}
          size={160}
          level="M"
          bgColor="transparent"
          fgColor="hsl(var(--foreground))"
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Scan to get postcode details
      </p>
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground text-xs font-medium py-2 rounded-lg hover:bg-secondary/80 transition-colors active:scale-[0.97]"
      >
        <Share2 className="w-3.5 h-3.5" /> Share Postcode
      </button>
    </div>
  );
}
