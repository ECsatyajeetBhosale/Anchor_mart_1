import type { ReactNode } from 'react'
import { Dashboard } from './pages/Dashboard'
import { Analytics } from './pages/Analytics'
import { Sailors } from './pages/Sailors'
import { Orders } from './pages/Orders'
import { Intents } from './pages/Intents'
import { Requests } from './pages/Requests'
import { Cancellation } from './pages/Cancellation'
import { Products } from './pages/Products'
import { Spares } from './pages/Spares'
import { Express } from './pages/Express'
import { Rewards } from './pages/Rewards'
import { Partners } from './pages/Partners'
import { Assignments } from './pages/Assignments'
import { Verification } from './pages/Verification'
import { Notifications } from './pages/Notifications'
import { Chat } from './pages/Chat'
import { Support } from './pages/Support'
import { Sellers } from './pages/Sellers'
import { Settings } from './pages/Settings'

export interface AppRoute { path: string; element: ReactNode }

export const APP_ROUTES: AppRoute[] = [
  { path: '/', element: <Dashboard /> },
  { path: '/analytics', element: <Analytics /> },
  { path: '/sailors', element: <Sailors /> },
  { path: '/orders', element: <Orders /> },
  { path: '/intents', element: <Intents /> },
  { path: '/requests', element: <Requests /> },
  { path: '/cancellation', element: <Cancellation /> },
  { path: '/products', element: <Products /> },
  { path: '/spares', element: <Spares /> },
  { path: '/express', element: <Express /> },
  { path: '/rewards', element: <Rewards /> },
  { path: '/partners', element: <Partners /> },
  { path: '/assignments', element: <Assignments /> },
  { path: '/verification', element: <Verification /> },
  { path: '/notifications', element: <Notifications /> },
  { path: '/chat', element: <Chat /> },
  { path: '/support', element: <Support /> },
  { path: '/sellers', element: <Sellers /> },
  { path: '/settings', element: <Settings /> },
]
