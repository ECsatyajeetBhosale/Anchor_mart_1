import { useState } from 'react'
import { ProductThumb } from '../lib/images'
import { useToast } from '../context/ToastContext'
import { useModal } from '../context/ModalContext'
import { useUi } from '../components/modals/useUi'
import { PROD_CATEGORIES } from '../data/products'

interface Prod {
  ic: string
  n: string
  d: string
  c: string
  p: string
  sk: number
  so: string
  r: number
  f: boolean
  s: string
  sc: string
}

const prods: Prod[] = [
  { ic: 'ti-device-speaker', n: 'Echo Dot 5th Gen', d: 'Smart speaker with Alexa', c: 'Electronics', p: '$39.99', sk: 124, so: '1,284+', r: 4.7, f: true, s: 'Active', sc: 'success' },
  { ic: 'ti-watch', n: 'Titan Quartz Analog Watch', d: 'Car wheel multicolour dial', c: 'Accessories', p: '$75.00', sk: 38, so: '100+', r: 4.5, f: true, s: 'Active', sc: 'success' },
  { ic: 'ti-cup', n: 'Lavazza IL Mattino Coffee', d: 'Ground coffee powder', c: 'Beverages', p: '$11.30', sk: 210, so: '547+', r: 4.8, f: false, s: 'Active', sc: 'success' },
  { ic: 'ti-droplet', n: 'Aquaminder Water Bottle', d: '770ml smart water bottle', c: 'Fitness', p: '$13.77', sk: 0, so: '100+', r: 4.3, f: false, s: 'Out of Stock', sc: 'danger' },
  { ic: 'ti-shoe', n: 'KILLER Trendy Running Shoes', d: 'For Men', c: 'Fashion', p: '$67.00', sk: 14, so: '50+', r: 4.6, f: true, s: 'Low Stock', sc: 'warning' },
  { ic: 'ti-tool', n: 'Bombay Shaving Kit 5 Piece', d: 'Complete grooming kit', c: 'Beauty', p: '$18.00', sk: 56, so: '200+', r: 4.4, f: false, s: 'Active', sc: 'success' },
]

type Cats = Record<string, string[]>

export function Products() {
  const toast = useToast()
  const { confirm } = useModal()
  const ui = useUi()

  const [pane, setPane] = useState<'products' | 'cat'>('products')
  const [activeTab, setActiveTab] = useState(0)

  const [prodCat, setProdCat] = useState('All')
  const [prodStatus, setProdStatus] = useState('All')
  const [prodQuery, setProdQuery] = useState('')

  // Category management store (seeded from shared PROD_CATEGORIES).
  const [cats, setCats] = useState<Cats>(() => {
    const copy: Cats = {}
    for (const k of Object.keys(PROD_CATEGORIES)) copy[k] = [...PROD_CATEGORIES[k]]
    return copy
  })
  const [newCat, setNewCat] = useState('')
  const [subParent, setSubParent] = useState(Object.keys(PROD_CATEGORIES)[0] || '')
  const [newSub, setNewSub] = useState('')

  const catNames = Object.keys(cats)

  const list = prods.filter((p) => {
    const okC = prodCat === 'All' || p.c === prodCat
    const okS = prodStatus === 'All' || p.s === prodStatus
    const okQ = !prodQuery || (p.n + ' ' + p.d + ' ' + p.c).toLowerCase().indexOf(prodQuery) >= 0
    return okC && okS && okQ
  })

  const editProduct = (p: Prod) =>
    ui.addProduct({ name: p.n, desc: p.d, price: p.p.replace('$', ''), stock: String(p.sk), featured: p.f })

  const delProduct = (p: Prod) =>
    confirm({ title: 'Remove Product', msg: `Remove "${p.n}"? Cannot be undone.`, danger: true, confirmText: 'Remove' }, () => toast('Product removed', 'danger', 'trash'))

  const addCategory = () => {
    const v = newCat.trim()
    if (!v) { toast('Enter a category name', 'warning'); return }
    if (catNames.some((c) => c.toLowerCase() === v.toLowerCase())) { toast('Category already exists', 'warning'); return }
    setCats((prev) => ({ ...prev, [v]: [] }))
    setNewCat('')
    toast(`Category "${v}" added`, 'success', 'plus')
  }

  const addSubcategory = () => {
    const parent = subParent
    const v = newSub.trim()
    if (!cats[parent]) { toast('Add a category first', 'warning'); return }
    if (!v) { toast('Enter a subcategory name', 'warning'); return }
    if (cats[parent].some((s) => s.toLowerCase() === v.toLowerCase())) { toast('Subcategory already exists', 'warning'); return }
    setCats((prev) => ({ ...prev, [parent]: [...prev[parent], v] }))
    setNewSub('')
    toast(`Subcategory "${v}" added to ${parent}`, 'success', 'plus')
  }

  const delCategory = (name: string) =>
    confirm({ title: 'Remove Category', msg: `Remove "${name}" and its subcategories?`, danger: true, confirmText: 'Remove' }, () => {
      setCats((prev) => { const next = { ...prev }; delete next[name]; return next })
      if (prodCat === name) setProdCat('All')
      if (subParent === name) setSubParent(Object.keys(cats).filter((c) => c !== name)[0] || '')
      toast('Category removed', 'danger', 'trash')
    })

  const delSub = (name: string, si: number) => {
    setCats((prev) => ({ ...prev, [name]: prev[name].filter((_, i) => i !== si) }))
    toast('Subcategory removed', '', 'trash')
  }

  const tabs = ['All Products', 'Deal Products', 'Special Requests']

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l"><h1 className="pg-title">Products &amp; Catalog</h1><p className="pg-sub"><span>1,284 products</span></p></div>
        <div className="pg-actions">
          <div className="input-wrap"><i className="ti ti-search pre" /><input type="text" className="form-input has-icon" placeholder="Search products…" style={{ width: '200px' }} onInput={(e) => setProdQuery(e.currentTarget.value.toLowerCase().trim())} /></div>
          <select className="form-select" id="prod-cat-filter" value={prodCat === 'All' ? 'All Categories' : prodCat} onChange={(e) => setProdCat(e.currentTarget.value === 'All Categories' ? 'All' : e.currentTarget.value)}>
            <option>All Categories</option>
            {catNames.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="form-select" onChange={(e) => setProdStatus(e.currentTarget.value === 'All Status' ? 'All' : e.currentTarget.value)}>
            <option>All Status</option><option>In Stock</option><option>Out of Stock</option><option>Low Stock</option>
          </select>
          <button className="btn btn-primary" onClick={() => ui.addProduct()}><i className="ti ti-plus" />Add Product</button>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-card sc-navy"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Total Products</div><div className="stat-icon"><i className="ti ti-box-seam" /></div></div><div className="stat-val">1,284</div><div className="stat-foot"><span>12 categories</span></div></div>
        <div className="stat-card sc-teal"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Total Categories</div><div className="stat-icon"><i className="ti ti-category" /></div></div><div className="stat-val">12</div><div className="stat-foot"><span>Across catalog</span></div></div>
        <div className="stat-card sc-amber"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Featured / Deals</div><div className="stat-icon"><i className="ti ti-star" /></div></div><div className="stat-val">48</div><div className="stat-foot"><span>Active promotions</span></div></div>
        <div className="stat-card sc-green"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Express Products</div><div className="stat-icon"><i className="ti ti-bolt" /></div></div><div className="stat-val">124</div><div className="stat-foot"><span>Fast-delivery items</span></div></div>
        <div className="stat-card sc-red"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Marine Emergency Spares</div><div className="stat-icon"><i className="ti ti-engine" /></div></div><div className="stat-val">86</div><div className="stat-foot"><span>Critical spare parts</span></div></div>
      </div>
      <div className="tab-row">
        {tabs.map((t, i) => (
          <div key={t} className={`tab-item${pane === 'products' && activeTab === i ? ' active' : ''}`} onClick={() => { setPane('products'); setActiveTab(i) }}>{t}</div>
        ))}
        <div className={`tab-item${pane === 'cat' ? ' active' : ''}`} onClick={() => setPane('cat')}><i className="ti ti-category" />Categories</div>
      </div>
      <div id="pane-products" style={{ display: pane === 'cat' ? 'none' : undefined }}>
        <div className="card" id="products-table">
          <div className="tbl-wrap"><table>
            <thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Featured</th><th>Actions</th></tr></thead>
            <tbody>
              {list.length ? list.map((p) => (
                <tr className="tr-click" key={p.n} onClick={() => editProduct(p)}>
                  <td><ProductThumb keyword={p.c} /></td>
                  <td><div className="flex aic g8"><ProductThumb keyword={p.n} cls="sm" /><div><div className="td-p">{p.n}</div><div className="td-m">{p.d}</div></div></div></td>
                  <td><span className="badge badge-navy">{p.c}</span></td>
                  <td className="td-p w7">{p.p}</td>
                  <td>{p.f ? <span className="badge badge-amber"><i className="ti ti-star" />Yes</span> : <span className="td-m">—</span>}</td>
                  <td><div className="td-acts">
                    <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); editProduct(p) }}><i className="ti ti-edit" /></button>
                    <button className="btn btn-danger btn-sm btn-icon" title="Remove" onClick={(e) => { e.stopPropagation(); delProduct(p) }}><i className="ti ti-trash" /></button>
                  </div></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="td-m" style={{ textAlign: 'center', padding: '28px' }}>No products match this filter.</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </div>
      <div id="pane-cat" style={{ display: pane === 'cat' ? undefined : 'none' }}>
        <div className="card">
          <div className="card-hd"><div className="card-ttl"><i className="ti ti-category" />Manage Categories &amp; Subcategories</div></div>
          <div style={{ padding: '20px' }}>
            <div className="form-row" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
              <div className="fg" style={{ margin: 0 }}><label className="fg-label">New Category</label><input className="form-input" id="new-cat" placeholder="e.g. Electronics" value={newCat} onChange={(e) => setNewCat(e.currentTarget.value)} /></div>
              <div className="fg" style={{ margin: 0 }}><button className="btn btn-primary" id="add-cat-btn" onClick={addCategory}><i className="ti ti-plus" />Add Category</button></div>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr auto', alignItems: 'end' }}>
              <div className="fg" style={{ margin: 0 }}><label className="fg-label">Parent Category</label>
                <select className="form-select" id="sub-parent" value={subParent} onChange={(e) => setSubParent(e.currentTarget.value)}>
                  {catNames.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="fg" style={{ margin: 0 }}><label className="fg-label">New Subcategory</label><input className="form-input" id="new-sub" placeholder="e.g. Wearables" value={newSub} onChange={(e) => setNewSub(e.currentTarget.value)} /></div>
              <div className="fg" style={{ margin: 0 }}><button className="btn btn-secondary" id="add-sub-btn" onClick={addSubcategory}><i className="ti ti-plus" />Add Subcategory</button></div>
            </div>
            <div className="sec-label" style={{ marginTop: '6px' }}>Existing Categories</div>
            <div id="cat-list">
              <div className="tbl-wrap"><table>
                <thead><tr><th>Category</th><th style={{ textAlign: 'center' }}>Subcategories</th><th>Subcategory List</th><th>Actions</th></tr></thead>
                <tbody>
                  {catNames.map((name) => {
                    const subs = cats[name]
                    return (
                      <tr key={name}>
                        <td><span className="badge badge-navy">{name}</span></td>
                        <td className="td-p w7" style={{ textAlign: 'center' }}>{subs.length}</td>
                        <td>
                          {subs.length ? (
                            <div className="flex" style={{ flexWrap: 'wrap', gap: '6px' }}>
                              {subs.map((s, si) => (
                                <span className="tag" key={s + si}>{s} <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '11px', color: 'var(--danger-text)' }} onClick={() => delSub(name, si)} /></span>
                              ))}
                            </div>
                          ) : (
                            <span className="td-m" style={{ fontSize: '12px' }}>No subcategories yet</span>
                          )}
                        </td>
                        <td><div className="td-acts"><button className="btn btn-danger btn-sm btn-icon" title="Remove category" onClick={() => delCategory(name)}><i className="ti ti-trash" /></button></div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
