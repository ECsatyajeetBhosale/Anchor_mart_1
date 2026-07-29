import type { BadgeProps } from "@/components/ui/badge";

/** Badge colour variant used for a seller-application status pill. */
export type SellerRequestBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * UI row model consumed by the seller-applications table. Built from a
 * `SellerRequestApi` row by the API transform; display strings are already
 * "-"-guarded so columns render the raw value directly.
 */
export interface SellerRequest {
  /** Unique application id — passed to approve/reject and the detail API. */
  id: string;
  /** Applicant name. */
  n: string;
  /** Applicant email. */
  e: string;
  /** Business name. */
  b: string;
  /** Products / categories the applicant intends to sell. */
  prod: string;
  /** Documents label ("Uploaded" / "Missing"), or "-" when the backend omits it. */
  docs: string;
  /**
   * Whether the required documents were uploaded (drives the badge colour).
   * `null` when the backend provides no document info → cell renders "-".
   */
  docsOk: boolean | null;
  /** Submitted date label. */
  dt: string;
  /** Status label (`status_display`) shown in the badge. */
  st: string;
  /** Raw status token (used internally for filtering / badge colour). */
  status: string;
  /** Badge variant for the status. */
  sc: SellerRequestBadgeVariant;
}

/**
 * Raw seller-application row from `GET /superadmin/sellers/requests/`
 * (`results[]`). Fields are optional/nullable so a partial payload degrades
 * gracefully to "-".
 */
export interface SellerRequestApi {
  id: number | string;
  /** Applicant's user UUID. */
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  whatsapp_number?: string | null;
  business?: string | null;
  status?: string | null;
  status_display?: string | null;
  submitted_at?: string | null;
  /**
   * Document status — not part of the current list contract, but read
   * defensively so the Documents column lights up if the backend adds it
   * later (label "Uploaded"/"Missing" or a boolean flag).
   */
  documents?: string | boolean | null;
  documents_uploaded?: boolean | null;
  /** Products / categories — not in the current list contract (renders "-"). */
  products?: string | null;
}

/** Query params for the seller-applications list (search + status omitted when empty). */
export interface GetSellerRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Raw API status value (e.g. "pending"); omit for "all". */
  status?: string;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface SellerRequestListResult {
  count: number;
  requests: SellerRequest[];
}

/**
 * Seller statistics returned by `GET /superadmin/sellers/stats/`.
 * Every field is optional so a partial/empty payload degrades gracefully to 0.
 */
export interface SellerRequestStats {
  pending?: number;
  approved?: number;
  rejected?: number;
  active_sellers?: number;
}

/** Payload sent when rejecting an application. */
export interface RejectSellerPayload {
  id: string;
  reason: string;
  message?: string;
}
