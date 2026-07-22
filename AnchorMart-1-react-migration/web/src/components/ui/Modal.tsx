import type { ReactNode } from 'react'
import { useModal } from '../../context/ModalContext'
import type { ModalSize } from '../../types'

interface ModalProps {
  title: ReactNode
  sub?: ReactNode
  icon?: string
  iconBg?: string
  iconColor?: string
  size?: ModalSize
  /** Footer buttons. The shared Cancel button is prepended unless cancelText is false. */
  footer?: ReactNode
  cancelText?: string | false
  /** Pass false to omit the whole footer row. */
  showFooter?: boolean
  children: ReactNode
}

/** Modal chrome — mirrors showModal(opts). Wrap a modal component's content in this. */
export function Modal({
  title, sub, icon, iconBg = 'var(--navy-50)', iconColor = 'var(--navy-600)',
  size, footer, cancelText = 'Cancel', showFooter = true, children,
}: ModalProps) {
  const { close } = useModal()
  return (
    <div className={`modal${size ? ' ' + size : ''}`}>
      <div className="modal-hd">
        {icon && (
          <div className="modal-icon" style={{ background: iconBg, color: iconColor }}>
            <i className={`ti ti-${icon}`} />
          </div>
        )}
        <div className="f1">
          <div className="modal-title">{title}</div>
          {sub && <div className="modal-sub">{sub}</div>}
        </div>
        <div className="modal-close" onClick={close}><i className="ti ti-x" /></div>
      </div>
      <div className="modal-body">{children}</div>
      {showFooter && (
        <div className="modal-foot">
          {cancelText !== false && (
            <button className="btn btn-ghost btn-cancel" onClick={close}>{cancelText}</button>
          )}
          {footer}
        </div>
      )}
    </div>
  )
}
