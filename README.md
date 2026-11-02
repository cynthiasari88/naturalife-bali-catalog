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
