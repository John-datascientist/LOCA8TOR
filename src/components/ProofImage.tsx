import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProofImageProps {
  /** Currently stored signed URL (may be expired). */
  src: string | null | undefined;
  /** Delivery row id — used to refresh the URL on failure. */
  deliveryId: string;
  /** Optional share code for anonymous customer tracking pages. */
  shareCode?: string;
  alt?: string;
  className?: string;
  /** Render slot for the download link, given the freshest URL. */
  renderDownload?: (freshUrl: string) => React.ReactNode;
}

/**
 * Shows a delivery proof photo. If the underlying signed URL has expired and
 * the <img> errors out, it calls the `get-proof-url` edge function to mint a
 * new 1-year signed URL and retries — so tracking pages never show broken
 * images.
 */
export function ProofImage({
  src,
  deliveryId,
  shareCode,
  alt = "Delivery proof",
  className,
  renderDownload,
}: ProofImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const triedRefresh = useRef(false);

  useEffect(() => {
    setCurrentSrc(src ?? null);
    triedRefresh.current = false;
  }, [src, deliveryId]);

  const refresh = async () => {
    if (triedRefresh.current || refreshing) return;
    triedRefresh.current = true;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-proof-url", {
        body: { delivery_id: deliveryId, share_code: shareCode },
      });
      if (!error && data?.url) {
        setCurrentSrc(data.url);
      }
    } catch {
      /* swallow — keep the broken state visible */
    } finally {
      setRefreshing(false);
    }
  };

  if (!currentSrc) return null;

  return (
    <>
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        onError={refresh}
        loading="lazy"
      />
      {renderDownload?.(currentSrc)}
    </>
  );
}

export default ProofImage;