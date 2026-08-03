/**
 * Settings types — Help & FAQ management.
 *
 * User provisioning used to live here too; it moved to the account-management
 * feature (`types/user.types.ts`) when provisioning joined the deletion queue.
 *
 * Both FAQ endpoints return a plain DRF page (`results` is a flat array), not
 * the wrapped `results: { message, data }` envelope the catalog endpoints use.
 * Ids are integers here rather than UUIDs.
 */

export interface Faq {
  id: number;
  /** Type **name**, not its id — that is also what create/update expect back. */
  faq_type: string;
  question: string;
  answer: string;
  is_active: boolean;
  /** Pre-formatted timestamp, e.g. "June 22, 2026, 07:30 AM". */
  created_at: string;
  updated_at: string;
}

export interface FaqType {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

/** Plain DRF page — `results` is the array itself. */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type FaqListResponse = PaginatedResponse<Faq>;
export type FaqTypeListResponse = PaginatedResponse<FaqType>;

/** Request body for POST /superadmin/faq/create/. */
export interface AddFaqPayload {
  faq_type: string;
  question: string;
  answer: string;
}

/** Request body for PATCH /superadmin/faq/update/{id}/. */
export type UpdateFaqPayload = AddFaqPayload;

/** Request body for the FAQ-type add/update endpoints. */
export interface FaqTypePayload {
  name: string;
}
