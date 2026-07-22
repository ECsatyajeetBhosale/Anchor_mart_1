import type { PageKey } from '../../types'

export interface NavItem {
  page: PageKey
  path: string
  label: string
  icon: string
  badge?: { text: string; variant?: 'warning' }
}

export interface NavSection {
  title: string
  items: NavItem[]
}

// Mirrors the sidebar markup in index.html (sections + items + badges).
export const NAV: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { page: 'dashboard', path: '/', label: 'Dashboard', icon: 'ti-layout-dashboard' },
      { page: 'analytics', path: '/analytics', label: 'Analytics', icon: 'ti-chart-area-line' },
    ],
  },
  {
    title: 'Sailors App',
    items: [
      { page: 'sailors', path: '/sailors', label: 'Sailors', icon: 'ti-users' },
      { page: 'orders', path: '/orders', label: 'Orders', icon: 'ti-package', badge: { text: '12' } },
      { page: 'intents', path: '/intents', label: 'Intents', icon: 'ti-file-invoice', badge: { text: '8', variant: 'warning' } },
      { page: 'requests', path: '/requests', label: 'Special Requests', icon: 'ti-clipboard-text', badge: { text: '5', variant: 'warning' } },
      { page: 'cancellation', path: '/cancellation', label: 'Special Request Cancellation', icon: 'ti-receipt-refund' },
      { page: 'products', path: '/products', label: 'Products', icon: 'ti-box-seam' },
      { page: 'spares', path: '/spares', label: 'Marine Emergency Spares', icon: 'ti-engine' },
      { page: 'express', path: '/express', label: 'Express Items', icon: 'ti-bolt' },
      { page: 'rewards', path: '/rewards', label: 'Rewards & Coupons', icon: 'ti-star' },
    ],
  },
  {
    title: 'Delivery App',
    items: [
      { page: 'partners', path: '/partners', label: 'Delivery Partners', icon: 'ti-motorbike' },
      { page: 'assignments', path: '/assignments', label: 'Assignments', icon: 'ti-clipboard-list', badge: { text: '4' } },
      { page: 'verification', path: '/verification', label: 'Verifications', icon: 'ti-checklist', badge: { text: '3', variant: 'warning' } },
    ],
  },
  {
    title: 'Operations',
    items: [
      { page: 'notifications', path: '/notifications', label: 'Notifications', icon: 'ti-bell', badge: { text: '5' } },
      { page: 'chat', path: '/chat', label: 'Chat Monitor', icon: 'ti-messages' },
      { page: 'support', path: '/support', label: 'Support', icon: 'ti-lifebuoy', badge: { text: '3' } },
      { page: 'sellers', path: '/sellers', label: 'Seller Requests', icon: 'ti-building-store', badge: { text: '4', variant: 'warning' } },
    ],
  },
  {
    title: 'System',
    items: [
      { page: 'settings', path: '/settings', label: 'Settings', icon: 'ti-settings' },
    ],
  },
]

export const PATH_BY_PAGE: Record<PageKey, string> = Object.fromEntries(
  NAV.flatMap((s) => s.items).map((i) => [i.page, i.path]),
) as Record<PageKey, string>
