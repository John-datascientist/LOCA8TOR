export type CountryCode = "NG" | "GB" | "US" | "CA";

export type CountryConfig = {
  code: CountryCode;
  name: string;
  currencyCode: string;
  symbol: string;
  locale: string;
  postcodeLabel: string;
  postcodePlaceholder: string;
  postcodePattern: RegExp;
  generatePostcode: () => string;
  escrowBank: { bank: string; accountName: string; accountLabel: string; accountNumber: string };
  regionLabel: string;
  regionPlaceholder: string;
};

function letter(): string {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

function digit(): string {
  return String(Math.floor(Math.random() * 10));
}

export const countries: Record<CountryCode, CountryConfig> = {
  NG: {
    code: "NG",
    name: "Nigeria",
    currencyCode: "NGN",
    symbol: "₦",
    locale: "en-NG",
    postcodeLabel: "Home postcode",
    postcodePlaceholder: "e.g. LA-104-772",
    postcodePattern: /^[A-Z]{2}-\d{3}-\d{3}$/i,
    generatePostcode: () =>
      `${letter()}${letter()}-${digit()}${digit()}${digit()}-${digit()}${digit()}${digit()}`,
    escrowBank: {
      bank: "Providus Bank",
      accountName: "WeGive Escrow Wallet",
      accountLabel: "Account number",
      accountNumber: "8900 442 217",
    },
    regionLabel: "State",
    regionPlaceholder: "e.g. Lagos",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    currencyCode: "GBP",
    symbol: "£",
    locale: "en-GB",
    postcodeLabel: "Postcode",
    postcodePlaceholder: "e.g. SW1A 1AA",
    postcodePattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    generatePostcode: () => {
      const outward = `${letter()}${letter()}${digit()}${Math.random() > 0.5 ? letter() : digit()}`;
      const inward = `${digit()}${letter()}${letter()}`;
      return `${outward} ${inward}`;
    },
    escrowBank: {
      bank: "WeGive Escrow (UK) Ltd, sort code 04-00-72",
      accountName: "WeGive Escrow Wallet",
      accountLabel: "Account number",
      accountNumber: "84 22 17 90",
    },
    regionLabel: "County",
    regionPlaceholder: "e.g. Greater London",
  },
  US: {
    code: "US",
    name: "United States",
    currencyCode: "USD",
    symbol: "$",
    locale: "en-US",
    postcodeLabel: "ZIP code",
    postcodePlaceholder: "e.g. 10001",
    postcodePattern: /^\d{5}(-\d{4})?$/,
    generatePostcode: () => `${digit()}${digit()}${digit()}${digit()}${digit()}`,
    escrowBank: {
      bank: "WeGive Escrow (US), routing 021000021",
      accountName: "WeGive Escrow Wallet",
      accountLabel: "Account number",
      accountNumber: "4471 8900 221",
    },
    regionLabel: "State",
    regionPlaceholder: "e.g. NY",
  },
  CA: {
    code: "CA",
    name: "Canada",
    currencyCode: "CAD",
    symbol: "C$",
    locale: "en-CA",
    postcodeLabel: "Postal code",
    postcodePlaceholder: "e.g. K1A 0B1",
    postcodePattern: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
    generatePostcode: () =>
      `${letter()}${digit()}${letter()} ${digit()}${letter()}${digit()}`,
    escrowBank: {
      bank: "WeGive Escrow (Canada), transit 04872",
      accountName: "WeGive Escrow Wallet",
      accountLabel: "Account number",
      accountNumber: "220 448 971",
    },
    regionLabel: "Province",
    regionPlaceholder: "e.g. Ontario",
  },
};

export const countryList = Object.values(countries);

/** Approximate NGN conversion rates, for display purposes only. */
const NGN_RATE: Record<CountryCode, number> = {
  NG: 1,
  US: 1 / 1600,
  GB: 1 / 2000,
  CA: 1 / 1150,
};

/**
 * All amounts in this app are stored in Naira (the platform's base
 * currency). This converts and formats for display in the chosen
 * country's currency, it never changes what's actually stored.
 */
export function formatCurrency(amountInNgn: number, country: CountryCode = "NG"): string {
  const config = countries[country];
  const converted = amountInNgn * NGN_RATE[country];
  const value = country === "NG" ? Math.round(converted) : Math.round(converted * 100) / 100;
  const formatted = value.toLocaleString(
    config.locale,
    country === "NG" ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );
  return `${config.symbol}${formatted}`;
}

export function isValidPostcode(value: string, country: CountryCode): boolean {
  return countries[country].postcodePattern.test(value.trim());
}

export const COUNTRY_COOKIE = "wg_country";

export function isCountryCode(value: string | undefined | null): value is CountryCode {
  return !!value && value in countries;
}
