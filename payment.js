/* Naturalife Bali — payment step in the checkout dialog.
   Flow: form → "Continue to payment" → this screen (nothing is saved yet) → "Payment has been made" → the order is
   sent, saved as payment pending, and reported to Telegram. Needs payment-core.js, app.js (NLCheckout) and shipping.js. */
(() => {
  "use strict";
  const P = window.NLPay;
  const dialog = document.getElementById("checkout-dialog");
  const form = document.getElementById("checkout-form");
  if (!P || !dialog || !form) return;

  const panel = document.createElement("section");
  panel.className = "pay-panel";
  panel.hidden = true;
  panel.setAttribute("aria-live", "polite");
  form.insertAdjacentElement("afterend", panel);
  P.bindCopy(panel);

  let current = null; // { payload, items, subtotal, fee, feeKnown, courier, method, stage: "pay" | "sending" | "done", result, error }
  const lang = () => ((document.getElementById("language") || {}).value || "en");
  const e = P.esc;

  function snapshotItems() {
    const list = typeof products !== "undefined" && Array.isArray(products) ? products : [];
    const c = typeof cart === "object" && cart ? cart : {};
    return Object.entries(c).filter(([, q]) => q > 0).map(([id, qty]) => {
      const p = list.find(x => String(x.id) === String(id)) || {};
      return { name: p.name || "Item", qty, line_total: (Number(p.price) || 0) * qty };
    });
  }
  const amountDue = o => o.subtotal - (o.discount || 0) + (o.feeKnown ? o.fee : 0);

  function head(L, eyebrow, title) {
    return '<div class="drawer-heading pay-head"><div><p class="eyebrow">' + e(eyebrow) + "</p><h2>" + e(title) + "</h2></div>" +
      '<button class="icon-button pay-close" type="button" aria-label="' + e(P.t(L, "done")) + '">×</button></div>';
  }

  function summary(L, o) {
    return '<div class="pay-card"><h3>' + e(P.t(L, "summary")) + "</h3>" +
      '<ul class="pay-items">' + o.items.map(i => "<li><span>" + e(i.name) + " × " + i.qty + "</span><span>" + e(P.money(i.line_total)) + "</span></li>").join("") + "</ul>" +
      '<div class="pay-line"><span>' + e(P.t(L, "subtotal")) + "</span><span>" + e(P.money(o.subtotal)) + "</span></div>" +
      (o.discount ? '<div class="pay-line pay-discount"><span>' + e(P.t(L, "voucherDiscount")) + " (" + e(o.voucher) + ")</span><span>−" + e(P.money(o.discount)) + "</span></div>" : "") +
      '<div class="pay-line"><span>' + e(P.t(L, "shipping")) + (o.courier ? " · " + e(o.courier) : "") + "</span><span>" + (o.feeKnown ? e(P.money(o.fee)) : e(P.t(L, "shippingPending"))) + "</span></div>" +
      '<div class="pay-line pay-total"><span>' + e(P.t(L, o.feeKnown ? "total" : "productsOnly")) + "</span><strong>" + e(P.money(amountDue(o))) + "</strong></div>" +
      (o.feeKnown ? "" : '<p class="pay-note warn">' + e(P.t(L, "feeLaterNote", { courier: o.courier || "" })) + "</p>") + "</div>";
  }

  function render() {
    const o = current, L = lang();
    if (o.stage === "done") {
      const r = o.result;
      const href = "invoice.html?o=" + encodeURIComponent(r.order_number) + "&t=" + encodeURIComponent(r.token) + "&lang=" + L;
      panel.innerHTML = head(L, P.t(L, "paymentEyebrow"), P.t(L, "orderDoneTitle", { n: r.order_number })) +
        '<p class="pay-note ok">' + e(P.t(L, "orderDoneText")) + "</p>" + summary(L, o) +
        '<div class="pay-actions"><a class="pay-invoice" href="' + e(href) + '" target="_blank" rel="noopener">' + e(P.t(L, "invoice")) + " ↗</a>" +
        '<button type="button" class="pay-done">' + e(P.t(L, "done")) + "</button></div>";
    } else {
      const sending = o.stage === "sending";
      panel.innerHTML = head(L, P.t(L, "paymentEyebrow"), P.t(L, "payTitle")) +
        '<p class="pay-intro">' + e(P.t(L, "payStepIntro")) + "</p>" + summary(L, o) +
        '<div class="pay-card"><h3>' + e(P.t(L, "method")) + "</h3>" + P.methodsHtml(L, o.method, amountDue(o)) + "</div>" +
        '<div class="pay-confirm"><label class="pay-proof-label">' + e(P.t(L, "proofLabel")) + '<input type="file" accept="image/*" class="pay-proof-input"' + (sending ? " disabled" : "") + "></label>" +
        "<small>" + e(P.t(L, "proofHint")) + "</small>" +
        '<button type="button" class="primary-button pay-confirm-btn"' + (sending ? " disabled" : "") + ">" + e(P.t(L, sending ? "recording" : "confirmPaid")) + "</button>" +
        '<small class="pay-confirm-note">' + e(P.t(L, "confirmNote")) + "</small>" +
        (o.error ? '<div class="pay-note error" role="alert"><p>' + e(P.t(L, "orderFailed")) + "</p>" +
          (o.error.paymentReported ? "<p>" + e(P.t(L, "orderFailedPaid")) + "</p>" : "") +
          '<a class="pay-wa" href="https://wa.me/' + P.ADMIN_WHATSAPP + '" target="_blank" rel="noopener">' + e(P.t(L, "whatsapp")) + "</a></div>" : "") +
        "</div>" +
        '<div class="pay-actions"><button type="button" class="pay-back"' + (sending ? " disabled" : "") + ">" + e(P.t(L, "backToForm")) + "</button></div>";
      P.bindTabs(panel, m => { current.method = m; });
      panel.querySelector(".pay-confirm-btn").onclick = confirm;
      panel.querySelector(".pay-back").onclick = backToForm;
      if (o.proofFile) { /* keep the chosen file across re-renders */ const dt = new DataTransfer(); dt.items.add(o.proofFile); panel.querySelector(".pay-proof-input").files = dt.files; }
      panel.querySelector(".pay-proof-input").onchange = ev => { current.proofFile = ev.target.files[0] || null; };
    }
    const close = panel.querySelector(".pay-close"); if (close) close.onclick = () => dialog.close();
    const done = panel.querySelector(".pay-done"); if (done) done.onclick = () => dialog.close();
  }

  async function confirm() {
    const o = current;
    if (!o || o.stage !== "pay" || !window.NLCheckout) return;
    o.stage = "sending"; o.error = null; render();
    try {
      let proof;
      if (o.proofFile) { try { proof = await P.compressImage(o.proofFile); } catch (err) { proof = undefined; } }
      const result = await window.NLCheckout.send({ ...o.payload, payment_method: o.method, payment_confirmed: true, reported_amount: amountDue(o), proof });
      o.result = result;
      if (typeof result.delivery_fee === "number" && result.shipping_confirmed) { o.fee = result.delivery_fee; o.feeKnown = true; }
      if (typeof result.discount === "number") { o.discount = result.discount; if (!result.discount) o.voucher = ""; }
      o.stage = "done";
    } catch (err) {
      console.error(err);
      o.stage = "pay";
      o.error = { paymentReported: !!err.paymentReported };
    }
    render();
    panel.scrollIntoView({ block: "start" });
  }

  function backToForm() {
    panel.hidden = true; panel.innerHTML = ""; current = null;
    form.hidden = false;
  }

  window.NLPayment = {
    /** Called by app.js when the checkout form is valid. Nothing is sent to the server here. */
    start(payload) {
      const ship = payload.shipping || null;
      const chosen = form.querySelector('input[name="ship_option"]:checked');
      const courier = chosen ? ((chosen.closest("label").querySelector("strong") || {}).textContent || "") : "";
      const items = snapshotItems();
      const sub = items.reduce((sum, i) => sum + i.line_total, 0);
      const v = window.NLVoucher ? window.NLVoucher.info() : null;
      current = {
        discount: v ? window.NLVoucher.discount(sub) : 0, voucher: v ? v.code : "",
        payload, items, courier,
        subtotal: items.reduce((sum, i) => sum + i.line_total, 0),
        fee: ship ? Number(ship.price) || 0 : 0, feeKnown: !!ship,
        method: payload.payment_method === "bank_transfer" ? "bank_transfer" : "qris",
        stage: "pay", result: null, error: null, proofFile: null
      };
      render();
      form.hidden = true;
      panel.hidden = false;
      dialog.scrollTop = 0;
      panel.scrollIntoView({ block: "start" });
    }
  };

  dialog.addEventListener("close", () => {
    if (!current) return;
    const finished = current.stage === "done";
    backToForm();
    if (finished) {
      form.reset();
      const msg = document.getElementById("checkout-message"); if (msg) msg.textContent = "";
    }
  });
  const langSel = document.getElementById("language");
  if (langSel) langSel.addEventListener("change", () => { if (current && !panel.hidden && current.stage !== "sending") render(); });
})();
