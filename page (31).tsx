import { getSelectedCountry } from "@/lib/location-server";
import { CreateGiveawayForm } from "./create-giveaway-form";

export default async function CreateGiveawayPage() {
  const country = await getSelectedCountry();
  return <CreateGiveawayForm country={country} />;
}
