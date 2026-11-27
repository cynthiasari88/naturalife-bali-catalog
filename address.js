/* Naturalife Bali — checkout address: Provinsi → Kota/Kabupaten → Kecamatan → Kelurahan/Desa, postal code autofill,
   WhatsApp/name validation and "remember me". Data: /wilayah/*.json, built from Kepmendagri No 300.2.2-2430 Tahun 2025
   (github.com/cahyadsn/wilayah, MIT) and github.com/cahyadsn/wilayah_kodepos (MIT). */
(() => {
  "use strict";
  const BASE = "/wilayah/";
  const STORE_KEY = "nl-checkout-v1";
  const form = document.getElementById("checkout-form");
  if (!form) return;

  const COPY = {
    en: { whatsapp: "WhatsApp number", whatsappHint: "We confirm shipping and payment on this number.", province: "Province", regency: "City / Regency", district: "District (Kecamatan)", village: "Village (Kelurahan / Desa)", street: "Street address", streetPh: "Street name, house number, RT/RW, building, landmark", postal: "Postal code", optional: "optional", choose: "Select…", provinceFirst: "Select a province first", regencyFirst: "Select a city or regency first", districtFirst: "Select a district first", loading: "Loading…", postalAuto: "Filled in automatically from the village.", postalPick: "Choose a village to fill this in automatically.", preview: "Delivery address", remember: "Remember my details on this device", loadFail: "The address list could not be loaded. Type your city, district and province instead.", manualCity: "City, district and province", phoneInvalid: "Enter an active WhatsApp number, for example 0812 3456 7890 or +62 812 3456 7890.", phoneLocal: "Indonesian WhatsApp numbers start with 08 or +628.", nameInvalid: "Enter the recipient’s full name.", postalInvalid: "Postal codes have 5 digits.", retry: "Try again" },
    id: { whatsapp: "Nomor WhatsApp", whatsappHint: "Admin akan konfirmasi ongkir dan pembayaran lewat nomor ini.", province: "Provinsi", regency: "Kota / Kabupaten", district: "Kecamatan", village: "Kelurahan / Desa", street: "Alamat jalan", streetPh: "Nama jalan, nomor rumah, RT/RW, gedung, patokan", postal: "Kode pos", optional: "opsional", choose: "Pilih…", provinceFirst: "Pilih provinsi dulu", regencyFirst: "Pilih kota/kabupaten dulu", districtFirst: "Pilih kecamatan dulu", loading: "Memuat…", postalAuto: "Terisi otomatis dari kelurahan/desa.", postalPick: "Pilih kelurahan/desa agar terisi otomatis.", preview: "Alamat pengiriman", remember: "Simpan data saya di perangkat ini", loadFail: "Daftar wilayah gagal dimuat. Silakan ketik kota, kecamatan, dan provinsi Anda.", manualCity: "Kota, kecamatan, dan provinsi", phoneInvalid: "Masukkan nomor WhatsApp aktif, contoh 0812 3456 7890 atau +62 812 3456 7890.", phoneLocal: "Nomor WhatsApp Indonesia diawali 08 atau +628.", nameInvalid: "Masukkan nama lengkap penerima.", postalInvalid: "Kode pos terdiri dari 5 angka.", retry: "Coba lagi" },
    ru: { whatsapp: "Номер WhatsApp", whatsappHint: "По этому номеру мы подтвердим доставку и оплату.", province: "Провинция", regency: "Город / округ", district: "Район (кечаматан)", village: "Квартал / деревня (келурахан / деса)", street: "Улица и дом", streetPh: "Улица, номер дома, RT/RW, здание, ориентир", postal: "Почтовый индекс", optional: "необязательно", choose: "Выберите…", provinceFirst: "Сначала выберите провинцию", regencyFirst: "Сначала выберите город или округ", districtFirst: "Сначала выберите район", loading: "Загрузка…", postalAuto: "Заполнено автоматически по кварталу.", postalPick: "Выберите квартал, чтобы заполнить автоматически.", preview: "Адрес доставки", remember: "Запомнить мои данные на этом устройстве", loadFail: "Не удалось загрузить список адресов. Укажите город, район и провинцию вручную.", manualCity: "Город, район и провинция", phoneInvalid: "Введите действующий номер WhatsApp, например +62 812 3456 7890.", phoneLocal: "Индонезийские номера WhatsApp начинаются с 08 или +628.", nameInvalid: "Введите полное имя получателя.", postalInvalid: "Почтовый индекс состоит из 5 цифр.", retry: "Повторить" }
  };

  const f = name => form.elements[name];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let lang = (document.getElementById("language") || {}).value || "en";
  const c = key => (COPY[lang] || COPY.en)[key];

  let provinces = null, provincesPromise = null, provinceData = null, manual = false, restoring = false;
  const cache = {};

  /* ---------- data ---------- */
  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  function loadProvinces() {
    if (!provincesPromise) provincesPromise = getJSON(BASE + "provinces.json").then(d => (provinces = d.p)).catch(e => { provincesPromise = null; throw e; });
    return provincesPromise;
  }
  function loadProvince(code) {
    if (!cache[code]) cache[code] = getJSON(BASE + encodeURIComponent(code) + ".json").then(d => d.r).catch(e => { delete cache[code]; throw e; });
    return cache[code];
  }
  const sel = () => {
    const p = f("province").value, r = f("regency").value, d = f("district").value, v = f("village").value;
    const prov = provinces && provinces.find(x => x[0] === p);
    const reg = provinceData && r !== "" ? provinceData[+r] : null;
    const dis = reg && d !== "" ? reg[1][+d] : null;
    const vil = dis && v !== "" ? dis[1][+v] : null;
    return { prov, reg, dis, vil };
  };

  /* ---------- select helpers ---------- */
  function fill(select, items, placeholder, enabled) {
    select.innerHTML = '<option value="">' + esc(placeholder) + "</option>" + items.map(([value, label]) => '<option value="' + esc(value) + '">' + esc(label) + "</option>").join("");
    select.disabled = !enabled;
    select.value = "";
  }
  function resetBelow(level) {
    if (level <= 1) { provinceData = level === 0 ? provinceData : null; fill(f("regency"), [], c("provinceFirst"), false); }
    if (level <= 2) fill(f("district"), [], c("regencyFirst"), false);
    if (level <= 3) fill(f("village"), [], c("districtFirst"), false);
  }
  function setPostal(code, auto) {
    f("postal_code").value = code || "";
    f("postal_code").setCustomValidity("");
    const hint = form.querySelector("[data-postal-hint]");
    if (hint) hint.textContent = auto ? c("postalAuto") : (f("district").value !== "" && !code ? c("postalPick") : "");
  }

  async function initProvinces() {
    const p = f("province");
    if (provinces) return;
    p.disabled = true;
    p.innerHTML = '<option value="">' + esc(c("loading")) + "</option>";
    try {
      await loadProvinces();
      fill(p, provinces.map(x => [x[0], x[1]]), c("choose"), true);
      setManual(false);
    } catch (e) {
      console.warn("Province list unavailable", e);
      setManual(true);
    }
  }

  async function onProvince() {
    resetBelow(1);
    setPostal("", false);
    const code = f("province").value;
    if (!code) { update(); return; }
    const r = f("regency");
    r.innerHTML = '<option value="">' + esc(c("loading")) + "</option>";
    try {
      const data = await loadProvince(code);
      if (f("province").value !== code) return; // user changed province while loading
      provinceData = data;
      fill(r, data.map((x, i) => [i, x[0]]), c("choose"), true);
    } catch (e) {
      console.warn("Province data unavailable", e);
      setManual(true);
    }
    update();
  }
  function onRegency() {
    resetBelow(2);
    setPostal("", false);
    const { reg } = sel();
    if (reg) fill(f("district"), reg[1].map((x, i) => [i, x[0]]), c("choose"), true);
    update();
  }
  function onDistrict() {
    resetBelow(3);
    const { dis } = sel();
    if (dis) {
      fill(f("village"), dis[1].map((x, i) => [i, x[0]]), c("choose"), true);
      const codes = [...new Set(dis[1].map(v => v[1]))];
      setPostal(codes.length === 1 ? codes[0] : "", codes.length === 1);
    } else setPostal("", false);
    update();
  }
  function onVillage() {
    const { vil } = sel();
    if (vil) setPostal(vil[1], true); else onDistrictPostalOnly();
    update();
  }
  function onDistrictPostalOnly() {
    const { dis } = sel();
    const codes = dis ? [...new Set(dis[1].map(v => v[1]))] : [];
    setPostal(codes.length === 1 ? codes[0] : "", codes.length === 1);
  }

  /* ---------- manual fallback (if the region files cannot be loaded) ---------- */
  function setManual(on) {
    manual = on;
    form.querySelectorAll("[data-addr-cascade]").forEach(el => { el.hidden = on; });
    ["province", "regency", "district"].forEach(n => { f(n).required = !on; });
    const m = form.querySelector("[data-addr-manual]");
    if (m) m.hidden = !on;
    f("city_manual").required = on;
    const note = form.querySelector("[data-addr-note]");
    if (note) note.hidden = !on;
  }

  /* ---------- validation ---------- */
  function normalizePhone(raw) {
    let d = String(raw || "").replace(/[^\d+]/g, "");
    const plus = d.startsWith("+");
    d = d.replace(/\D/g, "");
    if (!plus) {
      if (d.startsWith("0")) d = "62" + d.slice(1);
      else if (d.startsWith("8")) d = "62" + d;
    }
    return d;
  }
  function phoneError(raw) {
    if (!String(raw || "").trim()) return ""; // "required" handles empty
    const d = normalizePhone(raw);
    if (d.length < 9 || d.length > 15) return c("phoneInvalid");
    if (d.startsWith("62") && d[2] !== "8") return c("phoneLocal");
    return "";
  }
  function validateFields() {
    const phone = f("phone"), name = f("customer_name"), postal = f("postal_code");
    phone.setCustomValidity(phoneError(phone.value));
    const n = name.value.trim();
    name.setCustomValidity(name.value && n.replace(/\s+/g, "").length < 2 ? c("nameInvalid") : "");
    const pc = postal.value.trim();
    postal.setCustomValidity(pc && !/^\d{5}$/.test(pc) ? c("postalInvalid") : "");
  }

  /* ---------- composed address ---------- */
  function compose() {
    const street = f("street").value.trim().replace(/\s+/g, " ");
    const postal = f("postal_code").value.trim();
    if (manual) {
      const city = f("city_manual").value.trim();
      return { address: street, city, postal, full: [street, city, postal].filter(Boolean).join(", ") };
    }
    const { prov, reg, dis, vil } = sel();
    const address = [street, vil ? vil[0] : "", dis ? "Kec. " + dis[0] : ""].filter(Boolean).join(", ");
    const city = [reg ? reg[0] : "", prov ? prov[1] : ""].filter(Boolean).join(", ");
    return { address, city, postal, full: [address, city, postal].filter(Boolean).join(", ") };
  }
  function update() {
    const box = form.querySelector("[data-address-preview]");
    if (!box) return;
    const { full } = compose();
    box.hidden = !full;
    box.querySelector("p").textContent = full;
    form.dispatchEvent(new CustomEvent("nl-address-change"));
  }

  /* ---------- remember me ---------- */
  function save() {
    try {
      if (!f("remember").checked) { localStorage.removeItem(STORE_KEY); return; }
      const { prov, reg, dis, vil } = sel();
      localStorage.setItem(STORE_KEY, JSON.stringify({
        name: f("customer_name").value.trim(), phone: f("phone").value.trim(), street: f("street").value.trim(),
        postal: f("postal_code").value.trim(), city_manual: manual ? f("city_manual").value.trim() : "",
        province: prov ? prov[0] : "", regency: reg ? reg[0] : "", district: dis ? dis[0] : "", village: vil ? vil[0] : ""
      }));
    } catch (e) { /* storage unavailable */ }
  }
  function pick(select, name) {
    const opt = [...select.options].find(o => o.textContent === name);
    if (!opt) return false;
    select.value = opt.value;
    return true;
  }
  async function restore() {
    let s;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { s = null; }
    if (!s || restoring || f("customer_name").value || f("street").value) return;
    restoring = true;
    try {
      f("customer_name").value = s.name || "";
      f("phone").value = s.phone || "";
      f("street").value = s.street || "";
      if (manual) f("city_manual").value = s.city_manual || "";
      if (!manual && s.province && pick(f("province"), (provinces.find(p => p[0] === s.province) || [])[1])) {
        await onProvince();
        if (s.regency && pick(f("regency"), s.regency)) {
          onRegency();
          if (s.district && pick(f("district"), s.district)) {
            onDistrict();
            if (s.village && pick(f("village"), s.village)) onVillage();
          }
        }
      }
      if (s.postal) setPostal(s.postal, false);
      validateFields();
      update();
    } finally { restoring = false; }
  }

  /* ---------- language ---------- */
  function setLang(value) {
    lang = COPY[value] ? value : "en";
    form.querySelectorAll("[data-addr]").forEach(el => { el.textContent = c(el.dataset.addr); });
    f("street").placeholder = c("streetPh");
    // refresh placeholder rows without losing selections
    [["province", provinces ? c("choose") : c("loading")], ["regency", f("province").value ? c("choose") : c("provinceFirst")], ["district", f("regency").value !== "" ? c("choose") : c("regencyFirst")], ["village", f("district").value !== "" ? c("choose") : c("districtFirst")]]
      .forEach(([n, text]) => { const o = f(n).options[0]; if (o && o.value === "") o.textContent = text; });
    validateFields();
    onPostalHintOnly();
  }
  function onPostalHintOnly() {
    const hint = form.querySelector("[data-postal-hint]");
    if (!hint) return;
    const { vil, dis } = sel();
    const single = dis && new Set(dis[1].map(v => v[1])).size === 1;
    hint.textContent = vil || (single && f("postal_code").value) ? c("postalAuto") : (dis && !f("postal_code").value ? c("postalPick") : "");
  }

  /* ---------- public API for app.js ---------- */
  window.NLAddress = {
    collect() {
      validateFields();
      const name = f("customer_name").value.trim().replace(/\s+/g, " ");
      const phone = normalizePhone(f("phone").value);
      const a = compose();
      return { ok: true, name, phone: phone ? "+" + phone : "", address: a.address, city: a.city, postal_code: a.postal };
    },
    remember: save,
    /** Postal code used for shipping rates: the typed/auto-filled one, else the most common code in the chosen district. */
    ratePostal() {
      const pc = f("postal_code").value.trim();
      if (/^\d{5}$/.test(pc)) return pc;
      if (manual) return "";
      const { dis } = sel();
      if (!dis) return "";
      const count = {};
      dis[1].forEach(v => { count[v[1]] = (count[v[1]] || 0) + 1; });
      return Object.keys(count).sort((a, b) => count[b] - count[a])[0] || "";
    },
    region() {
      const { prov, reg, dis } = sel();
      return { province: prov ? prov[1] : "", regency: reg ? reg[0] : "", district: dis ? dis[0] : "" };
    },
    open: async () => { await initProvinces(); await restore(); update(); }
  };

  /* ---------- wiring ---------- */
  f("province").addEventListener("change", onProvince);
  f("regency").addEventListener("change", onRegency);
  f("district").addEventListener("change", onDistrict);
  f("village").addEventListener("change", onVillage);
  ["street", "city_manual", "postal_code"].forEach(n => f(n).addEventListener("input", update));
  ["phone", "customer_name", "postal_code"].forEach(n => f(n).addEventListener("input", validateFields));
  f("postal_code").addEventListener("input", () => { f("postal_code").value = f("postal_code").value.replace(/\D/g, "").slice(0, 5); const h = form.querySelector("[data-postal-hint]"); if (h) h.textContent = ""; });
  form.addEventListener("reset", () => setTimeout(() => {
    if (provinces) fill(f("province"), provinces.map(x => [x[0], x[1]]), c("choose"), true);
    provinceData = null; resetBelow(1); setPostal("", false); update();
  }, 0));
  const lang$ = document.getElementById("language");
  if (lang$) lang$.addEventListener("change", e => setLang(e.target.value));
  const btn = document.getElementById("checkout-button");
  if (btn) btn.addEventListener("click", () => window.NLAddress.open());
  resetBelow(1);
  setLang(lang);
})();
