import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { CountrySwitcher } from "@/components/country-switcher";
import { NotificationPreferences } from "@/components/notification-preferences";
import { userNav } from "@/lib/portal-nav";
import { getSelectedCountry } from "@/lib/location-server";

export const metadata = { title: "Settings" };

const savedLocationTypes = ["Home", "Work", "School", "Family"];

export default async function SettingsPage() {
  const country = await getSelectedCountry();

  return (
    <PortalShell
      navItems={userNav}
      portalLabel="Your account"
      title="Settings"
      description="Manage your saved locations, notifications and account security."
    >
      <Card>
        <h3 className="text-sm font-semibold text-foreground">Country & currency</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set at signup, based on where you live. Prices across WeGive
          display in this currency.
        </p>
        <div className="mt-4">
          <CountrySwitcher current={country} />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-foreground">Saved locations</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Each saved location can have its own Loca8tor postcode, useful when
          you give or receive items from different places.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {savedLocationTypes.map((type) => (
            <div
              key={type}
              className="flex items-center justify-between border border-dashed border-border-strong px-4 py-3"
            >
              <span className="text-sm font-medium text-foreground">{type}</span>
              <span className="text-xs text-muted-foreground">Not set</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you&apos;d like to hear about each type of update.
        </p>
        <NotificationPreferences />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-foreground">Account security</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your password and manage where you&apos;re signed in.
        </p>
      </Card>
    </PortalShell>
  );
}
