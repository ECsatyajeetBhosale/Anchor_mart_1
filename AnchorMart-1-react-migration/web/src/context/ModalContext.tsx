import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ConfirmOpts {
  title: string
  msg?: string
  icon?: string
  iconColor?: string
  iconBg?: string
  danger?: boolean
  confirmText?: string
}

interface ModalApi {
  /** Push a modal node onto the stack (mirrors showModal). */
  open: (node: ReactNode) => void
  /** Pop the top modal (mirrors closeModal). */
  close: () => void
  closeAll: () => void
  /** Confirmation dialog (mirrors showConfirm). */
  confirm: (opts: ConfirmOpts, onConfirm?: () => void) => void
}

const ModalCtx = createContext<ModalApi | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ReactNode[]>([])

  const open = useCallback((node: ReactNode) => setStack((s) => [...s, node]), [])
  const close = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const closeAll = useCallback(() => setStack([]), [])

  const confirm = useCallback((opts: ConfirmOpts, onConfirm?: () => void) => {
    const iconColor = opts.danger ? 'var(--danger-icon)' : (opts.iconColor || 'var(--amber-500)')
    const iconBg = opts.danger ? 'var(--danger-bg)' : (opts.iconBg || 'var(--amber-50)')
    open(
      <ConfirmBox
        opts={opts}
        iconColor={iconColor}
        iconBg={iconBg}
        onClose={close}
        onOk={() => { close(); onConfirm?.() }}
      />,
    )
  }, [open, close])

  const top = stack[stack.length - 1]
  const shown = stack.length > 0

  return (
    <ModalCtx.Provider value={{ open, close, closeAll, confirm }}>
      {children}
      <div
        className={`overlay${shown ? ' show' : ''}`}
        id="modal-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) close() }}
      >
        <div className="modal-inner">{top}</div>
      </div>
    </ModalCtx.Provider>
  )
}

function ConfirmBox({ opts, iconColor, iconBg, onClose, onOk }: {
  opts: ConfirmOpts
  iconColor: string
  iconBg: string
  onClose: () => void
  onOk: () => void
}) {
  return (
    <div className="confirm-box">
      <div className="confirm-icon" style={{ background: iconBg, color: iconColor }}>
        <i className={`ti ti-${opts.icon || 'alert-triangle'}`} />
      </div>
      <div className="confirm-title">{opts.title}</div>
      <div className="confirm-msg" dangerouslySetInnerHTML={{ __html: opts.msg || '' }} />
      <div className="confirm-btns">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={`btn ${opts.danger ? 'btn-danger' : 'btn-primary'}`} onClick={onOk}>
          {opts.confirmText || 'Confirm'}
        </button>
      </div>
    </div>
  )
}

export function useModal(): ModalApi {
  const ctx = useContext(ModalCtx)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}
