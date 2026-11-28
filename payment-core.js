/* Naturalife Bali — shared payment details and helpers (used by the checkout payment screen and invoice.html). */
(() => {
  "use strict";
  const SUPABASE_FN = "https://fvxbssqitctrdmxysiqb.supabase.co/functions/v1/submit-store-order";
  const ANON_KEY = "sb_publishable_2O8WRCv_BAhL7BEVtnTgfQ_GfGzIgFR";

  const PAY = {
    qris: { image: "/qris.png", merchant: "Naturalife Bali, Sanur", nmid: "ID1024323539535" },
    bank: { bank: "Bank Jago", holder: "Cynthia Mustika Sari", number: "106395943671", display: "1063 9594 3671" }
  };

  const COPY = {
    en: {
      voucherDiscount: "Voucher discount", payTitle: "Complete your payment", payStepIntro: "Pay with one of the methods below, then press “Payment has been made”. Your order is only recorded after you press it.", productsOnly: "Products total (shipping paid separately)", feeLaterNote: "The {courier} fee is confirmed by admin on WhatsApp and paid separately.", confirmPaid: "Payment has been made", confirmNote: "By pressing this button you confirm that you have paid the amount above.", recording: "Recording your order…", orderDoneTitle: "Order #{n} received", orderDoneText: "Thank you! We received your order and payment confirmation. Admin will verify the payment and message you on WhatsApp.", backToForm: "← Edit order", orderFailed: "Your order could not be recorded. Please try again.", orderFailedPaid: "If you already paid, don’t worry — admin has been notified. Please message us on WhatsApp with your proof of payment.", whatsapp: "Message us on WhatsApp", 
      paymentEyebrow: "Payment", orderReceived: "Order #{n} received", payIntro: "Complete your payment so we can prepare your order.",
      summary: "Order summary", subtotal: "Subtotal", shipping: "Shipping", total: "Total to pay", totalProvisional: "Total so far (shipping not included)",
      shippingPending: "confirmed by admin", feePendingNote: "Admin will confirm the shipping cost on WhatsApp. Your invoice updates with the final total — please pay once it is confirmed.",
      method: "Payment method", qris: "QRIS", bank: "Bank transfer",
      qrisHelp: "Scan with GoPay, OVO, DANA, ShopeePay or any mobile banking app, then enter the amount:", saveQris: "Save QRIS image",
      bankName: "Bank", holder: "Account name", accountNo: "Account number", amount: "Amount", copy: "Copy", copied: "Copied",
      paidButton: "I have paid", proofLabel: "Proof of payment (optional)", proofHint: "A screenshot of the transfer helps us confirm faster.",
      sendPaid: "Send payment confirmation", sending: "Sending…", paidThanks: "Thank you! We received your payment confirmation. Admin will verify it and message you on WhatsApp.",
      paidAlready: "Your payment confirmation was already received. Admin is verifying it.", paidDone: "This order is paid. Thank you!",
      paidFailed: "Could not send the confirmation. Please try again or message us on WhatsApp.", proofBad: "This image could not be read. Choose a JPG or PNG screenshot.",
      invoice: "View & download invoice", done: "Done"
    },
    id: {
      voucherDiscount: "Diskon voucher", payTitle: "Selesaikan pembayaran", payStepIntro: "Bayar dengan salah satu metode di bawah, lalu tekan “Pembayaran telah dilakukan”. Pesanan Anda baru tercatat setelah tombol itu ditekan.", productsOnly: "Total produk (ongkir dibayar terpisah)", feeLaterNote: "Ongkir {courier} dikonfirmasi admin lewat WhatsApp dan dibayar terpisah.", confirmPaid: "Pembayaran telah dilakukan", confirmNote: "Dengan menekan tombol ini, Anda menyatakan sudah membayar sesuai nominal di atas.", recording: "Mencatat pesanan…", orderDoneTitle: "Pesanan #{n} diterima", orderDoneText: "Terima kasih! Pesanan dan konfirmasi pembayaran Anda sudah kami terima. Admin akan memverifikasi pembayaran dan menghubungi Anda lewat WhatsApp.", backToForm: "← Ubah pesanan", orderFailed: "Pesanan belum berhasil tercatat. Silakan coba lagi.", orderFailedPaid: "Jika Anda sudah membayar, jangan khawatir — admin sudah menerima pemberitahuan. Silakan hubungi kami lewat WhatsApp dan kirim bukti pembayaran Anda.", whatsapp: "Hubungi kami via WhatsApp", 
      paymentEyebrow: "Pembayaran", orderReceived: "Pesanan #{n} diterima", payIntro: "Selesaikan pembayaran agar pesanan Anda bisa segera kami siapkan.",
      summary: "Ringkasan pesanan", subtotal: "Subtotal", shipping: "Ongkos kirim", total: "Total yang harus dibayar", totalProvisional: "Total sementara (belum termasuk ongkir)",
      shippingPending: "dikonfirmasi admin", feePendingNote: "Admin akan mengonfirmasi ongkir lewat WhatsApp. Invoice Anda akan diperbarui dengan total akhir — mohon bayar setelah total dikonfirmasi.",
      method: "Metode pembayaran", qris: "QRIS", bank: "Transfer bank",
      qrisHelp: "Scan dengan GoPay, OVO, DANA, ShopeePay, atau aplikasi m-banking apa pun, lalu masukkan nominal:", saveQris: "Simpan gambar QRIS",
      bankName: "Bank", holder: "Atas nama", accountNo: "Nomor rekening", amount: "Nominal", copy: "Salin", copied: "Tersalin",
      paidButton: "Saya sudah bayar", proofLabel: "Bukti pembayaran (opsional)", proofHint: "Screenshot bukti transfer membantu kami mengonfirmasi lebih cepat.",
      sendPaid: "Kirim konfirmasi pembayaran", sending: "Mengirim…", paidThanks: "Terima kasih! Konfirmasi pembayaran sudah kami terima. Admin akan memverifikasi dan menghubungi Anda lewat WhatsApp.",
      paidAlready: "Konfirmasi pembayaran Anda sudah kami terima dan sedang diverifikasi admin.", paidDone: "Pesanan ini sudah lunas. Terima kasih!",
      paidFailed: "Konfirmasi gagal dikirim. Silakan coba lagi atau hubungi kami lewat WhatsApp.", proofBad: "Gambar tidak bisa dibaca. Pilih screenshot JPG atau PNG.",
      invoice: "Lihat & unduh invoice", done: "Selesai"
    },
    ru: {
      voucherDiscount: "Скидка по промокоду", payTitle: "Оплата заказа", payStepIntro: "Оплатите одним из способов ниже и нажмите «Оплата произведена». Заказ оформляется только после нажатия этой кнопки.", productsOnly: "Сумма товаров (доставка оплачивается отдельно)", feeLaterNote: "Стоимость доставки {courier} подтвердит администратор в WhatsApp, она оплачивается отдельно.", confirmPaid: "Оплата произведена", confirmNote: "Нажимая кнопку, вы подтверждаете, что оплатили указанную сумму.", recording: "Оформляем заказ…", orderDoneTitle: "Заказ №{n} принят", orderDoneText: "Спасибо! Мы получили ваш заказ и подтверждение оплаты. Администратор проверит оплату и напишет вам в WhatsApp.", backToForm: "← Изменить заказ", orderFailed: "Не удалось оформить заказ. Попробуйте ещё раз.", orderFailedPaid: "Если вы уже оплатили — не волнуйтесь, администратор получил уведомление. Напишите нам в WhatsApp и пришлите подтверждение оплаты.", whatsapp: "Написать в WhatsApp", 
      paymentEyebrow: "Оплата", orderReceived: "Заказ №{n} принят", payIntro: "Оплатите заказ, чтобы мы могли его подготовить.",
      summary: "Состав заказа", subtotal: "Сумма товаров", shipping: "Доставка", total: "К оплате", totalProvisional: "Предварительная сумма (без доставки)",
      shippingPending: "подтвердит администратор", feePendingNote: "Администратор подтвердит стоимость доставки в WhatsApp. Итоговая сумма обновится в счёте — оплатите после подтверждения.",
      method: "Способ оплаты", qris: "QRIS", bank: "Банковский перевод",
      qrisHelp: "Отсканируйте в GoPay, OVO, DANA, ShopeePay или банковском приложении и введите сумму:", saveQris: "Сохранить QRIS",
      bankName: "Банк", holder: "Получатель", accountNo: "Номер счёта", amount: "Сумма", copy: "Копировать", copied: "Скопировано",
      paidButton: "Я оплатил(а)", proofLabel: "Подтверждение оплаты (необязательно)", proofHint: "Скриншот перевода поможет подтвердить оплату быстрее.",
      sendPaid: "Отправить подтверждение", sending: "Отправка…", paidThanks: "Спасибо! Мы получили подтверждение оплаты. Администратор проверит его и напишет вам в WhatsApp.",
      paidAlready: "Подтверждение оплаты уже получено и проверяется.", paidDone: "Заказ оплачен. Спасибо!",
      paidFailed: "Не удалось отправить подтверждение. Попробуйте ещё раз или напишите нам в WhatsApp.", proofBad: "Не удалось прочитать изображение. Выберите скриншот JPG или PNG.",
      invoice: "Открыть и скачать счёт", done: "Готово"
    }
  };

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const t = (lang, key, vars) => String(((COPY[lang] || COPY.en)[key]) ?? COPY.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ""));

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
      ta.remove(); return ok;
    }
  }

  /** Copy buttons: <button data-copy="text" data-copy-label="Copy" data-copied-label="Copied">. */
  function bindCopy(root) {
    root.addEventListener("click", async e => {
      const b = e.target.closest("[data-copy]");
      if (!b) return;
      const ok = await copyText(b.dataset.copy);
      const label = b.querySelector("span") || b;
      const original = b.dataset.copyLabel || label.textContent;
      label.textContent = ok ? (b.dataset.copiedLabel || "✓") : original;
      b.classList.toggle("is-copied", ok);
      clearTimeout(b._t); b._t = setTimeout(() => { label.textContent = original; b.classList.remove("is-copied"); }, 1800);
    });
  }

  /** Shrinks a photo to max 1600 px JPEG so it uploads quickly. */
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        let q = 0.82, out = canvas.toDataURL("image/jpeg", q);
        while (out.length > 1_900_000 && q > 0.4) { q -= 0.12; out = canvas.toDataURL("image/jpeg", q); }
        resolve(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
      img.src = url;
    });
  }

  async function api(body) {
    const r = await fetch(SUPABASE_FN, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON_KEY }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) throw new Error(data.error || "HTTP " + r.status);
    return data;
  }

  /** HTML for the QRIS / bank details block. amount = number or null. */
  function methodsHtml(lang, active, amount) {
    const amt = amount != null ? money(amount) : "";
    const digits = amount != null ? String(Math.round(amount)) : "";
    const copyBtn = (value, label) => '<button type="button" class="pay-copy" data-copy="' + esc(value) + '" data-copy-label="' + esc(t(lang, "copy")) + '" data-copied-label="' + esc(t(lang, "copied")) + '" aria-label="' + esc(t(lang, "copy") + " " + label) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg><span>' + esc(t(lang, "copy")) + "</span></button>";
    return '<div class="pay-tabs" role="tablist">' +
      ["qris", "bank_transfer"].map(m => '<button type="button" role="tab" class="pay-tab" data-pay-tab="' + m + '" aria-selected="' + (active === m) + '">' + esc(t(lang, m === "qris" ? "qris" : "bank")) + "</button>").join("") + "</div>" +
      '<div class="pay-method" data-pay-method="qris"' + (active === "qris" ? "" : " hidden") + ">" +
        '<img class="pay-qris" src="' + PAY.qris.image + '" alt="QRIS ' + esc(PAY.qris.merchant) + '" width="260" height="307">' +
        '<p class="pay-help">' + esc(t(lang, "qrisHelp")) + "</p>" +
        (amount != null ? '<div class="pay-row pay-amount"><span>' + esc(t(lang, "amount")) + "</span><strong>" + esc(amt) + "</strong>" + copyBtn(digits, t(lang, "amount")) + "</div>" : "") +
        '<a class="pay-save" href="' + PAY.qris.image + '" download="QRIS-Naturalife-Bali.png">' + esc(t(lang, "saveQris")) + "</a>" +
      "</div>" +
      '<div class="pay-method" data-pay-method="bank_transfer"' + (active === "bank_transfer" ? "" : " hidden") + ">" +
        '<div class="pay-row"><span>' + esc(t(lang, "bankName")) + "</span><strong>" + esc(PAY.bank.bank) + "</strong></div>" +
        '<div class="pay-row"><span>' + esc(t(lang, "holder")) + "</span><strong>" + esc(PAY.bank.holder) + "</strong></div>" +
        '<div class="pay-row pay-account"><span>' + esc(t(lang, "accountNo")) + '</span><strong class="pay-number">' + esc(PAY.bank.display) + "</strong>" + copyBtn(PAY.bank.number, t(lang, "accountNo")) + "</div>" +
        (amount != null ? '<div class="pay-row pay-amount"><span>' + esc(t(lang, "amount")) + "</span><strong>" + esc(amt) + "</strong>" + copyBtn(digits, t(lang, "amount")) + "</div>" : "") +
      "</div>";
  }

  /** Switches tabs inside root. */
  function bindTabs(root, onChange) {
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-pay-tab]");
      if (!b) return;
      const m = b.dataset.payTab;
      root.querySelectorAll("[data-pay-tab]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
      root.querySelectorAll("[data-pay-method]").forEach(x => { x.hidden = x.dataset.payMethod !== m; });
      if (onChange) onChange(m);
    });
  }

  /** "I have paid" block: renders into box, sends {action:"paid"} with optional compressed proof. */
  function paidBlock(box, opts) {
    const { lang, orderNumber, token, getMethod, status } = opts;
    if (status === "paid") { box.innerHTML = '<p class="pay-note ok">' + esc(t(lang, "paidDone")) + "</p>"; return; }
    if (status === "pending") { box.innerHTML = '<p class="pay-note ok">' + esc(t(lang, "paidAlready")) + "</p>"; }
    else box.innerHTML = '<button type="button" class="primary-button pay-paid-toggle">' + esc(t(lang, "paidButton")) + "</button>";
    box.insertAdjacentHTML("beforeend",
      '<div class="pay-proof"' + (status === "pending" ? "" : " hidden") + '><label class="pay-proof-label">' + esc(t(lang, "proofLabel")) +
      '<input type="file" accept="image/*" class="pay-proof-input"></label><small>' + esc(t(lang, "proofHint")) + "</small>" +
      '<button type="button" class="primary-button pay-send">' + esc(t(lang, "sendPaid")) + '</button><p class="pay-msg" role="status"></p></div>');
    const proofBox = box.querySelector(".pay-proof"), msg = box.querySelector(".pay-msg"), send = box.querySelector(".pay-send");
    const toggle = box.querySelector(".pay-paid-toggle");
    if (toggle) toggle.onclick = () => { proofBox.hidden = false; toggle.hidden = true; };
    send.onclick = async () => {
      send.disabled = true; send.textContent = t(lang, "sending"); msg.textContent = ""; msg.className = "pay-msg";
      try {
        const file = box.querySelector(".pay-proof-input").files[0];
        let proof;
        if (file) { try { proof = await compressImage(file); } catch (e) { throw new Error("proof"); } }
        const r = await api({ action: "paid", order_number: String(orderNumber), token, method: getMethod(), proof });
        box.innerHTML = '<p class="pay-note ok">' + esc(t(lang, r.already && r.status === "paid" ? "paidDone" : r.already && !proof ? "paidAlready" : "paidThanks")) + "</p>";
        if (opts.onDone) opts.onDone(r);
      } catch (e) {
        msg.textContent = t(lang, e.message === "proof" ? "proofBad" : "paidFailed"); msg.className = "pay-msg error";
        send.disabled = false; send.textContent = t(lang, "sendPaid");
      }
    };
  }

  const ADMIN_WHATSAPP = "628997899187";
  window.NLPay = { PAY, COPY, t, esc, money, bindCopy, bindTabs, methodsHtml, paidBlock, api, copyText, compressImage, ADMIN_WHATSAPP };
})();
