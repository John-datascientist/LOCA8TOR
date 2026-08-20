import { cookies } from "next/headers";
import { COUNTRY_COOKIE, isCountryCode, type CountryCode } from "@/lib/location";

/** Reads the country chosen at signup (or since changed in Settings). */
export async function getSelectedCountry(): Promise<CountryCode> {
  const store = await cookies();
  const value = store.get(COUNTRY_COOKIE)?.value;
  return isCountryCode(value) ? value : "NG";
}
