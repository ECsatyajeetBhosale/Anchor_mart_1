import { type CountryCode, getCountries, getCountryCallingCode } from "libphonenumber-js/mobile";

/**
 * The dialling-code catalogue behind every phone field.
 *
 * Built from libphonenumber's own metadata rather than a checked-in list, so the
 * codes here cannot drift from the rules that validate numbers against them —
 * a hand-maintained table is how a country ends up selectable but permanently
 * unvalidatable.
 *
 * Everything imports from `libphonenumber-js/mobile`, never the bare package.
 * The two entry points ship *different* metadata files, and mixing them pulls
 * both into the bundle for no benefit.
 */

export interface Country {
  /** ISO 3166-1 alpha-2, uppercase. The key libphonenumber and flag-icons share. */
  iso: CountryCode;
  /** English display name, e.g. "United Arab Emirates". */
  name: string;
  /** Dialling prefix in the `+NN` form the API stores. */
  dialCode: string;
}

/**
 * Country names come from the platform, not from us.
 *
 * `Intl.DisplayNames` covers all 245 codes libphonenumber knows, which is 245
 * names we neither ship nor have to keep current. The fallback is the ISO code
 * itself — ugly but selectable, which beats a row that renders blank.
 */
const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

function displayName(iso: string): string {
  try {
    return regionNames?.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

/**
 * Which country owns a shared dialling code.
 *
 * Twelve codes are used by more than one territory — `+1` alone covers 25 — so
 * a stored `"+1"` cannot say on its own whether to show the American or the
 * Barbadian flag. These pick the one an operator means by default.
 *
 * This is a *display* decision only. Validation parses the full E.164 number and
 * resolves the territory itself, so a Canadian number entered under `+1` is
 * still checked against Canada's rules however this map is set.
 */
const PRIMARY_ISO: Record<string, CountryCode> = {
  "+1": "US",
  "+7": "RU",
  "+39": "IT",
  "+44": "GB",
  "+47": "NO",
  "+61": "AU",
  "+212": "MA",
  "+262": "RE",
  "+290": "SH",
  "+358": "FI",
  "+590": "GP",
  "+599": "CW",
};

/** Every selectable country, sorted by name — the order the dropdown renders. */
export const COUNTRIES: Country[] = getCountries()
  .map((iso) => ({ iso, name: displayName(iso), dialCode: `+${getCountryCallingCode(iso)}` }))
  .sort((a, b) => a.name.localeCompare(b.name));

const BY_ISO = new Map(COUNTRIES.map((country) => [country.iso, country]));

const BY_DIAL_CODE = (() => {
  const map = new Map<string, Country>();
  for (const country of COUNTRIES) {
    const primary = PRIMARY_ISO[country.dialCode];
    if (primary ? country.iso === primary : !map.has(country.dialCode)) {
      map.set(country.dialCode, country);
    }
  }
  return map;
})();

/**
 * The country to *show* for a stored dialling code.
 *
 * Accepts the bare form too ("91"), because the API has stored both and a form
 * that opened blank on a record it could not parse would look like data loss.
 */
export function countryForDialCode(dialCode: string | null | undefined): Country | undefined {
  const compact = (dialCode ?? "").replace(/[\s()\-.]/g, "");
  if (!compact) return undefined;
  return BY_DIAL_CODE.get(compact.startsWith("+") ? compact : `+${compact}`);
}

export function countryForIso(iso: string | null | undefined): Country | undefined {
  return iso ? BY_ISO.get(iso.toUpperCase() as CountryCode) : undefined;
}
