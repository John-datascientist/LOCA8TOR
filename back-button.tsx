"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  label = "Back",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`label-caps inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70 transition-colors hover:text-ink ${className}`}
    >
      ← {label}
    </button>
  );
}
