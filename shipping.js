/* Naturalife Bali — checkout shipping: live JNE rates from Biteship (via the submit-store-order function),
   GoSend/GrabExpress for Bali (fee confirmed by admin for now), and the order total. Needs app.js and address.js. */
(() => {
  "use strict";
  const form = document.getElementById("checkout-form");
  const box = form && form.querySelector("[data-ship-list]");
  if (!form || !box) return;

  const COPY = {
    en: { title: "Shipping", pickDistrict: "Choose your district above to see shipping options and costs.", loading: "Calculating shipping costs…", failed: "Live shipping costs are unavailable right now. Choose a courier and admin will confirm the cost on WhatsApp.", none: "No JNE service reaches this postal code. Choose an option below and admin will confirm the cost.", confirm: "cost confirmed by admin", baliOnly: "Bali only", fee: "Shipping", total: "Total", pending: "confirmed by admin", days: "days", day: "day", hours: "hours", liveNote: "Admin will check stock, then send payment details on WhatsApp.", retry: "Try again", required: "Please choose a shipping option.", emptyCart: "Your cart is empty. Add products to see shipping options and costs." },
    id: { title: "Pengiriman", pickDistrict: "Pilih kecamatan di atas untuk melihat pilihan dan ongkos kirim.", loading: "Menghitung ongkos kirim…", failed: "Ongkir otomatis sedang tidak tersedia. Pilih kurir, nanti admin konfirmasi ongkirnya lewat WhatsApp.", none: "Tidak ada layanan JNE ke kode pos ini. Pilih opsi di bawah, nanti admin konfirmasi ongkirnya.", confirm: "ongkir dikonfirmasi admin", baliOnly: "khusus Bali", fee: "Ongkos kirim", total: "Total", pending: "dikonfirmasi admin", days: "hari", day: "hari", hours: "jam", liveNote: "Admin akan cek stok, lalu kirim detail pembayaran lewat WhatsApp.", retry: "Coba lagi", required: "Silakan pilih pengiriman.", emptyCart: "Keranjang Anda kosong. Tambahkan produk dulu untuk melihat pilihan dan ongkos kirim." },
    ru: { title: "Доставка", pickDistrict: "Выберите район выше, чтобы увидеть варианты и стоимость доставки.", loading: "Расчёт стоимости доставки…", failed: "Автоматический расчёт доставки сейчас недоступен. Выберите курьера — администратор подтвердит стоимость в WhatsApp.", none: "JNE не доставляет на этот индекс. Выберите вариант ниже — администратор подтвердит стоимость.", confirm: "стоимость подтвердит администратор", baliOnly: "только Бали", fee: "Доставка", total: "Итого", pending: "подтвердит администратор", days: "дн.", day: "дн.", hours: "ч", liveNote: "Администратор проверит наличие и пришлёт реквизиты для оплаты в WhatsApp.", retry: "Повторить", required: "Пожалуйста, выберите способ доставки.", emptyCart: "Корзина пуста. Добавьте товары, чтобы увидеть варианты и стоимость доставки." }
  };
  const MANUAL = {
    jne_regular: { label: "JNE Regular", code: "jne_regular" },
    jne_trucking: { label: "JNE Trucking (JTR)", code: "jne_trucking" },
    gosend: { label: "GoSend", code: "gosend", bali: true },
    grabexpress: { label: "GrabExpress", code: "grabexpress", bali: true }
  };

  let lang = (document.getElementById("language") || {}).value || "en";
  const c = k => (COPY[lang] || COPY.en)[k];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const fmt = n => (typeof money === "function" ? money(n) : "Rp " + Number(n || 0).toLocaleString("id-ID"));
  const cartItems = () => (typeof cart === "object" && cart ? Object.entries(cart).filter(([, q]) => q > 0).map(([product_id, qty]) => ({ product_id, qty })) : []);
  const subtotal = () => (typeof cartTotal === "function" ? cartTotal() : 0);

  const DEBUG = /[?&]debug=1\b/.test(location.search);
  let state = { key: "", postal: "", status: "idle", services: [], selected: "", reason: "" };
  let requestId = 0, timer = 0;

  function eta(s) {
    let range = String(s.eta_range || "").trim();
    const ends = range.split(/\s*-\s*/);
    range = ends.length === 2 && ends[0] === ends[1] ? ends[0] : ends.join("–");
    if (!range) return s.eta || "";
    const unit = String(s.eta_unit || "").toLowerCase();
    const word = unit.startsWith("hour") ? c("hours") : (range === "1" ? c("day") : c("days"));
    return range + " " + word;
  }

  function options() {
    const region = window.NLAddress && window.NLAddress.region ? window.NLAddress.region() : {};
    const bali = /^bali$/i.test(region.province || "");
    const list = [];
    if (state.status === "ready") {
      state.services.forEach(s => list.push({ value: "live:" + s.courier + ":" + s.service, title: s.name, meta: eta(s), price: s.price, live: s }));
    }
    if (state.status === "failed" || (state.status === "ready" && !state.services.length)) {
      ["jne_regular", "jne_trucking"].forEach(k => list.push({ value: "manual:" + k, title: MANUAL[k].label, meta: c("confirm") }));
    }
    if (bali && (state.status === "ready" || state.status === "failed")) {
      ["gosend", "grabexpress"].forEach(k => list.push({ value: "manual:" + k, title: MANUAL[k].label, meta: c("baliOnly") + " · " + c("confirm") }));
    }
    return list;
  }

  function render() {
    const legend = form.querySelector("[data-ship-title]");
    if (legend) legend.textContent = c("title");
    let html = "";
    if (state.status === "empty") html = '<p class="ship-hint ship-warn">' + esc(c("emptyCart")) + "</p>";
    else if (state.status === "idle") html = '<p class="ship-hint">' + esc(c("pickDistrict")) + "</p>";
    else if (state.status === "loading") html = '<p class="ship-hint ship-loading">' + esc(c("loading")) + "</p>";
    else {
      if (state.status === "failed") html += '<p class="ship-hint ship-warn">' + esc(c("failed")) + ' <button type="button" class="ship-retry">' + esc(c("retry")) + "</button>" + (DEBUG && state.reason ? '<br><code class="ship-debug">' + esc(state.reason) + "</code>" : "") + "</p>";
      else if (!state.services.length) html += '<p class="ship-hint ship-warn">' + esc(c("none")) + "</p>";
      const list = options();
      if (!list.some(o => o.value === state.selected)) state.selected = "";
      html += '<div class="ship-options" role="radiogroup">' + list.map(o =>
        '<label class="ship-option"><input type="radio" name="ship_option" value="' + esc(o.value) + '" required' + (o.value === state.selected ? " checked" : "") + ">" +
        '<span class="ship-text"><strong>' + esc(o.title) + "</strong><small>" + esc(o.meta) + "</small></span>" +
        '<span class="ship-price">' + (o.live ? esc(fmt(o.price)) : "—") + "</span></label>").join("") + "</div>";
    }
    box.innerHTML = html;
    const first = box.querySelector('input[name="ship_option"]');
    if (first) first.setCustomValidity(state.selected ? "" : c("required"));
    totals();
  }

  function selectedOption() { return options().find(o => o.value === state.selected) || null; }

  function totals() {
    const o = selectedOption();
    const feeRow = form.querySelector("[data-ship-fee-row]"), totalRow = form.querySelector("[data-ship-total-row]");
    const manualNote = form.querySelector(".shipping-disclaimer:not([data-ship-live-note])"), liveNote = form.querySelector("[data-ship-live-note]");
    if (feeRow) {
      feeRow.hidden = !o;
      if (o) feeRow.querySelector("[data-ship-fee]").textContent = o.live ? fmt(o.live.price) : c("pending");
      feeRow.querySelector("[data-ship-fee-label]").textContent = c("fee");
    }
    if (totalRow) {
      totalRow.hidden = !(o && o.live);
      if (o && o.live) totalRow.querySelector("[data-ship-total]").textContent = fmt(subtotal() + o.live.price);
      totalRow.querySelector("[data-ship-total-label]").textContent = c("total");
    }
    if (liveNote) { liveNote.textContent = c("liveNote"); liveNote.hidden = !(o && o.live); }
    if (manualNote) manualNote.hidden = !!(o && o.live);
  }

  async function fetchRates(force) {
    const postal = window.NLAddress && window.NLAddress.ratePostal ? window.NLAddress.ratePostal() : "";
    const items = cartItems();
    if (!items.length) { state = { ...state, key: "", postal, status: "empty", services: [] }; render(); return; }
    if (!postal) { state = { ...state, key: "", postal: "", status: "idle", services: [] }; render(); return; }
    const key = postal + "|" + JSON.stringify(items);
    if (!force && key === state.key && state.status !== "idle" && state.status !== "empty") { render(); return; }
    const id = ++requestId;
    state = { ...state, key, postal, status: "loading", services: [] };
    render();
    try {
      const r = await fetch(ORDER_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY }, body: JSON.stringify({ action: "rates", postal_code: postal, items }) });
      const body = await r.json().catch(() => ({}));
      if (id !== requestId) return;
      if (!r.ok || !body.ok || !Array.isArray(body.services)) {
        const old = r.status === 400 && /Missing required order fields/.test(body.error || "");
        throw new Error(old ? "OLD FUNCTION CODE: the new index.ts is not deployed in Supabase yet" : "HTTP " + r.status + (body.v ? " [" + body.v + "]" : "") + ": " + (body.reason || body.error || "no details"));
      }
      state.status = "ready";
      state.services = body.services;
    } catch (e) {
      if (id !== requestId) return;
      console.warn("Shipping rates unavailable", e);
      state.status = "failed";
      state.services = [];
      state.reason = String(e && e.message || e);
    }
    render();
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => fetchRates(false), 350); };

  window.NLShipping = {
    /** Fields to merge into the order payload. */
    payload() {
      const o = selectedOption();
      if (!o) return {};
      if (o.live) return { preferred_courier: o.live.code, shipping: { courier: o.live.courier, service: o.live.service, price: o.live.price } };
      return { preferred_courier: MANUAL[o.value.split(":")[1]].code };
    },
    refresh: () => fetchRates(false)
  };

  form.addEventListener("change", e => {
    if (e.target.name === "ship_option") { state.selected = e.target.value; render(); }
  });
  form.addEventListener("click", e => { if (e.target.closest(".ship-retry")) fetchRates(true); });
  form.addEventListener("nl-address-change", schedule);
  form.addEventListener("change", e => { if (["province", "regency", "district", "village", "postal_code"].includes(e.target.name)) schedule(); });
  form.addEventListener("input", e => { if (e.target.name === "postal_code") schedule(); });
  form.addEventListener("reset", () => setTimeout(() => { state = { key: "", postal: "", status: "idle", services: [], selected: "" }; render(); }, 0));
  const lang$ = document.getElementById("language");
  if (lang$) lang$.addEventListener("change", e => { lang = COPY[e.target.value] ? e.target.value : "en"; render(); });
  const btn = document.getElementById("checkout-button");
  if (btn) btn.addEventListener("click", () => setTimeout(() => fetchRates(false), 0));
  render();
})();
