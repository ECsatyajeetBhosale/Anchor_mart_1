import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { PROD_BRANDS, PROD_CATEGORIES, PROD_CAT_FIELDS, PROD_COUNTRIES } from '../../data/products'

type Tab = 'pt-basic' | 'pt-media' | 'pt-pricing' | 'pt-shipping' | 'pt-variants'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pt-basic', label: 'Basic Info' },
  { id: 'pt-media', label: 'Media' },
  { id: 'pt-pricing', label: 'Pricing' },
  { id: 'pt-shipping', label: 'Shipping' },
  { id: 'pt-variants', label: 'Variants' },
]

interface OptionRow { id: number; values: string[]; draft: string }
interface VariantRow { id: number }

let _oid = 0
let _vid = 0

export function AddProductModal({ opts }: { opts?: any }) {
  const data = opts || {}
  const { close } = useModal()
  const toast = useToast()
  const isEdit = !!data.name

  const [tab, setTab] = useState<Tab>('pt-basic')
  const [title, setTitle] = useState<string>(data.name || '')
  const [slug, setSlug] = useState<string>(
    data.name
      ? String(data.name).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      : '',
  )
  const [shortLen, setShortLen] = useState(0)
  const [cat, setCat] = useState<string>('')
  const [imgPreviews, setImgPreviews] = useState<string[]>([])
  const [thumbPreview, setThumbPreview] = useState<string>('')
  const [options, setOptions] = useState<OptionRow[]>([{ id: ++_oid, values: [], draft: '' }])
  const [variants, setVariants] = useState<VariantRow[]>([{ id: ++_vid }])

  const slugify = (v: string) =>
    v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')

  const brandOpts = useMemo(() => PROD_BRANDS.map((b) => <option value={b} key={b} />), [])
  const countryOpts = useMemo(() => PROD_COUNTRIES.map((c) => <option value={c} key={c} />), [])

  const catFields = PROD_CAT_FIELDS[cat]

  function readFiles(files: FileList | null, cb: (urls: string[]) => void) {
    if (!files) return
    const imgs = Array.prototype.filter.call(files, (f: File) => f.type && f.type.indexOf('image') === 0) as File[]
    const out: string[] = []
    let pending = imgs.length
    if (!pending) return
    imgs.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        out.push(String(e.target?.result || ''))
        if (--pending === 0) cb(out)
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <Modal
      title={isEdit ? 'Edit Product' : 'Add New Product'}
      icon="box-seam"
      iconBg="var(--teal-50)"
      iconColor="var(--teal-600)"
      size="xl"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => {
            close()
            toast('Product saved', 'success', 'check')
          }}
        >
          <i className="ti ti-check" />
          {isEdit ? 'Save Changes' : 'Add Product'}
        </button>
      }
    >
      <div className="tab-row" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`tab-item${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* ── Basic Info ── */}
      <div className="prod-tab" style={{ display: tab === 'pt-basic' ? '' : 'none' }}>
        <div className="sec-label">Product Details</div>
        <div className="form-row">
          <div className="fg">
            <label className="fg-label">Product Title *</label>
            <input
              className="form-input"
              placeholder="Enter product name"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)) }}
            />
          </div>
          <div className="fg">
            <label className="fg-label">Product Subtitle</label>
            <input className="form-input" placeholder="Short product tagline" />
          </div>
        </div>
        <div className="fg">
          <label className="fg-label">Product Slug / URL Handle</label>
          <input
            className="form-input mono"
            placeholder="auto-generated-from-title"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <div className="fg-hint">Auto-generated from the title — editable</div>
        </div>
        <div className="fg">
          <label className="fg-label">Product Description</label>
          <div className="rt-toolbar">
            <button type="button" className="rt-btn" title="Bold"><i className="ti ti-bold" /></button>
            <button type="button" className="rt-btn" title="Italic"><i className="ti ti-italic" /></button>
            <button type="button" className="rt-btn" title="Underline"><i className="ti ti-underline" /></button>
            <button type="button" className="rt-btn" title="Heading"><i className="ti ti-heading" /></button>
            <button type="button" className="rt-btn" title="Bullet list"><i className="ti ti-list" /></button>
            <button type="button" className="rt-btn" title="Numbered list"><i className="ti ti-list-numbers" /></button>
            <button type="button" className="rt-btn" title="Link"><i className="ti ti-link" /></button>
            <button type="button" className="rt-btn" title="Image"><i className="ti ti-photo" /></button>
            <button type="button" className="rt-btn" title="Table"><i className="ti ti-table" /></button>
            <button type="button" className="rt-btn" title="Code block"><i className="ti ti-code" /></button>
          </div>
          <div className="rt-editor" contentEditable suppressContentEditableWarning>{data.desc || ''}</div>
        </div>
        <div className="fg">
          <label className="fg-label">Short Description</label>
          <textarea
            className="form-input"
            maxLength={250}
            placeholder="Brief summary (max 250 characters)"
            style={{ height: 64 }}
            onChange={(e) => setShortLen(e.target.value.length)}
          />
          <div className="fg-hint"><span>{shortLen}</span>/250 characters</div>
        </div>
        <div className="form-row triple">
          <div className="fg">
            <label className="fg-label">Brand</label>
            <input className="form-input" list="pp-brands" placeholder="Search or add brand…" autoComplete="off" />
            <datalist id="pp-brands">{brandOpts}</datalist>
          </div>
          <div className="fg">
            <label className="fg-label">Product Type / Category</label>
            <select className="form-select" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Select category…</option>
              {Object.keys(PROD_CATEGORIES).map((g) => (
                <optgroup label={g} key={g}>
                  {PROD_CATEGORIES[g].map((s) => (
                    <option value={g} key={g + s}>{g} › {s}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="fg">
            <label className="fg-label">Status</label>
            <select className="form-select" defaultValue={isEdit ? 'Draft' : 'Active'}>
              <option>Draft</option>
              <option>Active</option>
              <option>Archived</option>
            </select>
          </div>
        </div>

        {catFields && (
          <div>
            <div className="sec-label mt8">{cat} Attributes</div>
            <div className="form-row triple">
              {catFields.map((f) => (
                <div className="fg" key={f}>
                  <label className="fg-label">{f}</label>
                  <input className="form-input" placeholder={f} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!data.fromExpress && (
          <>
            <div className="sec-label mt20">Visibility &amp; Flags</div>
            <div className="form-row" style={{ marginBottom: 14 }}>
              <label className="switch">
                <input type="checkbox" defaultChecked={data.sailors !== false} />
                <div className="switch-track" /><span className="switch-label">Available to Sailors</span>
              </label>
              <label className="switch">
                <input type="checkbox" defaultChecked={!!data.deal} />
                <div className="switch-track" /><span className="switch-label">Deal Product</span>
              </label>
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="switch">
                <input type="checkbox" defaultChecked={!!data.express} />
                <div className="switch-track" /><span className="switch-label">Express Item</span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* ── Media ── */}
      <div className="prod-tab" style={{ display: tab === 'pt-media' ? '' : 'none' }}>
        <div className="sec-label">Product Media</div>
        <div className="fg">
          <label className="fg-label">Product Images</label>
          <input
            type="file"
            id="pp-imgs-input"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => readFiles(e.target.files, (urls) => setImgPreviews((p) => [...p, ...urls]))}
          />
          <div
            className="upload-area"
            onClick={() => document.getElementById('pp-imgs-input')?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag') }}
            onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('drag')
              readFiles(e.dataTransfer.files, (urls) => setImgPreviews((p) => [...p, ...urls]))
            }}
          >
            <i className="ti ti-cloud-upload" style={{ fontSize: 28, display: 'block', marginBottom: 6 }} />
            Drag &amp; drop images here, or click to upload
            <div className="fg-hint" style={{ marginTop: 4 }}>JPG · PNG · WEBP · AVIF — multiple allowed</div>
          </div>
          <div className="img-prev-grid">
            {imgPreviews.map((src, i) => (
              <div className="img-prev" key={i}>
                <img src={src} alt="" />
                <button type="button" onClick={() => setImgPreviews((p) => p.filter((_, j) => j !== i))}>
                  <i className="ti ti-x" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="fg">
          <label className="fg-label">Thumbnail Image</label>
          <input
            type="file"
            id="pp-thumb-input"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => readFiles(e.target.files, (urls) => setThumbPreview(urls[0] || ''))}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {thumbPreview && (
              <div className="img-prev" style={{ display: 'block' }}>
                <img src={thumbPreview} alt="" />
              </div>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => document.getElementById('pp-thumb-input')?.click()}
            >
              <i className="ti ti-photo" />Pick Thumbnail
            </button>
          </div>
        </div>
      </div>

      {/* ── Pricing ── */}
      <div className="prod-tab" style={{ display: tab === 'pt-pricing' ? '' : 'none' }}>
        <div className="sec-label">Pricing</div>
        <div className="form-row">
          <div className="fg">
            <label className="fg-label">Selling Price *</label>
            <input className="form-input" type="number" placeholder="0.00" defaultValue={data.price || ''} />
          </div>
          <div className="fg">
            <label className="fg-label">Currency</label>
            <select className="form-select">
              <option>USD ($)</option>
              <option>SGD (S$)</option>
              <option>EUR (€)</option>
              <option>INR (₹)</option>
              <option>GBP (£)</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="fg">
            <label className="fg-label">Tax Class</label>
            <select className="form-select">
              <option>Standard</option>
              <option>Reduced</option>
              <option>Zero-rated</option>
              <option>Exempt</option>
            </select>
          </div>
          <div className="fg">
            <label className="fg-label">Unit Price</label>
            <input className="form-input" placeholder="e.g. $2.00 / 100ml" />
          </div>
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <div className="switch-track" /><span className="switch-label">Taxable</span>
          </label>
        </div>
      </div>

      {/* ── Shipping ── */}
      <div className="prod-tab" style={{ display: tab === 'pt-shipping' ? '' : 'none' }}>
        <div className="sec-label">Shipping &amp; Delivery</div>
        <div className="form-row" style={{ marginBottom: 14 }}>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <div className="switch-track" /><span className="switch-label">Physical Product</span>
          </label>
          <label className="switch">
            <input type="checkbox" />
            <div className="switch-track" /><span className="switch-label">Free Shipping</span>
          </label>
        </div>
        <div className="form-row triple">
          <div className="fg">
            <label className="fg-label">Weight</label>
            <input className="form-input" type="number" placeholder="0" />
          </div>
          <div className="fg">
            <label className="fg-label">Weight Unit</label>
            <select className="form-select">
              <option>kg</option>
              <option>g</option>
              <option>lb</option>
              <option>oz</option>
            </select>
          </div>
          <div className="fg">
            <label className="fg-label">Package Type</label>
            <select className="form-select">
              <option>Box</option>
              <option>Envelope</option>
              <option>Pallet</option>
              <option>Custom</option>
            </select>
          </div>
        </div>
        <div className="fg">
          <label className="fg-label">Dimensions (L × W × H, cm)</label>
          <div className="form-row triple">
            <input className="form-input" type="number" placeholder="Length" />
            <input className="form-input" type="number" placeholder="Width" />
            <input className="form-input" type="number" placeholder="Height" />
          </div>
        </div>
        <div className="form-row">
          <div className="fg">
            <label className="fg-label">Shipping Class</label>
            <select className="form-select">
              <option>Standard</option>
              <option>Heavy</option>
              <option>Fragile</option>
              <option>Hazardous</option>
            </select>
          </div>
          <div className="fg">
            <label className="fg-label">Country of Origin</label>
            <input className="form-input" list="pp-countries" placeholder="Search country…" autoComplete="off" />
            <datalist id="pp-countries">{countryOpts}</datalist>
          </div>
        </div>
      </div>

      {/* ── Variants ── */}
      <div className="prod-tab" style={{ display: tab === 'pt-variants' ? '' : 'none' }}>
        <div className="sec-label">Product Options</div>
        <div>
          {options.map((opt) => (
            <div className="opt-row" key={opt.id}>
              <div className="fg" style={{ width: 190 }}>
                <label className="fg-label">Option Name</label>
                <select className="form-select">
                  <option>Size</option>
                  <option>Color</option>
                  <option>Material</option>
                  <option>Storage</option>
                  <option>RAM</option>
                  <option>Weight</option>
                  <option>Pack Size</option>
                  <option>Flavor</option>
                  <option>Fabric</option>
                  <option>Gender</option>
                  <option>Ring Size</option>
                  <option>Custom Option</option>
                </select>
              </div>
              <div className="fg" style={{ flex: 1 }}>
                <label className="fg-label">Option Values</label>
                <div className="tag-input-wrap">
                  {opt.values.map((v, i) => (
                    <span className="tag-chip" key={i}>
                      {v}
                      <i
                        className="ti ti-x"
                        onClick={() => setOptions((rows) => rows.map((r) =>
                          r.id === opt.id ? { ...r, values: r.values.filter((_, j) => j !== i) } : r))}
                      />
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Type a value, press Enter"
                    value={opt.draft}
                    onChange={(e) => setOptions((rows) => rows.map((r) =>
                      r.id === opt.id ? { ...r, draft: e.target.value } : r))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const v = opt.draft.trim()
                        if (!v) return
                        setOptions((rows) => rows.map((r) =>
                          r.id === opt.id ? { ...r, values: [...r.values, v], draft: '' } : r))
                      }
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                style={{ marginTop: 25 }}
                onClick={() => setOptions((rows) => rows.filter((r) => r.id !== opt.id))}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setOptions((rows) => [...rows, { id: ++_oid, values: [], draft: '' }])}
        >
          <i className="ti ti-plus" />Add Option
        </button>
        <div className="sec-label mt20">Variants</div>
        <div className="var-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Image</th><th>Variant</th><th>SKU</th><th>Barcode</th><th>Price</th>
                <th>Compare</th><th>Cost</th><th>Qty</th><th>Weight</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id}>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Variant image"
                      onClick={() => toast('Upload a variant image', '', 'photo')}
                    >
                      <i className="ti ti-photo" />
                    </button>
                  </td>
                  <td><input className="form-input" placeholder="e.g. Red / L" style={{ width: 120 }} /></td>
                  <td><input className="form-input" placeholder="SKU" style={{ width: 100 }} /></td>
                  <td><input className="form-input" placeholder="Barcode" style={{ width: 110 }} /></td>
                  <td><input className="form-input" type="number" placeholder="0.00" style={{ width: 80 }} /></td>
                  <td><input className="form-input" type="number" placeholder="0.00" style={{ width: 80 }} /></td>
                  <td><input className="form-input" type="number" placeholder="0.00" style={{ width: 80 }} /></td>
                  <td><input className="form-input" type="number" placeholder="0" style={{ width: 64 }} /></td>
                  <td><input className="form-input" type="number" placeholder="0" style={{ width: 64 }} /></td>
                  <td>
                    <select className="form-select" style={{ width: 98 }}>
                      <option>Active</option>
                      <option>Draft</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm btn-icon"
                      onClick={() => setVariants((rows) => rows.filter((r) => r.id !== v.id))}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm mt12"
          onClick={() => setVariants((rows) => [...rows, { id: ++_vid }])}
        >
          <i className="ti ti-plus" />Add Variant
        </button>
      </div>
    </Modal>
  )
}
