import type { SearchableSelectFilter } from "@/components/common/SearchableSelect";
import type { BadgeProps } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";

const P = MESSAGES.COMMON.PRODUCT_PICKER;

/**
 * The catalog-type chips above a product picker, in one place so every picker
 * offers the same three.
 *
 * Applied **server-side** by `useProductPicker` — narrowing a fetched page in
 * the browser would filter 50 rows out of N and look like it worked.
 */
export const CATALOG_TYPE_FILTERS: SearchableSelectFilter[] = [
  { label: P.ALL_TYPES, value: "" },
  { label: P.CATALOG_TYPE.regular, value: "regular" },
  { label: P.CATALOG_TYPE.express, value: "express" },
  { label: P.CATALOG_TYPE.marine_emergency, value: "marine_emergency" },
];

/** The badge shown beside an option's name; blank when the row has no type. */
export function catalogTypeLabel(type?: string): string | undefined {
  return type ? P.CATALOG_TYPE[type] : undefined;
}

/**
 * Catalog badge colours, shared so a type reads the same on the products table
 * and in the edit drawer, and matching the KPI cards above the table. An unknown
 * type falls back to neutral rather than borrowing a colour that would imply a
 * catalog it isn't in.
 */
export const CATALOG_BADGE_VARIANT: Record<string, BadgeProps["variant"]> = {
  regular: "blue",
  express: "purple",
  marine_emergency: "danger",
};
