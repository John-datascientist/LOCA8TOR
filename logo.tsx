import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 text-lg font-black uppercase tracking-tight text-ink ${className}`}
    >
      <span className="flex h-8 w-8 items-center justify-center bg-ink text-sm font-black text-surface">
        W
      </span>
      <span>WeGive</span>
    </Link>
  );
}
