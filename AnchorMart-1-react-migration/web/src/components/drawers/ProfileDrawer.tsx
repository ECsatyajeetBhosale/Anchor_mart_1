import { useDrawer } from '../../context/DrawerContext'
import { useToast } from '../../context/ToastContext'
import { avatarFile } from '../../lib/images'

export function ProfileDrawer({ name, role }: { name?: string; role?: string }) {
  const { close } = useDrawer()
  const toast = useToast()

  name = name || ''

  return (
    <>
      <div className="drawer-hd">
        <div className="drawer-title">{name} — Profile</div>
        <div className="modal-close" onClick={close}><i className="ti ti-x" /></div>
      </div>
      <div className="drawer-body">
        <div style={{ textAlign: 'center', paddingBottom: 20, borderBottom: '1px solid var(--border-sm)', marginBottom: 20 }}>
          <div className="av av-xl av-img" style={{ margin: '0 auto 12px' }}><img src={avatarFile(name)} alt={name} /></div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)' }}>{name}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t4)', marginTop: 4 }}>{role === 'partner' ? 'Delivery Partner' : 'Sailor'}</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <span className="badge badge-success">Active</span>
          </div>
        </div>
        <div className="sec-label">Contact</div>
        <div className="detail-kv"><div className="detail-k">Email</div><div className="detail-v">{name.split(' ')[0].toLowerCase()}@anchormart.io</div></div>
        <div className="detail-kv"><div className="detail-k">WhatsApp</div><div className="detail-v">+65 9123 4567</div></div>
        <div className="detail-kv"><div className="detail-k">Joined</div><div className="detail-v">March 2023</div></div>
        <div className="sec-label mt16">Statistics</div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          {role === 'partner'
            ? <div className="mini-stat"><div className="mini-stat-val">124</div><div className="mini-stat-lbl">Deliveries</div></div>
            : <>
                <div className="mini-stat"><div className="mini-stat-val">18</div><div className="mini-stat-lbl">Orders</div></div>
                <div className="mini-stat"><div className="mini-stat-val">$84</div><div className="mini-stat-lbl">Avg Order</div></div>
                <div className="mini-stat"><div className="mini-stat-val">2,450</div><div className="mini-stat-lbl">Loyalty Pts</div></div>
              </>}
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn btn-ghost" onClick={close}>Close</button>
        <button className="btn btn-primary" onClick={() => { close(); toast('Edit profile', '', 'edit') }}><i className="ti ti-edit" />Edit Profile</button>
      </div>
    </>
  )
}
