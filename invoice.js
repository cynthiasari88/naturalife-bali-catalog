/* Naturalife Bali — online invoice: loads the order with its private link (order number + token), shows payment details,
   lets the customer report payment, print, or download a PDF. */
(() => {
  "use strict";
  const P = window.NLPay;
  const params = new URLSearchParams(location.search);
  const orderNumber = params.get("o") || "", token = params.get("t") || "";
  const L = ["en", "id", "ru"].includes(params.get("lang")) ? params.get("lang") : "id";
  const root = document.getElementById("invoice");
  document.documentElement.lang = L;

  const TXT = {
    en: { invoice: "Invoice", date: "Date", from: "From", billTo: "Bill to", shipVia: "Shipping", product: "Product", qty: "Qty", price: "Price", amount: "Amount", subtotal: "Subtotal", shipping: "Shipping", total: "Total", totalSoFar: "Total so far", feePending: "to be confirmed", notes: "Notes", payHow: "How to pay", status: { unpaid: "Unpaid", pending: "Payment being verified", paid: "Paid", failed: "Payment failed", refunded: "Refunded" }, loading: "Loading invoice…", notFound: "Invoice not found", notFoundText: "This invoice link is not valid. Please use the link from your order confirmation, or message us on WhatsApp.", error: "The invoice could not be loaded. Please check your connection and try again.", print: "Print", pdf: "Download PDF", making: "Preparing PDF…", thanks: "Thank you for shopping with Naturalife Bali.", back: "← Naturalife Bali" },
    id: { invoice: "Invoice", date: "Tanggal", from: "Dari", billTo: "Ditagihkan kepada", shipVia: "Pengiriman", product: "Produk", qty: "Jml", price: "Harga", amount: "Total", subtotal: "Subtotal", shipping: "Ongkos kirim", total: "Total", totalSoFar: "Total sementara", feePending: "menunggu konfirmasi", notes: "Catatan", payHow: "Cara pembayaran", status: { unpaid: "Belum dibayar", pending: "Pembayaran sedang diverifikasi", paid: "Lunas", failed: "Pembayaran gagal", refunded: "Dikembalikan" }, loading: "Memuat invoice…", notFound: "Invoice tidak ditemukan", notFoundText: "Link invoice ini tidak valid. Gunakan link dari konfirmasi pesanan Anda, atau hubungi kami lewat WhatsApp.", error: "Invoice gagal dimuat. Periksa koneksi internet lalu coba lagi.", print: "Cetak", pdf: "Unduh PDF", making: "Menyiapkan PDF…", thanks: "Terima kasih telah berbelanja di Naturalife Bali.", back: "← Naturalife Bali" },
    ru: { invoice: "Счёт", date: "Дата", from: "Продавец", billTo: "Покупатель", shipVia: "Доставка", product: "Товар", qty: "Кол-во", price: "Цена", amount: "Сумма", subtotal: "Сумма товаров", shipping: "Доставка", total: "Итого", totalSoFar: "Предварительно", feePending: "уточняется", notes: "Примечание", payHow: "Как оплатить", status: { unpaid: "Не оплачен", pending: "Оплата проверяется", paid: "Оплачен", failed: "Ошибка оплаты", refunded: "Возврат" }, loading: "Загрузка счёта…", notFound: "Счёт не найден", notFoundText: "Ссылка недействительна. Используйте ссылку из подтверждения заказа или напишите нам в WhatsApp.", error: "Не удалось загрузить счёт. Проверьте подключение и попробуйте снова.", print: "Печать", pdf: "Скачать PDF", making: "Подготовка PDF…", thanks: "Спасибо за покупку в Naturalife Bali.", back: "← Naturalife Bali" }
  }[L];
  const COURIER = { jne_regular: "JNE", jne_trucking: "JNE Trucking (JTR)", gosend: "GoSend", grabexpress: "GrabExpress" };
  const esc = P.esc, money = P.money;
  document.getElementById("loading-text").textContent = TXT.loading;

  const invNo = n => "NLB-" + String(n).padStart(5, "0");
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString(L === "en" ? "en-GB" : L === "ru" ? "ru-RU" : "id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" }); } catch (e) { return ""; } };

  function splitNotes(text) {
    const lines = String(text || "").split("\n");
    const tag = lines[0] && /^\[Ongkir (.+?):/.exec(lines[0]);
    return { service: tag ? tag[1] : "", notes: (tag ? lines.slice(1) : lines).join("\n").trim() };
  }

  function render(o) {
    const status = TXT.status[o.payment_status] ? o.payment_status : "unpaid";
    const feeKnown = o.delivery_fee > 0;
    const total = feeKnown ? o.subtotal + o.delivery_fee : o.subtotal;
    const { service, notes } = splitNotes(o.delivery_instructions);
    const courier = service || COURIER[o.preferred_courier] || o.preferred_courier || "—";
    document.title = TXT.invoice + " " + invNo(o.order_number) + " · Naturalife Bali";
    root.innerHTML =
      '<article class="sheet" id="sheet">' +
      '<header class="top"><div class="brand"><img src="logo.png" alt="Naturalife Bali" crossorigin="anonymous"><p>Naturalife Bali<br>Jl. Tirta Nadi II No.15, Sanur, Denpasar, Bali</p></div>' +
      '<div class="title"><h1>' + esc(TXT.invoice) + "</h1><p>" + esc(invNo(o.order_number)) + "</p><p>" + esc(TXT.date) + ": " + esc(fmtDate(o.created_at)) + "</p>" +
      '<span class="badge ' + status + '">' + esc(TXT.status[status]) + "</span></div></header>" +
      '<section class="parties"><div><h2>' + esc(TXT.billTo) + "</h2><p><strong>" + esc(o.customer_name) + "</strong><br>" + esc(o.phone) + "<br>" + esc([o.address, o.city, o.postal_code].filter(Boolean).join(", ")) + "</p></div>" +
      "<div><h2>" + esc(TXT.shipVia) + "</h2><p>" + esc(courier) + "</p></div></section>" +
      "<table><thead><tr><th>" + esc(TXT.product) + '</th><th class="n">' + esc(TXT.qty) + '</th><th class="n">' + esc(TXT.price) + '</th><th class="n">' + esc(TXT.amount) + "</th></tr></thead><tbody>" +
      o.items.map(i => "<tr><td>" + esc(i.name) + '</td><td class="n">' + i.qty + '</td><td class="n">' + esc(money(i.unit_price)) + '</td><td class="n">' + esc(money(i.line_total)) + "</td></tr>").join("") +
      "</tbody></table>" +
      '<div class="totals"><div><span>' + esc(TXT.subtotal) + "</span><span>" + esc(money(o.subtotal)) + "</span></div>" +
      "<div><span>" + esc(TXT.shipping) + "</span><span>" + (feeKnown ? esc(money(o.delivery_fee)) : esc(TXT.feePending)) + "</span></div>" +
      '<div class="grand"><span>' + esc(feeKnown ? TXT.total : TXT.totalSoFar) + "</span><span>" + esc(money(total)) + "</span></div></div>" +
      (notes ? '<div class="notes"><strong>' + esc(TXT.notes) + ":</strong> " + esc(notes) + "</div>" : "") +
      (status === "paid" ? "" :
        '<section class="pay"><h2>' + esc(TXT.payHow) + "</h2>" + P.methodsHtml(L, o.payment_method === "bank_transfer" ? "bank_transfer" : "qris", total) +
        (feeKnown ? "" : '<p class="pay-note warn">' + esc(P.t(L, "feePendingNote")) + "</p>") + '<div class="pay-paid"></div></section>') +
      '<p class="foot">' + esc(TXT.thanks) + "</p></article>";

    let method = o.payment_method === "bank_transfer" ? "bank_transfer" : "qris";
    P.bindCopy(root);
    P.bindTabs(root, m => { method = m; });
    const paid = root.querySelector(".pay-paid");
    if (paid) P.paidBlock(paid, { lang: L, orderNumber: o.order_number, token, getMethod: () => method, status, onDone: () => setTimeout(load, 600) });
    const tb = document.getElementById("toolbar");
    tb.hidden = false;
    tb.querySelector("a").textContent = TXT.back;
    document.getElementById("print-btn").textContent = TXT.print;
    document.getElementById("pdf-btn").textContent = TXT.pdf;
  }

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }

  async function downloadPdf() {
    const btn = document.getElementById("pdf-btn"), sheet = document.getElementById("sheet");
    if (!sheet) return;
    btn.disabled = true; btn.textContent = TXT.making;
    try {
      if (!window.html2canvas) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      if (!window.jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      document.body.classList.add("pdf-mode");
      const canvas = await window.html2canvas(sheet, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: 820 });
      document.body.classList.remove("pdf-mode");
      const pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      const pw = 210, ph = 297, margin = 10, w = pw - margin * 2, h = canvas.height * w / canvas.width;
      const img = canvas.toDataURL("image/jpeg", 0.92);
      let y = 0;
      while (y < h) {
        if (y > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", margin, margin - y, w, h);
        y += ph - margin * 2;
      }
      pdf.save("Invoice-" + invNo(orderNumber) + ".pdf");
    } catch (e) {
      console.error("PDF failed", e);
      document.body.classList.remove("pdf-mode");
      window.print();
    } finally { btn.disabled = false; btn.textContent = TXT.pdf; }
  }

  async function load() {
    try {
      const r = await P.api({ action: "invoice", order_number: orderNumber, token });
      render(r.order);
    } catch (e) {
      const notFound = /Invalid|not found/i.test(e.message || "");
      root.innerHTML = '<div class="state"><h1>' + esc(notFound ? TXT.notFound : TXT.invoice) + "</h1><p>" + esc(notFound ? TXT.notFoundText : TXT.error) + "</p></div>";
    }
  }

  document.getElementById("print-btn").onclick = () => window.print();
  document.getElementById("pdf-btn").onclick = downloadPdf;
  if (!/^\d+$/.test(orderNumber) || !/^[0-9a-f]{24}$/.test(token)) {
    root.innerHTML = '<div class="state"><h1>' + esc(TXT.notFound) + "</h1><p>" + esc(TXT.notFoundText) + "</p></div>";
  } else load();
})();
