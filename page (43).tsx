import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { EditAddressForm } from "@/components/edit-address-form";
import { userNav } from "@/lib/portal-nav";
import { createClient } from "@/lib/supabase/server";
import { isCountryCode } from "@/lib/location";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const country = isCountryCode(metadata.country) ? metadata.country : "NG";

  return (
    <PortalShell
      navItems={userNav}
      portalLabel="Your account"
      title="Profile"
      description="Your public profile and account details."
    >
      <Card className="grid max-w-xl gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Full name
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.full_name || "Not set"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Email
          </p>
          <p className="mt-1 text-sm text-foreground">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Phone
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.phone || "Not set"}</p>
        </div>
        <EditAddressForm
          country={country}
          initialPostcode={metadata.postcode ?? ""}
          initialLine1={metadata.address_line1 ?? ""}
          initialLine2={metadata.address_line2 ?? ""}
          initialCity={metadata.city ?? ""}
          initialRegion={metadata.region ?? ""}
        />
      </Card>
    </PortalShell>
  );
}
