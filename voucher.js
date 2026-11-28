/* Naturalife Bali — voucher code at checkout (10% off products, unique per order, single use).
   The code is checked by the server now and checked again when the order is placed. */
(() => {
  "use strict";
  const form = document.getElementById("checkout-form");
  const box = form && form.querySelector("[data-voucher]");
  if (!form || !box) return;
  const ENDPOINT = typeof ORDER_ENDPOINT !== "undefined" ? ORDER_ENDPOINT : "";
  const KEY = typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "";

  const COPY = {
    en: { label: "Voucher code", optional: "optional", apply: "Apply", remove: "Remove", checking: "Checking…", applied: "{p}% discount applied", invalid: "This voucher code is not valid.", not_active: "This voucher becomes active once the order it came from is paid.", used: "This voucher has already been used.", unavailable: "Vouchers can’t be checked right now. Please try again.", discount: "Voucher discount" },
    id: { label: "Kode voucher", optional: "opsional", apply: "Pakai", remove: "Hapus", checking: "Memeriksa…", applied: "Diskon {p}% berhasil dipakai", invalid: "Kode voucher tidak valid.", not_active: "Voucher ini aktif setelah pesanan asalnya lunas.", used: "Voucher ini sudah pernah dipakai.", unavailable: "Voucher belum bisa diperiksa. Silakan coba lagi.", discount: "Diskon voucher" },
    ru: { label: "Промокод", optional: "необязательно", apply: "Применить", remove: "Удалить", checking: "Проверяем…", applied: "Скидка {p}% применена", invalid: "Промокод недействителен.", not_active: "Промокод активируется после оплаты заказа, к которому он выдан.", used: "Этот промокод уже использован.", unavailable: "Сейчас не удаётся проверить промокод. Попробуйте ещё раз.", discount: "Скидка по промокоду" }
  };
  let lang = (document.getElementById("language") || {}).value || "en";
  const c = (k, p) => String((COPY[lang] || COPY.en)[k]).replace("{p}", p ?? "");
  const input = box.querySelector("input"), btn = box.querySelector("[data-voucher-btn]"), msg = box.querySelector("[data-voucher-msg]");
  let state = { status: "none", code: "", percent: 0, reason: "" }; // none | checking | applied | error

  function render() {
    box.querySelector("[data-voucher-label]").textContent = c("label");
    box.querySelector("[data-voucher-optional]").textContent = c("optional");
    btn.textContent = state.status === "applied" ? c("remove") : state.status === "checking" ? c("checking") : c("apply");
    btn.disabled = state.status === "checking";
    input.readOnly = state.status === "applied";
    box.classList.toggle("is-applied", state.status === "applied");
    box.classList.toggle("is-error", state.status === "error");
    msg.textContent = state.status === "applied" ? "✓ " + c("applied", state.percent) : state.status === "error" ? c(state.reason) : "";
    form.dispatchEvent(new CustomEvent("nl-voucher-change"));
  }

  async function apply() {
    const code = input.value.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return;
    input.value = code;
    state = { status: "checking", code, percent: 0, reason: "" }; render();
    try {
      const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY }, body: JSON.stringify({ action: "voucher", code }) });
      const body = await r.json().catch(() => ({}));
      if (body.ok) state = { status: "applied", code: body.code, percent: Number(body.percent) || 0, reason: "" };
      else state = { status: "error", code, percent: 0, reason: COPY.en[body.reason] ? body.reason : "unavailable" };
    } catch (e) {
      state = { status: "error", code, percent: 0, reason: "unavailable" };
    }
    render();
  }
  function clear() { state = { status: "none", code: "", percent: 0, reason: "" }; input.value = ""; render(); }

  btn.addEventListener("click", () => (state.status === "applied" ? clear() : apply()));
  input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (state.status !== "applied") apply(); } });
  input.addEventListener("input", () => { if (state.status === "error") { state.status = "none"; render(); } });
  form.addEventListener("reset", () => setTimeout(clear, 0));
  const langSel = document.getElementById("language");
  if (langSel) langSel.addEventListener("change", e => { lang = COPY[e.target.value] ? e.target.value : "en"; render(); });

  window.NLVoucher = {
    /** Discount in rupiah for a products subtotal (0 when no voucher is applied). */
    discount: subtotal => (state.status === "applied" ? Math.round((Number(subtotal) || 0) * state.percent / 100) : 0),
    info: () => (state.status === "applied" ? { code: state.code, percent: state.percent } : null),
    label: () => c("discount"),
    payload: () => (state.status === "applied" ? { voucher_code: state.code } : {})
  };
  render();
})();
