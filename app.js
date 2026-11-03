const SUPABASE_URL = "https://fvxbssqitctrdmxysiqb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2O8WRCv_BAhL7BEVtnTgfQ_GfGzIgFR";
const ORDER_ENDPOINT = SUPABASE_URL + "/functions/v1/submit-store-order";

const tr = {
  en: { eyebrow:"GOOD FOOD · BETTER EVERYDAY", heroTitle:"Simple choices.<br><em>Feel-good living.</em>", heroText:"Discover quality ingredients and thoughtfully selected food products from Naturalife Bali.", browse:"Explore the catalog ↓", ourSelection:"OUR SELECTION", catalogTitle:"Shop the catalog", yourOrder:"YOUR ORDER", cartTitle:"Shopping cart", subtotal:"Subtotal", shippingNote:"Shipping is calculated and confirmed manually by our team.", checkout:"Continue to checkout", deliveryDetails:"DELIVERY DETAILS", checkoutTitle:"Almost there", fullName:"Full name", address:"Full delivery address", city:"City / District", postal:"Postal code", courier:"Preferred delivery", payment:"Payment preference", instructions:"Delivery instructions (optional)", shippingDisclaimer:"Shipping and payment details will be confirmed by admin via WhatsApp after stock checking.", submitOrder:"Submit order request", add:"Add", all:"All", search:"Search products…", empty:"Your cart is empty.", loading:"Loading products…", noProducts:"No products are currently available. Please check back soon.", unavailable:"Out of stock", success:"Your order request was received. Order number: ", failed:"We could not submit your order. Please try again or contact us on WhatsApp.", stock:"Stock", unit:"Unit" },
  id: { eyebrow:"MAKAN BAIK · HIDUP LEBIH BAIK", heroTitle:"Pilihan sederhana.<br><em>Hidup lebih sehat.</em>", heroText:"Temukan bahan makanan berkualitas dan produk pilihan dari Naturalife Bali.", browse:"Jelajahi katalog ↓", ourSelection:"PILIHAN KAMI", catalogTitle:"Belanja katalog", yourOrder:"PESANAN ANDA", cartTitle:"Keranjang belanja", subtotal:"Subtotal", shippingNote:"Ongkir dihitung dan dikonfirmasi manual oleh tim kami.", checkout:"Lanjut ke checkout", deliveryDetails:"DETAIL PENGIRIMAN", checkoutTitle:"Hampir selesai", fullName:"Nama lengkap", address:"Alamat pengiriman lengkap", city:"Kota / Kecamatan", postal:"Kode pos", courier:"Pilihan pengiriman", payment:"Preferensi pembayaran", instructions:"Petunjuk pengiriman (opsional)", shippingDisclaimer:"Ongkir dan pembayaran akan dikonfirmasi admin melalui WhatsApp setelah pengecekan stok.", submitOrder:"Kirim permintaan pesanan", add:"Tambah", all:"Semua", search:"Cari produk…", empty:"Keranjang masih kosong.", loading:"Memuat produk…", noProducts:"Belum ada produk yang tersedia. Silakan cek kembali nanti.", unavailable:"Stok habis", success:"Permintaan pesanan berhasil diterima. Nomor pesanan: ", failed:"Pesanan belum dapat dikirim. Silakan coba lagi atau hubungi kami melalui WhatsApp.", stock:"Stok", unit:"Satuan" },
  ru: { eyebrow:"ХОРОШАЯ ЕДА · КАЖДЫЙ ДЕНЬ", heroTitle:"Простой выбор.<br><em>Хорошее самочувствие.</em>", heroText:"Качественные ингредиенты и продукты Naturalife Bali.", browse:"Открыть каталог ↓", ourSelection:"НАШ ВЫБОР", catalogTitle:"Каталог товаров", yourOrder:"ВАШ ЗАКАЗ", cartTitle:"Корзина", subtotal:"Подытог", shippingNote:"Стоимость доставки рассчитывается и подтверждается администратором.", checkout:"Перейти к оформлению", deliveryDetails:"ДАННЫЕ ДОСТАВКИ", checkoutTitle:"Почти готово", fullName:"Полное имя", address:"Полный адрес доставки", city:"Город / Район", postal:"Почтовый индекс", courier:"Способ доставки", payment:"Способ оплаты", instructions:"Инструкции по доставке", shippingDisclaimer:"Стоимость доставки и оплата будут подтверждены администратором в WhatsApp после проверки наличия.", submitOrder:"Отправить запрос", add:"Добавить", all:"Все", search:"Поиск товаров…", empty:"Корзина пуста.", loading:"Загрузка товаров…", noProducts:"Сейчас нет доступных товаров.", unavailable:"Нет в наличии", success:"Запрос принят. Номер заказа: ", failed:"Не удалось отправить заказ. Попробуйте ещё раз или свяжитесь с нами в WhatsApp.", stock:"Остаток", unit:"Ед." }
};

let products = [];
let cart = {};
let category = "All";
let lang = "en";
let submitting = false;
let storeSettings = null;

const money = n => new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(Number(n) || 0);
const t = key => tr[lang][key] || key;
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const courierMap = { "JNE Regular":"jne_regular", "JNE Trucking (JTR)":"jne_trucking", "GoSend":"gosend", "GrabExpress":"grabexpress" };

async function loadProducts() {
  const grid = document.querySelector("#product-grid");
  grid.innerHTML = '<p class="catalog-note">' + esc(t("loading")) + '</p>';
  try {
    const response = await fetch(SUPABASE_URL + "/rest/v1/store_catalog?select=id,name,category,weight,price,short_description,image_url,featured,stock_quantity,stock_status&active=eq.true&order=featured.desc,name.asc", {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY }
    });
    if (!response.ok) throw new Error("Catalog request failed: " + response.status);
    products = await response.json();
    products = products.filter(p => p && p.id && p.name);
    document.querySelector(".catalog-note")?.remove();
    renderFilters();
    renderProducts();
    renderCart();
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="catalog-note">' + esc(t("noProducts")) + '</p>';
  }
}

function renderFilters() {
  const cats = ["All", ...new Set(products.map(p => p.category || "Other"))];
  if (!cats.includes(category)) category = "All";
  document.querySelector("#category-filters").innerHTML = cats.map(c =>
    '<button class="filter ' + (c === category ? "active" : "") + '" data-category="' + esc(c) + '">' +
    (c === "All" ? esc(t("all")) : esc(c)) + '</button>'
  ).join("");
}

function renderProducts() {
  const q = document.querySelector("#search").value.toLowerCase().trim();
  const list = products.filter(p => (category === "All" || (p.category || "Other") === category) &&
    [p.name, p.category, p.short_description, p.weight].join(" ").toLowerCase().includes(q));
  const grid = document.querySelector("#product-grid");
  if (!list.length) {
    grid.innerHTML = '<p class="catalog-note">' + esc(t("noProducts")) + '</p>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const out = Number(p.stock_quantity) <= 0;
    const visual = p.image_url
      ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.name) + '" loading="lazy">'
      : esc(p.name.slice(0, 2).toUpperCase());
    return '<article class="product-card"><div class="product-visual">' + visual + '</div><div class="product-info">' +
      '<span class="product-category">' + esc(p.category || "Other") + '</span><h3>' + esc(p.name) + '</h3>' +
      '<p class="product-desc">' + esc(p.short_description || "") + (p.weight ? " · " + esc(p.weight) : "") + '</p>' +
      '<div class="product-bottom"><span class="price">' + money(p.price) + '</span>' +
      '<button class="add-button" data-add="' + esc(p.id) + '" ' + (out ? "disabled" : "") + '>' +
      (out ? esc(t("unavailable")) : esc(t("add")) + " +") + '</button></div></div></article>';
  }).join("");
}

function cartEntries() {
  return Object.entries(cart).filter(([, qty]) => qty > 0 && products.some(p => p.id === arguments[0]));
}
function cartTotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(x => x.id === id);
    return sum + (p ? Number(p.price) * qty : 0);
  }, 0);
}
function renderCart() {
  const entries = Object.entries(cart).filter(([id, qty]) => qty > 0 && products.some(p => p.id === id));
  document.querySelector("#cart-count").textContent = entries.reduce((s, [, q]) => s + q, 0);
  document.querySelector("#cart-items").innerHTML = entries.map(([id, qty]) => {
    const p = products.find(x => x.id === id);
    return '<div class="cart-line"><div><strong>' + esc(p.name) + '</strong><small>' + money(p.price) +
      (p.weight ? " · " + esc(p.weight) : "") + '</small></div><div class="qty-control">' +
      '<button data-qty="' + esc(id) + '" data-delta="-1" aria-label="Decrease quantity">−</button><b>' + qty +
      '</b><button data-qty="' + esc(id) + '" data-delta="1" aria-label="Increase quantity" ' +
      (qty >= Number(p.stock_quantity) ? "disabled" : "") + '>+</button></div></div>';
  }).join("") || '<p class="catalog-note">' + esc(t("empty")) + '</p>';
  document.querySelector("#cart-subtotal").textContent = money(cartTotal());
  document.querySelector("#checkout-subtotal").textContent = money(cartTotal());
}

function openCart(show) {
  document.querySelector("#cart-panel").classList.toggle("open", show);
  document.querySelector("#cart-panel").setAttribute("aria-hidden", String(!show));
}



function renderBrandLogo(url){
 const brand=document.querySelector(".site-header .brand");
 if(!brand)return;
 let img=brand.querySelector(".brand-logo-image");
 if(url){if(!img){img=document.createElement("img");img.className="brand-logo-image";img.alt="Naturalife Bali";brand.prepend(img);}img.src=url;brand.querySelector(".brand-mark")?.setAttribute("hidden","");}
 else{img?.remove();brand.querySelector(".brand-mark")?.removeAttribute("hidden");}
}
function renderWhatsAppCare(settings){
 document.querySelector("#whatsapp-care")?.remove();
 if(!settings||settings.whatsapp_widget_enabled===false||!settings.whatsapp_number)return;
 const number=String(settings.whatsapp_number).replace(/[^0-9]/g,"");
 if(!number)return;
 const greeting=lang==="id"?(settings.whatsapp_greeting_id||"Halo! Ada yang bisa kami bantu?"):lang==="ru"?(settings.whatsapp_greeting_ru||"Здравствуйте! Чем мы можем вам помочь?"):(settings.whatsapp_greeting_en||"Hello! How can we help you?");
 const message=settings.whatsapp_prefill_message||"Hello Naturalife Bali, I have a question about your products.";
 const root=document.createElement("div");root.id="whatsapp-care";root.className="whatsapp-care";
 root.innerHTML='<div class="whatsapp-popover" id="whatsapp-popover"><button class="whatsapp-close" type="button" aria-label="Close">×</button><strong>Naturalife Customer Care</strong><p>'+esc(greeting)+'</p><a target="_blank" rel="noopener" href="https://wa.me/'+number+'?text='+encodeURIComponent(message)+'">'+(lang==="id"?"Mulai chat":lang==="ru"?"Начать чат":"Start chat")+' ↗</a></div><button class="whatsapp-fab" type="button" aria-label="Contact Naturalife on WhatsApp"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3.2A12.5 12.5 0 0 0 5.3 22.2L3.7 28l6-1.6A12.5 12.5 0 1 0 16 3.2Zm0 22.5c-2 0-4-.5-5.7-1.6l-.4-.2-3.4.9.9-3.3-.2-.4A10 10 0 1 1 16 25.7Zm5.5-7.5c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6s0-.4 0-.6-.7-1.7-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.2 1.4 3.4a12 12 0 0 0 4.6 4c.6.3 1.1.5 1.5.6.6.2 1.2.2 1.7.1.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4s-.3-.2-.6-.4Z"/></svg></button>';
 document.body.append(root);
 const pop=root.querySelector(".whatsapp-popover");root.querySelector(".whatsapp-fab").onclick=()=>pop.classList.toggle("open");root.querySelector(".whatsapp-close").onclick=()=>pop.classList.remove("open");
}

async function loadStorefrontSettings() {
  try {
    const response = await fetch(SUPABASE_URL + "/rest/v1/store_settings?select=*&id=eq.true&limit=1", {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY }
    });
    if (!response.ok) return;
    const rows = await response.json();
    storeSettings = rows[0] || null;
    renderBrandLogo(storeSettings?.brand_logo_url);
    renderWhatsAppCare(storeSettings);
    if (!storeSettings) return;
    const setting = storeSettings;
    const localized = key => lang === "id" ? (setting[key + "_id"] || setting[key]) : lang === "ru" ? (setting[key + "_ru"] || setting[key]) : setting[key];
    const hero = document.querySelector(".hero");
    if (hero) hero.hidden = setting.show_hero === false;
    const title = document.querySelector("[data-i18n='heroTitle']");
    if (title && localized("hero_title")) title.textContent = localized("hero_title");
    const eyebrow = document.querySelector("[data-i18n='eyebrow']");
    if (eyebrow && localized("hero_eyebrow")) eyebrow.textContent = localized("hero_eyebrow");
    const description = document.querySelector("[data-i18n='heroText']");
    if (description && localized("hero_description")) description.textContent = localized("hero_description");
    const footer = document.querySelector(".site-footer span");
    if (footer && setting.footer_text) footer.textContent = setting.footer_text;
    if (setting.site_name) {
      document.title = setting.site_name + " | Retail Catalog";
      document.querySelector(".brand strong").textContent = setting.site_name.toUpperCase();
      document.querySelector(".site-footer strong").textContent = setting.site_name.toUpperCase();
    }
    if (setting.primary_color) document.documentElement.style.setProperty("--green", setting.primary_color);
    if (setting.background_color) document.documentElement.style.setProperty("--ivory", setting.background_color);
    if (setting.catalog_columns) document.documentElement.style.setProperty("--catalog-columns", setting.catalog_columns);
    let bar = document.querySelector(".announcement-bar");
    const announcement = localized("announcement_text");
    if (announcement) {
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "announcement-bar";
        document.querySelector(".site-header").before(bar);
      }
      bar.textContent = announcement;
      bar.hidden = false;
    } else if (bar) bar.hidden = true;
  } catch (error) { console.warn("Store settings could not be loaded", error); }
}


const cmsCopy={
 en:{blogLabel:"KNOW YOUR INGREDIENTS",blogTitle:"Learn with Naturalife",blogIntro:"Practical guides, ingredient stories and ideas for everyday cooking.",faqLabel:"NEED TO KNOW",faqTitle:"Frequently asked questions",faqIntro:"Helpful answers about our products and ordering.",read:"Read article",noArticles:"New educational articles are coming soon.",noFaq:"Questions and answers will appear here soon."},
 id:{blogLabel:"KENALI BAHAN PANGAN",blogTitle:"Belajar bersama Naturalife",blogIntro:"Panduan praktis, cerita bahan pangan, dan inspirasi untuk memasak sehari-hari.",faqLabel:"INFORMASI PENTING",faqTitle:"Pertanyaan yang sering diajukan",faqIntro:"Jawaban seputar produk dan cara pemesanan.",read:"Baca artikel",noArticles:"Artikel edukasi akan segera hadir.",noFaq:"Informasi FAQ akan segera tersedia."},
 ru:{blogLabel:"УЗНАЙТЕ ИНГРЕДИЕНТЫ",blogTitle:"Полезное от Naturalife",blogIntro:"Практические советы, истории ингредиентов и идеи для повседневной кухни.",faqLabel:"ВАЖНАЯ ИНФОРМАЦИЯ",faqTitle:"Часто задаваемые вопросы",faqIntro:"Ответы о продуктах и оформлении заказов.",read:"Читать статью",noArticles:"Скоро появятся новые статьи.",noFaq:"Ответы на вопросы скоро появятся."}
};
let slideRows=[],articleRows=[],faqRows=[],activeSlide=0;
const localField=(row,key)=>row[key+"_"+lang]||row[key+"_en"]||"";
async function loadEditorialContent(){
 const headers={apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY};
 try{
  const [s,a,f]=await Promise.all([
   fetch(SUPABASE_URL+"/rest/v1/store_slides?select=*&active=eq.true&order=sort_order.asc",{headers}),
   fetch(SUPABASE_URL+"/rest/v1/store_articles?select=*&status=eq.published&order=published_at.desc",{headers}),
   fetch(SUPABASE_URL+"/rest/v1/store_faqs?select=*&active=eq.true&order=sort_order.asc",{headers})
  ]);
  if(s.ok)slideRows=await s.json();if(a.ok)articleRows=await a.json();if(f.ok)faqRows=await f.json();
  renderSlides();renderEditorial();
 }catch(e){console.warn("Editorial content unavailable",e);}
}
function renderSlides(){
 const section=document.querySelector("#slideshow"),track=document.querySelector("#slide-track"),dots=document.querySelector("#slide-dots");
 if(!slideRows.length){section.hidden=true;return;}section.hidden=false;activeSlide=Math.min(activeSlide,slideRows.length-1);
 track.innerHTML=slideRows.map((s,i)=>'<article class="slide '+(i===activeSlide?"active":"")+'">'+(s.image_url?'<img class="slide-image" src="'+esc(s.image_url)+'" alt="'+esc(s.image_alt||localField(s,"title"))+'">':'')+'<div class="slide-shade"></div><div class="slide-copy"><p class="eyebrow">'+esc(localField(s,"eyebrow"))+'</p><h2>'+esc(localField(s,"title"))+'</h2><p>'+esc(localField(s,"description"))+'</p>'+(localField(s,"button_label")?'<a class="slide-cta" href="'+esc(s.button_url||"#catalog")+'">'+esc(localField(s,"button_label"))+'</a>':'')+'</div></article>').join("");
 dots.innerHTML=slideRows.map((s,i)=>'<button class="slide-dot '+(i===activeSlide?"active":"")+'" data-slide-index="'+i+'" aria-label="Slide '+(i+1)+'"></button>').join("");
}
function moveSlide(delta){if(!slideRows.length)return;activeSlide=(activeSlide+delta+slideRows.length)%slideRows.length;renderSlides();}
document.querySelector("#slide-prev").onclick=()=>moveSlide(-1);document.querySelector("#slide-next").onclick=()=>moveSlide(1);
document.querySelector("#slide-dots").addEventListener("click",e=>{const b=e.target.closest("[data-slide-index]");if(b){activeSlide=Number(b.dataset.slideIndex);renderSlides();}});
function renderEditorial(){
 const c=cmsCopy[lang];document.querySelector("[data-label-blog]").textContent=c.blogLabel;document.querySelector("[data-title-blog]").textContent=c.blogTitle;document.querySelector("[data-intro-blog]").textContent=c.blogIntro;document.querySelector("[data-label-faq]").textContent=c.faqLabel;document.querySelector("[data-title-faq]").textContent=c.faqTitle;document.querySelector("[data-intro-faq]").textContent=c.faqIntro;
 document.querySelector("#article-grid").innerHTML=articleRows.length?articleRows.map(a=>'<article class="article-card">'+(a.cover_image_url?'<img src="'+esc(a.cover_image_url)+'" alt="'+esc(localField(a,"title"))+'" loading="lazy">':'')+'<div class="article-card-copy"><span class="product-category">'+esc(a.category)+' · '+Number(a.read_minutes||3)+' min</span><h3>'+esc(localField(a,"title"))+'</h3><p>'+esc(localField(a,"excerpt"))+'</p><details><summary>'+c.read+'</summary><div class="article-body">'+esc(localField(a,"content")).replace(/\n/g,"<br>")+'</div></details></div></article>').join(""):'<p class="catalog-note">'+c.noArticles+'</p>';
 document.querySelector("#faq-list").innerHTML=faqRows.length?faqRows.map(f=>'<details class="faq-item"><summary>'+esc(localField(f,"question"))+'</summary><div>'+esc(localField(f,"answer")).replace(/\n/g,"<br>")+'</div></details>').join(""):'<p class="catalog-note">'+c.noFaq+'</p>';
}

function setLang(value) {
  lang = value;
  document.documentElement.lang = value;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelector("#search").placeholder = t("search");
  renderFilters();
  renderProducts();
  renderCart();
  loadStorefrontSettings();
  renderEditorial();
  renderSlides();
}

document.addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  if (add) {
    const p = products.find(x => x.id === add.dataset.add);
    if (p && Number(p.stock_quantity) > (cart[p.id] || 0)) {
      cart[p.id] = (cart[p.id] || 0) + 1;
      renderCart();
    }
  }
  const qtyButton = event.target.closest("[data-qty]");
  if (qtyButton) {
    const id = qtyButton.dataset.qty;
    const p = products.find(x => x.id === id);
    cart[id] = Math.max(0, Math.min(Number(p?.stock_quantity || 0), (cart[id] || 0) + Number(qtyButton.dataset.delta)));
    if (!cart[id]) delete cart[id];
    renderCart();
  }
  const filter = event.target.closest("[data-category]");
  if (filter) {
    category = filter.dataset.category;
    renderFilters();
    renderProducts();
  }
  if (event.target.closest("[data-close-cart]")) openCart(false);
});

document.querySelector("#open-cart").onclick = () => openCart(true);
document.querySelector("#close-cart").onclick = () => openCart(false);
document.querySelector("#search").oninput = renderProducts;
document.querySelector("#language").onchange = event => setLang(event.target.value);

document.querySelector("#checkout-button").onclick = () => {
  if (!Object.values(cart).some(Boolean)) return;
  openCart(false);
  document.querySelector("#checkout-dialog").showModal();
};
document.querySelector("#close-checkout").onclick = () => document.querySelector("#checkout-dialog").close();

document.querySelector("#checkout-form").onsubmit = async event => {
  event.preventDefault();
  if (submitting) return;
  const form = event.currentTarget;
  const message = document.querySelector("#checkout-message");
  const submit = form.querySelector('[type="submit"]');
  const data = new FormData(form);
  const items = Object.entries(cart).filter(([, qty]) => qty > 0).map(([product_id, qty]) => ({ product_id, qty }));
  if (!items.length) { message.textContent = t("empty"); return; }

  const payload = {
    customer_name: String(data.get("customer_name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    address: String(data.get("address") || "").trim(),
    city: String(data.get("city") || "").trim(),
    postal_code: String(data.get("postal_code") || "").trim(),
    preferred_courier: courierMap[data.get("courier")] || "jne_regular",
    fulfillment_type: "delivery",
    delivery_instructions: String(data.get("delivery_notes") || "").trim(),
    payment_method: data.get("payment_method") === "QRIS" ? "qris" : "bank_transfer",
    items,
    website: String(data.get("website") || "")
  };

  submitting = true;
  submit.disabled = true;
  submit.textContent = lang === "id" ? "Mengirim…" : lang === "ru" ? "Отправка…" : "Submitting…";
  message.textContent = "";
  try {
    const response = await fetch(ORDER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Order submission failed");
    message.textContent = t("success") + result.order_number + ". " + (lang === "id" ? "Admin akan menghubungi Anda melalui WhatsApp untuk konfirmasi ongkir dan pembayaran." : lang === "ru" ? "Администратор свяжется с вами в WhatsApp для подтверждения доставки и оплаты." : "Admin will contact you on WhatsApp to confirm shipping and payment.");
    cart = {};
    form.reset();
    renderCart();
  } catch (error) {
    console.error(error);
    message.textContent = t("failed");
  } finally {
    submitting = false;
    submit.disabled = false;
    submit.textContent = t("submitOrder");
  }
};

setLang("en");
loadStorefrontSettings();
loadProducts();
loadEditorialContent();
