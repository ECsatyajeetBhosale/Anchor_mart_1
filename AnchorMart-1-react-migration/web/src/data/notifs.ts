import type { Notif } from '../types'

// Mutable in the original; here it's seed data the NotifPanel copies into state.
export const NOTIFS_SEED: Notif[] = [
  { ic: 'ti-file-invoice', bg: 'info-bg', fg: 'info-icon', t: 'New intent request submitted', s: 'Ravi Patel · #INT-0051 · IMO 0123456', tm: '2 min ago', unread: true, page: 'intents' },
  { ic: 'ti-map-pin', bg: 'amber-50', fg: 'amber-600', t: 'Anchorage changed — balance due', s: 'Lois Becket · #INT-0047 · $4.50 pending', tm: '31 min ago', unread: true, page: 'intents' },
  { ic: 'ti-alert-triangle', bg: 'danger-bg', fg: 'danger-icon', t: 'Verification flagged', s: '#ENQ-0039 · 2 items unavailable', tm: '1 hr ago', unread: true, page: 'verification' },
  { ic: 'ti-circle-check', bg: 'green-bg', fg: 'green-icon', t: 'Order delivered', s: '#AM2465 · Sara Chen · by Marco Reyes', tm: '2 hr ago', unread: true, page: 'orders' },
  { ic: 'ti-user-plus', bg: 'navy-50', fg: 'navy-600', t: 'New seller application', s: 'Coastal Supplies Co. · awaiting review', tm: '5 hr ago', unread: true, page: 'sellers' },
  { ic: 'ti-box-seam', bg: 'teal-50', fg: 'teal-600', t: 'Product low on stock', s: 'KILLER Running Shoes · 14 left', tm: 'Yesterday', unread: false, page: 'products' },
  { ic: 'ti-gift', bg: 'purple-bg', fg: 'purple-icon', t: 'Loyalty milestone reached', s: '4.82M points issued this month', tm: 'Yesterday', unread: false, page: 'rewards' },
]
