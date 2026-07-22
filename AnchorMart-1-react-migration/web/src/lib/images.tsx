// Offline image helpers — ported 1:1 from index.html (prodImgFile / avatarFile / personImg).
// All images are bundled SVGs served from /public/assets/img. No external CDN loaders.

/** Prefix a public-asset path with Vite's base URL so it resolves under GitHub Pages too. */
export const asset = (p: string): string => import.meta.env.BASE_URL + p.replace(/^\//, '')

/** Pick a bundled product image (assets/img/) based on a category or product-name keyword. */
export function prodImgFile(key: string): string {
  key = (key || '').toLowerCase()
  if (/headphone|earbud|earphone|speaker|audio|sennheiser|bose|echo buds|sound/.test(key)) return 'product-audio'
  if (/watch|titan|casio|g-shock|timepiece/.test(key)) return 'product-watch'
  if (/shav|skincare|cosrx|grooming|beauty|fragrance|dettol|colgate|nivea|lotion|cream|soap|toothp/.test(key)) return 'product-beauty'
  if (/snack|lay|chips|biscuit|protein bar|crisp|namkeen|cookie/.test(key)) return 'product-snack'
  if (/electron|phone|tablet|power bank|charger|device|echo dot|alexa|wearable|cable|gadget|fitness/.test(key)) return 'product-electronics'
  if (/food|beverage|coffee|water|milk|tea|drink|bisleri|amul|lavazza|tetley|grocer|bottle|chocolate/.test(key)) return 'product-food'
  if (/fashion|apparel|shoe|footwear|cloth|jacket|killer|men|women|jewel/.test(key)) return 'product-apparel'
  if (/marine|safety|engine|navigation|fire|signal|medical|deck|spare|emergency|flare|life|bilge|pump|filter|beacon|epirb|extinguisher/.test(key)) return 'product-marine'
  return 'product-generic'
}

export const prodImgSrc = (key: string): string => asset(`assets/img/${prodImgFile(key)}.svg`)

/** Product thumbnail frame (grey) shown wherever a product is listed. */
export function ProductThumb({ keyword, cls }: { keyword: string; cls?: string }) {
  return (
    <div className={`prod-thumb ${cls || ''}`}>
      <img src={prodImgSrc(keyword)} alt="product" loading="lazy" />
    </div>
  )
}

const AVATAR_COUNT = 6
function personHash(name: string): number {
  name = name || ''
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h
}
/** Deterministic profile picture per person name (renders offline from assets/img/avatar-N.svg). */
export const avatarFile = (name: string): string =>
  asset(`assets/img/avatar-${(personHash(name) % AVATAR_COUNT) + 1}.svg`)

/** Avatar image beside a person's name. */
export function Avatar({ name, cls }: { name: string; cls?: string }) {
  return (
    <div className={`av av-img ${cls || ''}`}>
      <img src={avatarFile(name)} alt={name || ''} loading="lazy" />
    </div>
  )
}

/** Delivery proof photo (uploaded by the delivery partner from the mobile app). */
export const DELIVERY_PROOF_IMG = asset('assets/img/delivery-proof.svg')
