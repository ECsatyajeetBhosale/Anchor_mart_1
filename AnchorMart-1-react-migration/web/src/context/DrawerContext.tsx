import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface DrawerOpts {
  title: ReactNode
  body: ReactNode
  footer?: ReactNode
  size?: string
}

interface DrawerApi {
  /** Open a structured drawer (provider renders the hd/body/foot chrome). */
  open: (opts: DrawerOpts) => void
  /** Open a self-contained drawer node (the node renders its own .drawer-hd/.drawer-body/.drawer-foot). */
  openNode: (node: ReactNode, size?: string) => void
  close: () => void
}

const DrawerCtx = createContext<DrawerApi | null>(null)

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<DrawerOpts | null>(null)
  const [node, setNode] = useState<ReactNode | null>(null)
  const [size, setSize] = useState<string | undefined>(undefined)

  const open = useCallback((o: DrawerOpts) => { setNode(null); setSize(o.size); setOpts(o) }, [])
  const openNode = useCallback((n: ReactNode, s?: string) => { setOpts(null); setSize(s); setNode(n) }, [])
  const close = useCallback(() => { setOpts(null); setNode(null) }, [])

  const shown = opts !== null || node !== null

  return (
    <DrawerCtx.Provider value={{ open, openNode, close }}>
      {children}
      <div className={`drawer-overlay${shown ? ' show' : ''}`} id="drawer-overlay" onClick={close} />
      <div className={`drawer${size ? ' ' + size : ''}${shown ? ' open' : ''}`} id="drawer">
        {node}
        {opts && (
          <>
            <div className="drawer-hd">
              <div className="drawer-title">{opts.title}</div>
              <div className="modal-close" onClick={close}><i className="ti ti-x" /></div>
            </div>
            <div className="drawer-body">{opts.body}</div>
            {opts.footer && <div className="drawer-foot">{opts.footer}</div>}
          </>
        )}
      </div>
    </DrawerCtx.Provider>
  )
}

export function useDrawer(): DrawerApi {
  const ctx = useContext(DrawerCtx)
  if (!ctx) throw new Error('useDrawer must be used within DrawerProvider')
  return ctx
}
