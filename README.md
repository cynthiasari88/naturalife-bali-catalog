# Naturalife Bali — Scannable Retail Catalog

Responsive multilingual retail catalog for Naturalife Bali.

## Confirmed workflow
- Retail catalog in English, Bahasa Indonesia, and Russian.
- Product quantities and cart subtotal are calculated automatically.
- Customer submits contact details, address, preferred courier, and payment preference.
- Shipping is manually quoted by admin.
- Admin reviews stock and shipping, then sends final invoice and payment details via WhatsApp.
- New orders will notify admin through a Supabase Edge Function and Telegram.
- Inventory is manually maintained by admin.

## Stack
Static storefront, Supabase database and Storage, Supabase Edge Function, and Vercel hosting.

## Security
Never expose Supabase service-role keys or Telegram bot tokens in browser code. Store them as Edge Function secrets.

## Setup status
Repository initialized. Supabase project `Naturalife Bali Store` (`fvxbssqitctrdmxysiqb`) currently reports `INACTIVE`; schema and RLS still need inspection after restoration. No live order endpoint is deployed. Storefront is currently a demo preview and does not save real orders.

## Local preview
Open `index.html` in a browser.