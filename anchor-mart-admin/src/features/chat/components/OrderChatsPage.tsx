import { ChatMonitorPage } from "./ChatMonitorPage";

/**
 * Order threads (Flow 23 §4.3) — the "Order Chats" nav entry.
 *
 * Distinct from Chat Monitor, which reads the shared delivery-partner *support*
 * inbox. This one is per-order and **not shared**: a sub-admin sees only the
 * orders they own, a super-admin sees everything including unclaimed orders.
 */
export function OrderChatsPage() {
  return <ChatMonitorPage source="order" />;
}

export default OrderChatsPage;
