import type { VerificationItem } from "../types/verification.types";

// The reports table is live (GET /superadmin/partner/verification-reports/).
// The item-detail panel still has no endpoint — these mocks feed it until one
// exists (see verification.types.ts).

/** The enquiry whose item detail is shown in the active-check panel. */
export const ACTIVE_ENQUIRY = "ENQ-0042";
export const ACTIVE_SHOP = "Wegmans PSA";

export const MOCK_ITEMS: VerificationItem[] = [
  { name: "Nu Republic Powerpo X1 Power Bank", qty: "×1", aisle: "—", status: "Available" },
  { name: "21g Protein Bar Variety Pack", qty: "×2", aisle: "Aisle 4", status: "Available" },
  {
    name: "Bombay Shaving Company 5 Piece Kit",
    qty: "×1",
    aisle: "Aisle 2",
    status: "Unavailable",
  },
];
