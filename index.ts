import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ---------- shipping settings (edit here if the pickup location changes) ---------- */
const ORIGIN_POSTAL_CODE = "80227"; // Naturalife Bali, Jl. Tirta Nadi II No.15, Sanur (Denpasar Selatan)
const RATE_COURIERS = "jne"; // postal-code couriers
const INSTANT_COURIERS = "gojek,grab"; // need coordinates: STORE_COORDINATES secret + the customer's map pin
const DEFAULT_ITEM_GRAMS = 500; // used when a product's weight text cannot be read
const BITESHIP_RATES_URL = "https://api.biteship.com/v1/rates/couriers";
const VERSION = "voucher-1";
const VOUCHER_PERCENT = 10; // discount for the next purchase, printed on every invoice (unique code, single use, no expiry) // shown on the checkout page with ?debug=1
const SITE_URL = "https://www.naturalifebali.com"; // used for invoice links
const MAX_PROOF_BYTES = 1_500_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[c]!));
}

const rupiah = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

/* ---------- shipping helpers ---------- */
type CartItem = { product_id: string; qty: number };
type Coords = { lat: number; lng: number };
type ShippingService = {
  courier: string; service: string; name: string; price: number;
  eta: string; eta_range: string; eta_unit: string; code: string;
};

/** Reads "500 g", "1 kg", "1,5 kg", "350 ml", "1 L", "2 x 250 g" → grams. */
export function parseGrams(text: unknown): number {
  const s = String(text ?? "").toLowerCase().replace(/,/g, ".");
  const m = s.match(/(\d+(?:\.\d+)?)\s*(kg|kilo(?:gram)?s?|gr?|grams?|gram|ml|l|lt|liters?|litres?)\b/);
  if (!m) return DEFAULT_ITEM_GRAMS;
  let grams = parseFloat(m[1]);
  const unit = m[2];
  if (/^(kg|kilo)/.test(unit) || /^(l|lt|liter|litre)/.test(unit)) grams *= 1000;
  const pack = s.match(/(\d+)\s*[x×]\s*\d/);
  if (pack) grams *= parseInt(pack[1], 10);
  return grams > 0 ? Math.round(grams) : DEFAULT_ITEM_GRAMS;
}

function etaLabel(s: ShippingService): string {
  if (!s.eta_range) return s.eta;
  const [a, b] = s.eta_range.split(/\s*-\s*/);
  const single = !b || a === b;
  const unit = single && a === "1" ? s.eta_unit.replace(/s$/, "") : s.eta_unit;
  return `${single ? a : a + "–" + b} ${unit}`.trim();
}

/** Reads "-8.6912, 115.2634" (as copied from Google Maps). Only accepts points inside Indonesia. */
export function parseCoords(lat: unknown, lng?: unknown): Coords | null {
  let a: number, b: number;
  if (lng === undefined) {
    const m = String(lat ?? "").match(/(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{2,3}(?:\.\d+)?)/);
    if (!m) return null;
    a = parseFloat(m[1]); b = parseFloat(m[2]);
  } else { a = Number(lat); b = Number(lng); }
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < -11.5 || a > 6.5 || b < 94 || b > 141.5) return null;
  return { lat: Math.round(a * 1e6) / 1e6, lng: Math.round(b * 1e6) / 1e6 };
}
const storeCoords = (): Coords | null => parseCoords(Deno.env.get("STORE_COORDINATES") ?? "");

const COURIER_INFO: Record<string, { brand: string; code: (service: string) => string }> = {
  jne: { brand: "JNE", code: (s) => (s.startsWith("jtr") ? "jne_trucking" : "jne_regular") },
  gojek: { brand: "GoSend", code: () => "gosend" },
  grab: { brand: "GrabExpress", code: () => "grabexpress" },
};

function cleanItems(items: unknown): CartItem[] {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw new Error("Invalid items");
  return items.map((i) => {
    const id = String((i as CartItem)?.product_id ?? "");
    const qty = Math.floor(Number((i as CartItem)?.qty));
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || !(qty >= 1 && qty <= 999)) throw new Error("Invalid item");
    return { product_id: id, qty };
  });
}

async function getRates(supabaseUrl: string, serviceKey: string, biteshipKey: string, postal: string, rawItems: unknown, dest: Coords | null = null): Promise<ShippingService[]> {
  if (!/^\d{5}$/.test(postal)) throw new Error("Invalid postal code");
  const items = cleanItems(rawItems);
  const ids = [...new Set(items.map((i) => i.product_id))];
  const res = await fetch(`${supabaseUrl}/rest/v1/store_catalog?select=id,name,price,weight&id=in.(${ids.join(",")})`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error("Product lookup failed: " + res.status + " " + (await res.text()));
  const products: Array<{ id: string; name: string; price: number; weight: string }> = await res.json();
  const byId = new Map(products.map((p) => [String(p.id), p]));
  const biteshipItems = items.map((i) => {
    const p = byId.get(i.product_id);
    if (!p) throw new Error("Unknown product " + i.product_id);
    return { name: String(p.name).slice(0, 100), value: Math.max(1, Math.round(Number(p.price) || 0)), quantity: i.qty, weight: parseGrams(p.weight) };
  });

  const origin = storeCoords();
  const r = await fetch(BITESHIP_RATES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: biteshipKey },
    body: JSON.stringify({
      origin_postal_code: Number(ORIGIN_POSTAL_CODE),
      destination_postal_code: Number(postal),
      ...(origin && dest ? { origin_latitude: origin.lat, origin_longitude: origin.lng, destination_latitude: dest.lat, destination_longitude: dest.lng } : {}),
      couriers: origin && dest ? RATE_COURIERS + "," + INSTANT_COURIERS : RATE_COURIERS,
      items: biteshipItems,
    }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.success === false) throw new Error("Biteship rates failed: " + r.status + " " + JSON.stringify(body).slice(0, 300));

  const pricing: Array<Record<string, unknown>> = Array.isArray(body.pricing) ? body.pricing : [];
  return pricing
    .filter((p) => COURIER_INFO[String(p.courier_code).toLowerCase()] && Number(p.price) > 0)
    .map((p) => {
      const courier = String(p.courier_code).toLowerCase();
      const info = COURIER_INFO[courier];
      const service = String(p.courier_service_code ?? "").toLowerCase();
      const serviceName = String(p.courier_service_name ?? service.toUpperCase()).replace(/^(JNE|GoSend|Gojek|Grab(Express)?)\s*/i, "");
      return {
        courier,
        service,
        name: `${info.brand} ${serviceName}`.trim(),
        price: Math.round(Number(p.price)),
        eta: String(p.duration ?? ""),
        eta_range: String(p.shipment_duration_range ?? ""),
        eta_unit: String(p.shipment_duration_unit ?? ""),
        code: info.code(service),
      };
    })
    .sort((a, b) => a.price - b.price);
}

/* ---------- orders, invoices & payment reports ---------- */
const PAYMENT_LABEL: Record<string, string> = { qris: "QRIS", bank_transfer: "Bank transfer (Bank Jago)" };

/** Unguessable per-order token (HMAC of the order number), so invoice links cannot be enumerated. */
async function orderToken(secret: string, orderNumber: unknown): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode("naturalife-order:" + String(orderNumber))));
  return [...sig.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function invoiceUrl(orderNumber: unknown, token: string): string {
  return `${SITE_URL}/invoice.html?o=${encodeURIComponent(String(orderNumber))}&t=${token}`;
}

async function db(supabaseUrl: string, serviceKey: string, path: string, init: RequestInit = {}) {
  const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...(init.headers || {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`DB ${r.status} on ${path.split("?")[0]}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function loadOrder(supabaseUrl: string, serviceKey: string, orderNumber: string) {
  const rows = await db(supabaseUrl, serviceKey, `store_orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=*&limit=1`);
  const o = Array.isArray(rows) ? rows[0] : null;
  if (!o) return null;
  const items = await db(supabaseUrl, serviceKey, `store_order_items?order_id=eq.${encodeURIComponent(String(o.id))}&select=*`);
  return {
    order_number: o.order_number, created_at: o.created_at, status: o.status,
    customer_name: o.customer_name, phone: o.phone, address: o.address, city: o.city, postal_code: o.postal_code,
    preferred_courier: o.preferred_courier, payment_method: o.payment_method, payment_status: o.payment_status || "unpaid",
    delivery_instructions: o.delivery_instructions ?? o.notes ?? "",
    subtotal: Number(o.subtotal) || 0, delivery_fee: Number(o.delivery_fee) || 0, total: Number(o.total) || 0,
    discount: voucherFromNotes(o.delivery_instructions ?? o.notes)?.discount ?? 0,
    voucher_used: voucherFromNotes(o.delivery_instructions ?? o.notes)?.code ?? "",
    items: (Array.isArray(items) ? items : []).map((i: Record<string, unknown>) => ({
      name: i.product_name ?? i.name ?? "Item", qty: Number(i.qty ?? i.quantity) || 1,
      unit_price: Number(i.unit_price ?? i.price) || 0, line_total: Number(i.line_total) || (Number(i.unit_price) || 0) * (Number(i.qty) || 1),
    })),
  };
}

async function telegram(token: string, chatId: string, text: string, photo?: { bytes: Uint8Array; type: string }) {
  let res: Response;
  if (photo) {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", text.slice(0, 1024));
    form.append("parse_mode", "HTML");
    form.append("photo", new Blob([photo.bytes as unknown as BlobPart], { type: photo.type }), "payment-proof." + (photo.type.split("/")[1] || "jpg"));
    res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
  } else {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
  }
  if (!res.ok) console.error("Telegram notification failed:", await res.text());
  return res.ok;
}

function decodeProof(dataUrl: unknown): { bytes: Uint8Array; type: string } | null {
  const m = String(dataUrl ?? "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  if (bin.length > MAX_PROOF_BYTES) throw new Error("Proof image too large");
  return { bytes: Uint8Array.from(bin, (ch) => ch.charCodeAt(0)), type: m[1] };
}

/* ---------- next-purchase vouchers ---------- */
const VOUCHER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Unique, unguessable code for an order, e.g. "TQ8-K7M2QX". Derived from the order number with HMAC, so nothing is stored. */
async function voucherCode(secret: string, orderNumber: unknown): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode("naturalife-voucher:" + String(orderNumber))));
  return "TQ" + String(orderNumber) + "-" + [...sig.slice(0, 6)].map((b) => VOUCHER_ALPHABET[b % VOUCHER_ALPHABET.length]).join("");
}

export function normalizeVoucher(raw: unknown): { code: string; source: string } | null {
  const code = String(raw ?? "").toUpperCase().replace(/\s+/g, "");
  const m = code.match(/^TQ(\d{1,10})-([A-Z2-9]{6})$/);
  return m ? { code, source: m[1] } : null;
}

/** Discount recorded on an order as "[Voucher CODE: -Rp 12.050]". */
export function voucherFromNotes(text: unknown): { code: string; discount: number } | null {
  const m = String(text ?? "").match(/\[Voucher ([A-Z0-9-]+): -Rp ([\d.]+)\]/);
  return m ? { code: m[1], discount: Number(m[2].replace(/\./g, "")) || 0 } : null;
}

type VoucherCheck = { ok: true; code: string; percent: number } | { ok: false; reason: "invalid" | "not_active" | "used" | "unavailable" };

async function checkVoucher(supabaseUrl: string, serviceKey: string, raw: unknown): Promise<VoucherCheck> {
  const v = normalizeVoucher(raw);
  if (!v || v.code !== await voucherCode(serviceKey, v.source)) return { ok: false, reason: "invalid" };
  try {
    const src = await db(supabaseUrl, serviceKey, `store_orders?order_number=eq.${v.source}&select=payment_status&limit=1`);
    if (!Array.isArray(src) || !src[0]) return { ok: false, reason: "invalid" };
    if (src[0].payment_status !== "paid") return { ok: false, reason: "not_active" };
    const used = await db(supabaseUrl, serviceKey, `store_orders?select=order_number&delivery_instructions=ilike.${encodeURIComponent("*[Voucher " + v.code + ":*")}&limit=1`);
    if (Array.isArray(used) && used.length) return { ok: false, reason: "used" };
  } catch (e) {
    console.error("Voucher check failed:", e);
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true, code: v.code, percent: VOUCHER_PERCENT };
}

/* ---------- main handler ---------- */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const raw = await req.text();
    if (raw.length > 2_500_000) return json({ error: "Request too large" }, 413);
    const payload = JSON.parse(raw);
    const mayCarryProof = payload.action === "paid" || (!payload.action && typeof payload.proof === "string");
    if (!mayCarryProof && raw.length > 20000) return json({ error: "Request too large" }, 413);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const biteshipKey = Deno.env.get("BITESHIP_API_KEY");

    // Shipping quote for the checkout form (no order is created).
    if (payload.action === "rates") {
      if (!supabaseUrl || !serviceKey || !biteshipKey) {
        const missing = [!supabaseUrl && "SUPABASE_URL", !serviceKey && "SUPABASE_SERVICE_ROLE_KEY", !biteshipKey && "BITESHIP_API_KEY"].filter(Boolean).join(", ");
        return json({ ok: false, error: "Shipping rates are not configured", reason: "Missing secret: " + missing, v: VERSION }, 503);
      }
      try {
        const dest = parseCoords(payload.latitude, payload.longitude);
        const services = await getRates(supabaseUrl, serviceKey, biteshipKey, String(payload.postal_code ?? ""), payload.items, dest);
        return json({ ok: true, services, instant: !!storeCoords(), pinned: !!dest, v: VERSION });
      } catch (e) {
        console.error("Shipping rates error:", e);
        const reason = String((e as Error)?.message ?? e).replace(/biteship_(live|test)\.[A-Za-z0-9._-]+/g, "[key]").slice(0, 300);
        return json({ ok: false, error: "Shipping rates unavailable", reason, v: VERSION }, 502);
      }
    }

    // Invoice page data, and "I have paid" reports from the customer.
    if (payload.action === "invoice" || payload.action === "paid") {
      if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "Service is not configured" }, 503);
      const num = String(payload.order_number ?? "");
      if (!/^\d{1,12}$/.test(num) || String(payload.token ?? "") !== await orderToken(serviceKey, num)) {
        return json({ ok: false, error: "Invalid invoice link" }, 403);
      }
      const order = await loadOrder(supabaseUrl, serviceKey, num);
      if (!order) return json({ ok: false, error: "Order not found" }, 404);
      if (payload.action === "invoice") {
        const next = { code: await voucherCode(serviceKey, num), percent: VOUCHER_PERCENT, active: order.payment_status === "paid" };
        return json({ ok: true, order, next_voucher: next, v: VERSION });
      }

      // action === "paid"
      const tgToken = Deno.env.get("TELEGRAM_BOT_TOKEN"), tgChat = Deno.env.get("TELEGRAM_CHAT_ID");
      if (order.payment_status === "paid") return json({ ok: true, status: "paid", already: true });
      let proof: { bytes: Uint8Array; type: string } | null = null;
      try { proof = decodeProof(payload.proof); } catch (_) { return json({ ok: false, error: "Proof image too large" }, 413); }
      if (order.payment_status === "pending" && !proof) return json({ ok: true, status: "pending", already: true });
      const method = PAYMENT_LABEL[String(payload.method)] ? String(payload.method) : String(order.payment_method || "");
      if (order.payment_status !== "pending") {
        await db(supabaseUrl, serviceKey, `store_orders?order_number=eq.${encodeURIComponent(num)}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ payment_status: "pending", payment_reference: `Customer reported ${PAYMENT_LABEL[method] || method} payment on ${new Date().toISOString()}`, updated_at: new Date().toISOString() }),
        });
      }
      const feeKnown = order.delivery_fee > 0;
      const amount = order.subtotal - order.discount + (feeKnown ? order.delivery_fee : 0);
      const link = invoiceUrl(num, await orderToken(serviceKey, num));
      const text = [
        `💸 <b>PAYMENT REPORTED — ORDER #${esc(num)}</b>`,
        `Customer: ${esc(order.customer_name)}`,
        `WhatsApp: ${esc(order.phone)}`,
        `Method: ${esc(PAYMENT_LABEL[method] || method || "-")}`,
        `Amount to check: <b>${rupiah(amount)}</b>${feeKnown ? " (incl. delivery)" : " (delivery fee not confirmed yet)"}`,
        proof ? "Proof of payment: attached" : "Proof of payment: not uploaded",
        `<a href="${esc(link)}">Open invoice</a>`,
        "",
        method === "qris" ? "Please verify in GoPay Merchant, then set the order to Paid in admin." : "Please verify in Bank Jago, then set the order to Paid in admin.",
      ].join("\n");
      const sent = tgToken && tgChat ? await telegram(tgToken, tgChat, text, proof ?? undefined) : false;
      return json({ ok: true, status: "pending", telegram_notified: sent });
    }

    // Checkout: is this voucher code usable?
    if (payload.action === "voucher") {
      if (!supabaseUrl || !serviceKey) return json({ ok: false, reason: "unavailable" }, 503);
      return json(await checkVoucher(supabaseUrl, serviceKey, payload.code));
    }

    // Honeypot field for basic bot filtering.
    if (payload.website) return json({ ok: true });

    const required = ["customer_name", "phone", "items"];
    if (required.some((k) => payload[k] == null)) {
      return json({ error: "Missing required order fields" }, 400);
    }
    if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 50) {
      return json({ error: "Invalid order items" }, 400);
    }
    // An order only becomes valid when the customer presses "Payment has been made".
    if (payload.payment_confirmed !== true) {
      return json({ error: "Payment confirmation required" }, 400);
    }

    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!supabaseUrl || !serviceKey || !telegramToken || !telegramChatId) {
      console.error("Missing required function environment configuration");
      return json({ error: "Order service is not configured" }, 500);
    }

    let proof: { bytes: Uint8Array; type: string } | null = null;
    try { proof = decodeProof(payload.proof); } catch (_) { return json({ error: "Proof image too large" }, 413); }
    const reportedAmount = Math.max(0, Math.round(Number(payload.reported_amount) || 0));
    const method = PAYMENT_LABEL[String(payload.payment_method)] ? String(payload.payment_method) : "qris";
    payload.payment_method = method;

    const pin = parseCoords(payload.latitude, payload.longitude);
    // Re-quote the chosen shipping service on the server, so the price cannot be changed in the browser.
    let shipping: ShippingService | null = null;
    const chosen = payload.shipping && typeof payload.shipping === "object" ? payload.shipping : null;
    if (chosen && biteshipKey) {
      try {
        const services = await getRates(supabaseUrl, serviceKey, biteshipKey, String(payload.postal_code ?? ""), payload.items, pin);
        shipping = services.find((s) => s.courier === String(chosen.courier) && s.service === String(chosen.service)) ?? null;
        if (!shipping) console.error("Chosen shipping service no longer available:", JSON.stringify(chosen));
      } catch (e) {
        console.error("Shipping re-quote failed, order continues with fee pending:", e);
      }
    }
    const payloadVoucher = payload.voucher_code ?? "";
    let voucher: VoucherCheck | null = null;
    if (payload.voucher_code) voucher = await checkVoucher(supabaseUrl, serviceKey, payload.voucher_code);
    for (const k of ["shipping", "action", "proof", "payment_confirmed", "reported_amount", "latitude", "longitude", "voucher_code"]) delete payload[k];
    const pinLink = pin ? `https://maps.google.com/?q=${pin.lat},${pin.lng}` : "";
    if (shipping) {
      payload.preferred_courier = shipping.code;
      const eta = etaLabel(shipping);
      const line = `[Ongkir ${shipping.name}: ${rupiah(shipping.price)}${eta ? ", estimasi " + eta : ""}]`;
      payload.delivery_instructions = [line, String(payload.delivery_instructions ?? "").trim()].filter(Boolean).join("\n");
    }
    if (pin) payload.delivery_instructions = [String(payload.delivery_instructions ?? "").trim(), `[Pin lokasi: ${pinLink}]`].filter(Boolean).join("\n");

    const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/place_store_order_secure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ p_order: payload }),
    });

    const rpcText = await rpc.text();
    if (!rpc.ok) {
      console.error("Order RPC rejected request:", rpc.status, rpcText);
      // The customer says they already paid, so the admin must hear about it even though the order failed.
      const warning = [
        "⚠️ <b>PAYMENT REPORTED BUT THE ORDER COULD NOT BE SAVED</b>",
        `Customer: ${esc(payload.customer_name)}`,
        `WhatsApp: ${esc(payload.phone)}`,
        `Address: ${esc(payload.address || "-")}, ${esc(payload.city || "")} ${esc(payload.postal_code || "")}`,
        `Method: ${esc(PAYMENT_LABEL[method])}`,
        `Amount the customer saw: ${rupiah(reportedAmount)}`,
        `Items: ${esc(payload.items.map((i: CartItem) => `${i.product_id} × ${i.qty}`).join(", "))}`,
        `Reason: ${esc(rpcText.slice(0, 200))}`,
        proof ? "Proof of payment: attached" : "Proof of payment: not uploaded",
        "",
        "Please check the payment and contact the customer on WhatsApp.",
      ].join("\n");
      const warned = await telegram(telegramToken, telegramChatId, warning);
      if (proof) await telegram(telegramToken, telegramChatId, "Proof of payment (order not saved) — " + esc(payload.customer_name), proof);
      return json({ error: "Could not place order. Please check product availability and details.", payment_reported: warned }, 400);
    }

    const order = JSON.parse(rpcText);
    const subtotal = Number(order.subtotal);
    const deliveryFee = shipping ? shipping.price : 0;
    const discount = voucher && voucher.ok ? Math.round(subtotal * voucher.percent / 100) : 0;
    const total = subtotal - discount + deliveryFee;
    const voucherLine = voucher && voucher.ok ? `[Voucher ${voucher.code}: -Rp ${discount.toLocaleString("id-ID")}]` : "";

    // Save shipping fee, new total and "payment reported" on the order.
    let saved = false;
    try {
      await db(supabaseUrl, serviceKey, `store_orders?order_number=eq.${encodeURIComponent(String(order.order_number))}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          ...(shipping ? { delivery_fee: deliveryFee } : {}),
          ...(shipping || discount ? { total } : {}),
          ...(voucherLine ? { delivery_instructions: [String(payload.delivery_instructions ?? "").trim(), voucherLine].filter(Boolean).join("\n") } : {}),
          payment_status: "pending",
          payment_reference: `Customer reported ${PAYMENT_LABEL[method]} payment on ${new Date().toISOString()}`,
          updated_at: new Date().toISOString(),
        }),
      });
      saved = true;
    } catch (e) {
      console.error("Could not update order after placing it:", e);
    }

    const token = await orderToken(serviceKey, order.order_number);
    const invoiceLink = invoiceUrl(order.order_number, token);
    const courier = shipping ? `${shipping.name} (${etaLabel(shipping)})` : (payload.preferred_courier || "To be confirmed");
    const message = [
      `🛒 <b>NEW ORDER #${esc(order.order_number)} — PAYMENT REPORTED</b>`,
      `Customer: ${esc(payload.customer_name)}`,
      `WhatsApp: ${esc(payload.phone)}`,
      `Courier: ${esc(courier)}`,
      `Address: ${esc(payload.address || "Not provided")}`,
      `City: ${esc(payload.city || "Bali")} ${esc(payload.postal_code || "")}`,
      pin ? `Map pin: <a href="${esc(pinLink)}">${pin.lat}, ${pin.lng}</a>` : null,
      `Payment: ${esc(PAYMENT_LABEL[method])}`,
      `Subtotal: ${rupiah(subtotal)}`,
      discount ? `Voucher ${esc(voucher && voucher.ok ? voucher.code : "")}: -${rupiah(discount)} (${VOUCHER_PERCENT}%)` : null,
      voucher && !voucher.ok ? `⚠️ Voucher ${esc(String(payloadVoucher))} was NOT applied (${voucher.reason})` : null,
      shipping ? `Delivery fee: ${rupiah(deliveryFee)} (Biteship)` : "Delivery fee: to be confirmed (customer paid products only)",
      `<b>Amount to check: ${rupiah(shipping ? total : subtotal - discount)}</b>`,
      reportedAmount && reportedAmount !== (shipping ? total : subtotal - discount) ? `⚠️ Customer was shown ${rupiah(reportedAmount)}` : null,
      proof ? "Proof of payment: attached below" : "Proof of payment: not uploaded",
      saved ? null : "⚠️ Payment status/fee could not be saved on the order — please update it in admin.",
      `<a href="${esc(invoiceLink)}">Open invoice</a>`,
      "",
      method === "qris"
        ? "Check the payment in GoPay Merchant, then set the order to Paid in admin."
        : "Check the payment in Bank Jago, then set the order to Paid in admin.",
    ].filter((l) => l !== null).join("\n");

    const telegramSent = await telegram(telegramToken, telegramChatId, message);
    if (proof) await telegram(telegramToken, telegramChatId, `Proof of payment — order #${esc(order.order_number)}`, proof);

    return json({
      ok: true,
      order_number: order.order_number,
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      voucher_applied: !!discount,
      total,
      shipping_confirmed: !!shipping,
      payment_status: "pending",
      token,
      invoice_url: invoiceLink,
      telegram_notified: telegramSent,
    }, 201);
  } catch (e) {
    console.error("Unexpected order submission error:", e);
    return json({ error: "Unexpected order service error" }, 500);
  }
});
