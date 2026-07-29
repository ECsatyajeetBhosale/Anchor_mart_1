/**
 * Order ownership types — Flow 27 (Admin Order Ownership & Governance).
 *
 * An order has at most one accountable admin. Claiming is the precondition for
 * every other admin write on that order (17 endpoints across other flows,
 * including intent rejection), so this shape surfaces on the order detail,
 * order list, and intent list serializers alike.
 */

/**
 * The owner descriptor as returned by `_assigned_admin_brief`. `null` when the
 * order is unassigned.
 *
 * Note: the chat serializer builds a different descriptor (`{id, name}`, no
 * `email`) — do not assume this exact shape there. See doc finding F-06.
 */
export interface AssignedAdmin {
  id: string;
  /** Falls back to the email when no first/last name is set. */
  name: string;
  email: string;
}

/** Success body of `POST /superadmin/orders/order/<id>/claim/`. */
export interface ClaimOrderResponse {
  message: string;
  order_id: string;
  assigned_admin: AssignedAdmin;
}

/**
 * 409 body — another admin already holds the order. The current owner is
 * returned precisely so the UI can name who to ask.
 */
export interface ClaimConflict {
  detail: string;
  assigned_admin?: AssignedAdmin;
}

/**
 * Body of `POST /superadmin/orders/order/<id>/reassign/`.
 *
 * `admin_id` must resolve to an `is_active=True` account with role `admin` or
 * `super_admin`. Note the panel has no way to *obtain* this id — no endpoint
 * lists admin accounts (doc finding F-03) — so this contract is implemented
 * ahead of a backend admin-list endpoint.
 */
export interface ReassignOrderPayload {
  orderId: string;
  admin_id: string;
}

/** Success body of the reassign endpoint — same shape as a claim. */
export type ReassignOrderResponse = ClaimOrderResponse;

/**
 * Reassign failures come in two shapes: `{detail}` for order/authorisation
 * errors, and a DRF field body for `admin_id`. Note the "no active admin with
 * this id" case is a **404 carrying the field shape**, not a 400.
 */
export interface ReassignError {
  detail?: string;
  admin_id?: string[];
}
