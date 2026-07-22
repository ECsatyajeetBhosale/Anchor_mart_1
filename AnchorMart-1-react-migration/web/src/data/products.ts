// Product reference data shared by the Products / Express / Spares pages and modals.

export const PROD_BRANDS = ['Titan', 'Casio', 'Sennheiser', 'Bose', 'Apple', 'Samsung', 'Dettol', 'Lavazza', 'Nivea', 'Bombay Shaving Co.', 'Amul', 'Tetley']

export const PROD_CATEGORIES: Record<string, string[]> = {
  Electronics: ['Phones', 'Audio', 'Wearables', 'Accessories'],
  Fashion: ['Men', 'Women', 'Footwear', 'Watches'],
  Jewelry: ['Rings', 'Necklaces', 'Earrings', 'Bracelets'],
  Food: ['Beverages', 'Snacks', 'Staples', 'Confectionery'],
  Beauty: ['Skincare', 'Grooming', 'Fragrance'],
  'Marine Emergency': ['Safety', 'Engine', 'Navigation'],
}

export const PROD_CAT_FIELDS: Record<string, string[]> = {
  Jewelry: ['Ring Size', 'Jewelry Material', 'Stone Type', 'Purity', 'Gender', 'Occasion'],
  Fashion: ['Fabric', 'Sleeve Type', 'Fit', 'Pattern'],
  Electronics: ['RAM', 'Storage', 'Battery', 'Processor'],
  Food: ['Expiry Date', 'Ingredients', 'Calories'],
}

export const PROD_COUNTRIES = ['India', 'Singapore', 'China', 'United States', 'United Kingdom', 'Germany', 'Japan', 'UAE', 'Philippines', 'Vietnam']
