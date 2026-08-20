export function FreeDeliveryBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`label-caps inline-flex w-fit items-center gap-1.5 bg-accent-dark px-2.5 py-1 text-[11px] font-semibold text-surface ${className}`}
    >
      <span aria-hidden="true">🚚</span> Free delivery
    </span>
  );
}
