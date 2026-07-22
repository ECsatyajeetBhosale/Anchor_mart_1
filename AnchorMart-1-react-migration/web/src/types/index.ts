// Shared domain types. Pages that own bespoke row shapes may extend or define locally.

export type PageKey =
  | 'dashboard' | 'analytics' | 'sailors' | 'orders' | 'intents' | 'requests'
  | 'cancellation' | 'products' | 'spares' | 'express' | 'rewards' | 'partners'
  | 'assignments' | 'verification' | 'notifications' | 'chat' | 'support'
  | 'sellers' | 'settings'

export type ToastType = '' | 'success' | 'danger' | 'warning' | 'info'

export interface Notif {
  ic: string
  bg: string
  fg: string
  t: string
  s: string
  tm: string
  unread: boolean
  page: PageKey
}

export interface MenuItem {
  icon: string
  label: string
  action: () => void
  danger?: boolean
}

export type ModalSize = 'md' | 'lg' | 'xl'
