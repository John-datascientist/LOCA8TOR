import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { PostcodeResult } from '@/lib/postcodeGenerator';

interface PostcodeCardProps {
  result: PostcodeResult | null;
  isLoading: boolean;
}

export default function PostcodeCard({ result, isLoading }: PostcodeCardProps) {
  const [copied, setCopied] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.postcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-md ring-1 ring-border animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-10 w-40 bg-muted rounded mb-3" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-md ring-1 ring-border text-center">
        <p className="text-muted-foreground text-sm">
          Click the button below or tap on the map to generate a postcode
        </p>
      </div>
    );
  }

  // Parse postcode parts: "ED3 7AK" → area="ED", district="3", sector="7", unit="AK"
  const parts = result.postcode.split(' ');
  const outward = parts[0] || '';
  const inward = parts[1] || '';
  const areaCode = result.areaCode;
  const district = outward.replace(areaCode, '');
  const sector = inward.charAt(0);
  const unit = inward.slice(1);

  return (
    <div className="bg-card rounded-lg p-6 shadow-md ring-1 ring-border opacity-0 animate-fade-up">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
        Generated Postcode
      </p>
      <div className="flex items-center gap-3">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {result.postcode}
        </h2>
        <button
          onClick={handleCopy}
          className="p-2 rounded-md hover:bg-secondary transition-colors active:scale-95"
          aria-label="Copy postcode"
        >
          {copied ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="mt-3 space-y-1">
        {result.country && result.country !== 'Nigeria' ? (
          <>
            {result.area && (
              <p className="text-sm text-foreground font-semibold flex items-center gap-1.5">
                <span className="text-primary">📍</span> {result.area}
              </p>
            )}
            {result.road && (
              <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                <span className="text-primary">🛣️</span> {result.road}
              </p>
            )}
            {result.address && !result.area && (
              <p className="text-sm text-foreground font-medium">{result.address}</p>
            )}
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{result.state}</span>
              <span className="text-muted-foreground"> · {result.country}</span>
            </p>
          </>
        ) : (
          <>
            {result.lga && result.country === 'Nigeria' && (
              <p className="text-sm text-foreground font-semibold flex items-center gap-1.5">
                <span className="text-primary">📍</span> {result.lga} LGA
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{result.state}</span> State
            </p>
          </>
        )}
      </div>

      {/* Breakdown toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors active:scale-95"
      >
        {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showBreakdown ? 'Hide breakdown' : 'What does this mean?'}
      </button>

      {result.isGenerated !== false && showBreakdown && (
        <div className="mt-3 rounded-md bg-secondary/60 p-4 space-y-3 opacity-0 animate-fade-up">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-2">
            Postcode Breakdown
          </p>

          <div className="flex items-center gap-1 font-heading text-lg font-bold">
            <span className="px-2 py-1 rounded bg-primary text-primary-foreground">{areaCode}</span>
            <span className="px-2 py-1 rounded bg-accent text-accent-foreground">{district}</span>
            <span className="mx-1 text-muted-foreground font-normal text-sm">·</span>
            <span className="px-2 py-1 rounded bg-primary/15 text-primary">{sector}</span>
            <span className="px-2 py-1 rounded bg-muted text-foreground">{unit}</span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-2 h-2 mt-1 rounded-full bg-primary" />
              <div>
                <span className="font-semibold text-foreground">{areaCode}</span>
                <span className="text-muted-foreground"> — Area ({result.state})</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-2 h-2 mt-1 rounded-full bg-accent" />
              <div>
                <span className="font-semibold text-foreground">{district}</span>
                <span className="text-muted-foreground"> — District{result.lga ? ` (${result.lga})` : ''}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-2 h-2 mt-1 rounded-full bg-primary/40" />
              <div>
                <span className="font-semibold text-foreground">{sector}</span>
                <span className="text-muted-foreground"> — Sector</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-2 h-2 mt-1 rounded-full bg-muted-foreground/40" />
              <div>
                <span className="font-semibold text-foreground">{unit}</span>
                <span className="text-muted-foreground"> — Unit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {result.isGenerated === false && showBreakdown && (
        <div className="mt-3 rounded-md bg-secondary/60 p-4 space-y-2 opacity-0 animate-fade-up">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            Official Postcode
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This is the real postcode for this location as provided by the country's postal service.
          </p>
        </div>
      )}
    </div>
  );
}
