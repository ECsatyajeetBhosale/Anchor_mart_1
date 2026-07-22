import { useState } from 'react'
import { NotifPanel } from './NotifPanel'
import { useToast } from '../../context/ToastContext'

export function Topbar({ title }: { title: string }) {
  const toast = useToast()
  const [dim, setDim] = useState(false)

  const refresh = () => {
    setDim(true)
    setTimeout(() => { setDim(false); toast('Data refreshed', 'success', 'refresh') }, 600)
  }

  // expose the dim state to the main content via a data attribute on body-less wrapper handled by AppShell
  return (
    <header className="topbar" data-dim={dim ? '1' : '0'}>
      <div className="topbar-title" id="tb-title">{title}</div>
      <NotifPanel />
      <div className="tb-action" title="Refresh data" onClick={refresh}><i className="ti ti-refresh" /></div>
    </header>
  )
}
