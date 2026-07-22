import { useState } from 'react'

export interface SegOption { value: string; label: string }

interface SegmentedProps {
  options: SegOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** Base class for each button — matches the original `.seg-btn` / `.tab-item` / `.pill-btn`. */
  itemClass?: string
  /** Wrapper class — e.g. 'seg', 'tabs', 'pill-group'. */
  wrapClass?: string
}

/** Controlled-or-uncontrolled segmented control, replacing the imperative segClick() helper. */
export function Segmented({
  options, value, defaultValue, onChange, itemClass = 'seg-btn', wrapClass = 'seg',
}: SegmentedProps) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value)
  const active = value ?? internal
  return (
    <div className={wrapClass}>
      {options.map((o) => (
        <button
          key={o.value}
          className={`${itemClass}${active === o.value ? ' active' : ''}`}
          onClick={() => { setInternal(o.value); onChange?.(o.value) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
