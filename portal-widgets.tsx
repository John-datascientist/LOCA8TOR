import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-black text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-start gap-3 border-dashed bg-surface-muted/60">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action}
    </Card>
  );
}

export function ListRow({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-none">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span className="label-caps shrink-0 bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-ink">
        {status}
      </span>
    </div>
  );
}

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "brand" | "warning" | "neutral" }) {
  const tones: Record<string, string> = {
    brand: "bg-brand-light text-ink",
    warning: "bg-warn-light text-warn",
    neutral: "bg-surface-muted text-muted-foreground",
  };
  return (
    <span className={`label-caps inline-flex shrink-0 items-center px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {label}
    </span>
  );
}

export function SimpleTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-none">
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-3 align-middle text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
