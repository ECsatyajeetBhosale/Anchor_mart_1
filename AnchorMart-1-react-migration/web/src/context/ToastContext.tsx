import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { ToastType } from '../types'

interface ToastItem { id: number; msg: string; type: ToastType; icon: string }
type ToastFn = (msg: string, type?: ToastType, icon?: string) => void

const ToastCtx = createContext<ToastFn | null>(null)

const DEFAULT_ICON: Record<string, string> = {
  success: 'check-circle',
  danger: 'alert-circle',
  warning: 'alert-triangle',
}

let _id = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback<ToastFn>((msg, type = '', icon) => {
    const id = ++_id
    const ic = icon || DEFAULT_ICON[type] || 'info-circle'
    setToasts((t) => [...t, { id, msg, type, icon: ic }])
    setTimeout(() => remove(id), 3500)
  }, [remove])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container" id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
            <i className={`ti ti-${t.icon}`} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
