import { useState } from 'react'
import { Avatar } from '../lib/images'
import { useUi } from '../components/modals/useUi'
import { useToast } from '../context/ToastContext'

interface RoleDef { label: string; badge: string; icon: string; av: string }
interface Thread { n: string; id: string; role: 'partner' | 'sailor'; status: string; l: string; tm: string; on: boolean; un: number }
interface Msg { f: string; t: string }

const ROLE: Record<'partner' | 'sailor', RoleDef> = {
  partner: { label: 'Delivery Partner', badge: 'badge-teal', icon: 'ti-motorbike', av: 'av-teal' },
  sailor: { label: 'Sailor', badge: 'badge-purple', icon: 'ti-anchor', av: 'av-purple' },
}

const threads: Thread[] = [
  { n: 'Rahul Singh', id: 'DP-00124', role: 'partner', status: 'On duty · ENQ-0042 delivering', l: 'All 3 items collected. Heading now', tm: '2m', on: true, un: 0 },
  { n: 'Pita Havili', id: 'DP-00087', role: 'partner', status: 'On duty · 2 active orders', l: 'All items confirmed at shop', tm: '8m', on: true, un: 2 },
  { n: 'Marco Reyes', id: 'DP-00201', role: 'partner', status: 'On duty · en route Berth 14-B', l: 'Heading to Berth 14-B now', tm: '15m', on: true, un: 0 },
  { n: 'Lois Becket', id: 'SLR-0012', role: 'sailor', status: 'MSC Marvela · Berth 7', l: 'When will my order arrive?', tm: '5m', on: true, un: 1 },
  { n: 'Ali Mahmoud', id: 'SLR-0048', role: 'sailor', status: 'APL Vanda · PSA', l: 'Thanks for the quick help!', tm: '26m', on: false, un: 0 },
  { n: 'Sara Chen', id: 'SLR-0093', role: 'sailor', status: 'OOCL Tokyo · Anchorage 2', l: 'Can I add one more item?', tm: '1h', on: false, un: 0 },
]

const convos: Record<'partner' | 'sailor', Msg[]> = {
  partner: [
    { f: 'admin', t: 'Green signal is live for ENQ-0042. 3 items from Port Marine Supplies, PSA. Deliver to Berth 7.' },
    { f: 'partner', t: 'Confirmed. Leaving for the store now.' },
    { f: 'admin', t: 'Verify the hose spec (JIC fittings) before accepting — do NOT substitute without checking.' },
    { f: 'partner', t: 'At the store. All 3 items collected and confirmed.' },
    { f: 'admin', t: 'Perfect. Mark collected in the app and ping me at the berth.' },
  ],
  sailor: [
    { f: 'admin', t: 'Hi! Your order #AM2458 has been confirmed and is being prepared.' },
    { f: 'sailor', t: 'Great, thank you. When will it arrive?' },
    { f: 'admin', t: 'Your delivery partner is on the way — ETA around 12:30 PM at Berth 7.' },
    { f: 'sailor', t: 'Perfect, I will be available there.' },
  ],
}

const SECTIONS: { title: string; role: 'partner' | 'sailor' }[] = [
  { title: 'Delivery Partners', role: 'partner' },
  { title: 'Sailors', role: 'sailor' },
]

export function Chat() {
  const ui = useUi()
  const toast = useToast()
  const [activeId, setActiveId] = useState(threads[0].id)
  const ch = threads.find((t) => t.id === activeId) || threads[0]
  const r = ROLE[ch.role]

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l"><h1 className="pg-title">Chat Monitor</h1><p className="pg-sub"><span>Admin, Sailors &amp; Delivery Partners — real-time communication</span></p></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '16px', height: '580px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border-xs)' }}>
            <div className="input-wrap wf"><i className="ti ti-search pre" /><input type="text" className="form-input has-icon wf" placeholder="Search conversations…" style={{ height: '34px' }} /></div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {SECTIONS.map((sec) => (
              <div key={sec.role}>
                <div className="sec-label" style={{ padding: '14px 14px 7px', margin: 0 }}>{sec.title}</div>
                {threads.filter((t) => t.role === sec.role).map((t) => (
                  <div
                    key={t.id}
                    className="chat-thread"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderBottom: '1px solid var(--border-xs)', cursor: 'pointer', background: t.id === activeId ? 'var(--navy-25)' : 'transparent' }}
                    onClick={() => setActiveId(t.id)}
                  >
                    <div style={{ position: 'relative' }}>
                      <Avatar name={t.n} />
                      {t.on && <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '8px', height: '8px', background: 'var(--green-icon)', borderRadius: '50%', border: '2px solid var(--surface)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sm w7 c1 trunc">{t.n}</div>
                      <div className="xs c4 w5 trunc">{t.l}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span className="xs c4 w6">{t.tm}</span>
                      {t.un > 0 && <span className="badge badge-danger" style={{ padding: '1px 5px', fontSize: '10px' }}>{t.un}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border-xs)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar name={ch.n} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex aic g8" style={{ marginBottom: '3px' }}><span className="w7 c1">{ch.n}</span><span className={`badge ${r.badge}`}><i className={`ti ${r.icon}`} />&nbsp;{r.label}</span></div>
              <div className={ch.on ? 'sdot on xs csuccess' : 'xs c4 w6'}>{ch.on ? ch.status : 'Offline'}</div>
            </div>
            <span className="badge badge-neutral mono">{ch.id}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => toast('Chat archived', '', 'archive')}><i className="ti ti-archive" /></button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => ui.profile(ch.n, ch.role)}><i className="ti ti-user" /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {convos[ch.role].map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.f === 'admin' ? 'flex-end' : 'flex-start' }}>
                <div className={`chat-bubble ${m.f === 'admin' ? 'sent' : 'recv'}`}>{m.t}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '13px', borderTop: '1px solid var(--border-xs)', display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => toast('Attachment sent', 'success', 'paperclip')} title="Attach file"><i className="ti ti-paperclip" /></button>
            <input type="text" id="chat-input" className="form-input" style={{ flex: 1, height: '40px' }} placeholder="Type a message…" />
            <button className="btn btn-primary btn-icon" style={{ height: '40px', width: '40px' }} onClick={() => toast('Message sent', 'success', 'send')}><i className="ti ti-send" /></button>
          </div>
        </div>
      </div>
    </>
  )
}
