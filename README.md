# Naturalife Bali — Scannable Retail Catalog

Responsive multilingual retail catalog for Naturalife Bali.

## Confirmed workflow
- Retail catalog in English, Bahasa Indonesia, and Russian.
- Live product catalog reads active products from Supabase.
- Product quantities are limited by the displayed stock quantity.
- Customer submits contact details, delivery address, preferred courier, and payment preference.
- Server-side order function calculates prices from the database.
- Shipping is manually quoted by admin.
- Admin reviews stock and shipping, then sends final invoice and payment details via WhatsApp.
- New orders are sent to the configured Telegram chat by a Supabase Edge Function.
- Inventory is manually maintained by admin.

## Stack
Static storefront, Supabase database and Storage, Supabase Edge Function, and Vercel hosting.

## Security
Never expose Supabase service-role keys or Telegram bot tokens in browser code. Store them as Edge Function secrets. Public storefront access is limited to reading active catalog rows. Order submission is handled by the Edge Function.

## Supabase
Project: Naturalife Bali Store  
Project ID: fvxbssqitctrdmxysiqb  
Edge Function: `submit-store-order`

## Deployment
The repository must be connected to Vercel (or another static host) before the updated storefront is publicly available. The catalog will remain empty until products are inserted into `public.store_catalog`.

## Local preview
Open `index.html` in a browser. A live connection to the Supabase project is required for catalog and checkout functionality.

 
## Visual Website Builder
- Open `/visual-builder.html` from the admin panel's Visual Website Builder link.
- The editor uses the existing Supabase Auth session and the `is_store_admin()` authorization check.
- Drafts are stored in `public.store_homepage_pages` with slug `homepage-draft`.
- Publishing writes the live page to slug `homepage`; the storefront reads only published pages.
- The editor supports hero banners, sections, two-column content, headings, text, images, buttons, feature cards and spacing blocks.
- Sections and columns can contain nested elements; select a section before adding content, or select a columns block and choose the target column in the inspector.
- Nested elements can be reordered within the same container, duplicated, removed, and edited independently.
- Advanced block controls include outer spacing, maximum width, border, corner radius, and background image URL.
- Desktop, tablet (768 px), and mobile (390 px) canvas viewport previews are available.
- Existing product catalog, cart, checkout, and order flows remain in place beneath the visual homepage content.

### Media Library
- Image and background-image fields can open the built-in Media Library to select existing store media or upload new files.
- Uploads use the existing public `naturalife-store-media` Supabase Storage bucket; no new bucket or storage policy is required.
- Only store admins can upload or modify media under the existing Storage RLS policies. Public visitors can view published image URLs.
- Accepted formats: JPG, PNG and WebP; maximum upload size: 5 MB.

- Image blocks support adjustable display height, cover/contain fit, and focal position. Background images support fit and focal-position controls.
