// Trimmed mirror of the web app's lib/location.ts country list, just what
// signup needs here. Postcode/address validation can be ported over later
// to match the web flow exactly.
export type CountryCode = "NG" | "GB" | "US" | "CA";

export const countryList: { code: CountryCode; name: string; currencyCode: string }[] = [
  { code: "NG", name: "Nigeria", currencyCode: "NGN" },
  { code: "GB", name: "United Kingdom", currencyCode: "GBP" },
  { code: "US", name: "United States", currencyCode: "USD" },
  { code: "CA", name: "Canada", currencyCode: "CAD" },
];
