import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { MenuItem } from '../types'

interface MenuState { items: MenuItem[]; top: number; right: number }

interface MenuApi {
  /** Open a context menu anchored to the trigger element (mirrors showMenu). */
  open: (trigger: HTMLElement, items: MenuItem[]) => void
  close: () => void
}

const MenuCtx = createContext<MenuApi | null>(null)

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null)

  const open = useCallback((trigger: HTMLElement, items: MenuItem[]) => {
    const rect = trigger.getBoundingClientRect()
    setMenu({ items, top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }, [])
  const close = useCallback(() => setMenu(null), [])

  useEffect(() => {
    if (!menu) return
    const onDoc = () => close()
    // defer so the opening click doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('click', onDoc), 0)
    return () => { clearTimeout(id); document.removeEventListener('click', onDoc) }
  }, [menu, close])

  return (
    <MenuCtx.Provider value={{ open, close }}>
      {children}
      {menu && (
        <div className="action-menu open" style={{ position: 'fixed', top: menu.top, right: menu.right }}>
          {menu.items.map((it, i) => (
            <div
              key={i}
              className={`action-menu-item ${it.danger ? 'danger' : ''}`}
              onClick={() => { it.action(); close() }}
            >
              <i className={`ti ti-${it.icon}`} />{it.label}
            </div>
          ))}
        </div>
      )}
    </MenuCtx.Provider>
  )
}

export function useMenu(): MenuApi {
  const ctx = useContext(MenuCtx)
  if (!ctx) throw new Error('useMenu must be used within MenuProvider')
  return ctx
}
