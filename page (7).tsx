import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { StatCard, SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { adminNav } from "@/lib/portal-nav";
import { escrowTransactions, escrowWalletBalance } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

const statusTone: Record<string, "brand" | "warning" | "neutral"> = {
  "Held in escrow": "warning",
  "Released to rider": "brand",
  Refunded: "neutral",
};

const heldCount = escrowTransactions.filter((t) => t.status === "Held in escrow").length;
const releasedTotal = escrowTransactions
  .filter((t) => t.status === "Released to rider")
  .reduce((sum, t) => sum + t.amount, 0);

export const metadata = { title: "Admin · Payments" };

export default async function AdminPaymentsPage() {
  const country = await getSelectedCountry();
  const config = [
    { key: "VAT_RATE", value: "7.5%" },
    { key: "ADMIN_FEE", value: formatCurrency(200, country) },
    { key: "BASE_FEE", value: formatCurrency(1500, country) },
    { key: "PER_KM_RATE", value: `${formatCurrency(230, country)} / km` },
    { key: "MOTORCYCLE_RATE", value: "1.0×" },
    { key: "CAR_RATE", value: "1.6×" },
    { key: "VAN_RATE", value: "2.2×" },
    { key: "TRUCK_RATE", value: "3.0×" },
  ];
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Payments"
      description="Transactions, refunds and the pricing configuration behind every delivery fee."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Escrow wallet balance"
          value={formatCurrency(escrowWalletBalance, country)}
          hint={`${heldCount} payment${heldCount === 1 ? "" : "s"} held, not yet released`}
        />
        <StatCard
          label="Released to riders"
          value={formatCurrency(releasedTotal, country)}
          hint="Paid out after delivery confirmation"
        />
        <StatCard
          label="Payment methods"
          value="Card · Bank transfer"
          hint="Both fund the same escrow wallet"
        />
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-foreground">Escrow transactions</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Every delivery and sponsorship payment is held here until a
          delivery is confirmed complete, then released to the rider, or
          refunded if a delivery falls through.
        </p>
      </Card>

      <SimpleTable
        columns={["Item", "Payer", "Method", "Amount", "Status", "Date"]}
        rows={escrowTransactions.map((t) => [
          t.itemTitle,
          `${t.payer} (${t.payerType})`,
          t.method,
          formatCurrency(t.amount, country),
          <StatusBadge key="s" label={t.status} tone={statusTone[t.status]} />,
          t.date,
        ])}
      />

      <Card>
        <h3 className="text-sm font-semibold text-foreground">
          Delivery pricing configuration
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          These values drive the server-side pricing engine. The frontend
          never calculates a final price.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {config.map((c) => (
            <div key={c.key} className="flex items-center justify-between border border-border bg-surface-muted px-4 py-2.5">
              <dt className="font-mono text-xs text-muted-foreground">{c.key}</dt>
              <dd className="text-sm font-semibold text-foreground">{c.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </PortalShell>
  );
}
