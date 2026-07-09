/**
 * An express order row as returned by GET /superadmin/express/orders/.
 * Dates arrive pre-formatted from the backend (e.g. "June 23, 2026, 02:18 AM").
 */
export interface ExpressOrder {
  id: string;
  order_number: string;
  /** Machine status, e.g. "delivered". */
  status: string;
  /** Human status label, e.g. "Delivered". */
  status_display: string;
  customer_name: string;
  customer_email: string;
  /** Decimal string, e.g. "2027.42". */
  total_amount: string;
  item_count: number;
  port_name: string | null;
  anchorage_name: string | null;
  /** Pre-formatted timestamp, e.g. "June 23, 2026, 02:18 AM". */
  ship_arrival_date: string | null;
  payment_completed_at: string | null;
  is_fastest_delivery: boolean;
  is_express: boolean;
  is_emergency: boolean;
  partner_allocated: boolean;
  partner_name: string | null;
  has_location_request: boolean;
  created_at: string | null;
}

/** DRF paginated envelope for the express orders list (plain `results` array). */
export interface ExpressOrderListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ExpressOrder[];
}
