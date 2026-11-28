/* Naturalife Bali admin — Website appearance editor.
   Needs theme.js (data-config-only) and admin.js loaded first (uses db, $, settingsRow). */
(() => {
  "use strict";
  const T = window.NaturalifeTheme;
  const SLUG = T.SLUG;
  const MEDIA_BUCKETS = ["naturalife-media", "naturalife-store-media"];
  const DEVICES = { desktop: 1280, tablet: 820, mobile: 390 };
  let leaving = false, saved = null, state = null, loaded = false, loading = false, device = "desktop", frameStarted = false;

  const say = (sel, text, ok) => { const el = $(sel); if (!el) return; el.textContent = text; el.style.color = ok ? "#52795a" : "#a24b3e"; };
  const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("The database did not respond within " + ms / 1000 + " seconds. Check your internet connection and click Retry.")), ms))]);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const same = (a, b) => JSON.stringify(T.normalize(a)) === JSON.stringify(T.normalize(b));
  const opts = (...pairs) => pairs.map(([value, label]) => ({ value, label }));

  /* ---------- editor schema ---------- */
  const GROUPS = [
    { id: "presets", title: "Theme presets", desc: "Start from a finished look, then fine-tune it below.", open: true, custom: "presets" },
    { id: "colors", title: "Colors", desc: "Brand colors used across every storefront page.", open: true, layout: "colors", after: "contrast", fields: [
      { key: "primary", type: "color", label: "Primary brand color", hint: "Buttons, headings, links" },
      { key: "accent", type: "color", label: "Accent color", hint: "Highlights and illustrations" },
      { key: "background", type: "color", label: "Page background" },
      { key: "surface", type: "color", label: "Cards and panels" },
      { key: "text", type: "color", label: "Text color" },
      { key: "header_bg", type: "color", label: "Header background" },
      { key: "footer_bg", type: "color", label: "Footer background" },
      { key: "footer_text", type: "color", label: "Footer text" },
      { key: "announce_bg", type: "color", label: "Announcement bar" },
      { key: "announce_text", type: "color", label: "Announcement text" }
    ] },
    { id: "type", title: "Typography", desc: "Fonts for headings and body text.", after: "specimen", fields: [
      { key: "heading_font", type: "font", set: "heading", label: "Heading font" },
      { key: "body_font", type: "font", set: "body", label: "Body font" },
      { key: "text_size", type: "seg", label: "Text size", options: opts(["standard", "Standard"], ["large", "Large (easier to read)"]) }
    ] },
    { id: "layout", title: "Layout & style", desc: "Shapes, spacing and page width.", fields: [
      { key: "corners", type: "seg", label: "Corners", options: opts(["square", "Sharp"], ["soft", "Soft"], ["rounded", "Rounded"]) },
      { key: "button_shape", type: "seg", label: "Button shape", options: opts(["pill", "Pill"], ["rounded", "Rounded"], ["square", "Square"]) },
      { key: "card_style", type: "seg", label: "Card style", options: opts(["bordered", "Outlined"], ["elevated", "Shadow"], ["flat", "Flat"]) },
      { key: "container", type: "seg", label: "Content width", options: opts(["narrow", "Narrow"], ["standard", "Standard"], ["full", "Full width"]) },
      { key: "spacing", type: "seg", label: "Section spacing", options: opts(["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"]) },
      { key: "sticky_header", type: "toggle", label: "Keep header visible while scrolling" }
    ] },
    { id: "catalog", title: "Product catalog", desc: "How products are shown in the shop grid.", fields: [
      { key: "columns_desktop", type: "seg", label: "Products per row on desktop", options: opts(["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]) },
      { key: "columns_mobile", type: "seg", label: "Products per row on mobile", options: opts(["1", "1 (large photos)"], ["2", "2"]) },
      { key: "image_ratio", type: "seg", label: "Photo shape", options: opts(["fixed", "Fixed height"], ["square", "Square"], ["portrait", "Portrait 4:5"], ["landscape", "Landscape 4:3"]) },
      { key: "image_fit", type: "seg", label: "Photo framing", hint: "“Show whole product” suits packshots on a plain background.", options: opts(["cover", "Fill the frame"], ["contain", "Show whole product"]) },
      { key: "add_button", type: "seg", label: "Add to cart button", options: opts(["soft", "Soft"], ["solid", "Solid"], ["outline", "Outline"]) },
      { key: "show_filters", type: "toggle", label: "Show category filters" },
      { key: "show_search", type: "toggle", label: "Show product search" },
      { key: "show_descriptions", type: "toggle", label: "Show short descriptions on cards" },
      { key: "hover_effects", type: "toggle", label: "Lift cards on hover" }
    ] },
    { id: "hero", title: "Homepage hero", desc: "The welcome area at the top of the homepage.", fields: [
      { key: "show_hero", type: "toggle", label: "Show hero section", hint: "Hidden automatically when a published Visual Builder homepage is live." },
      { key: "hero_style", type: "seg", label: "Background", show: t => t.show_hero, options: opts(["gradient", "Soft gradient"], ["solid", "Solid color"], ["image", "Photo"], ["slides", "Slideshow"]) },
      { key: "hero_slide_count", type: "seg", label: "Number of slides", show: t => t.show_hero && t.hero_style === "slides", options: opts(["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"]) },
      { key: "hero_slide_interval", type: "seg", label: "Change slide every", show: t => t.show_hero && t.hero_style === "slides", options: opts(["4", "4 s"], ["6", "6 s"], ["8", "8 s"], ["10", "10 s"]) },
      { key: "hero_slide_fit", type: "seg", label: "Photo fit", hint: "Use “Show whole image” for banners and promos with text — nothing gets cut off and the hero takes the shape of your image.", show: t => t.show_hero && t.hero_style === "slides", options: opts(["cover", "Fill the hero (may crop edges)"], ["contain", "Show whole image"]) },
      { key: "hero_slides", type: "slides", label: "Slide photos", show: t => t.show_hero && t.hero_style === "slides" },
      { key: "hero_bg", type: "color", label: "Hero background color", show: t => t.show_hero && t.hero_style === "solid" },
      { key: "hero_image", type: "image", label: "Hero photo", hint: "Landscape JPG, PNG or WebP, ideally 2400 px wide (max 20 MB). Sizes for desktop, tablet and phone are created automatically.", show: t => t.show_hero && t.hero_style === "image" },
      { key: "hero_overlay", type: "range", label: "Photo darkening", hint: "Keeps the headline readable on busy photos.", min: 0, max: 85, unit: "%", show: t => t.show_hero && (t.hero_style === "image" || t.hero_style === "slides") },
      { key: "hero_text", type: "toggle", label: "Show headline, text and button", hint: "Turn off to show only the photos. The headline stays readable for Google and screen readers.", show: t => t.show_hero },
      { key: "hero_art", type: "toggle", label: "Show decorative card illustration", show: t => t.show_hero }
    ] },
    { id: "sections", title: "Homepage sections", desc: "Choose which parts of the homepage are visible.", fields: [
      { key: "show_announcement", type: "toggle", label: "Announcement bar", hint: "Text is edited in Homepage content." },
      { key: "show_slideshow", type: "toggle", label: "Slides & banners", hint: "Shown when at least one slide is published." },
      { key: "show_education", type: "toggle", label: "Learn / blog articles" },
      { key: "show_faq", type: "toggle", label: "FAQ" }
    ] },
    { id: "advanced", title: "Advanced", desc: "Custom CSS for fine adjustments.", fields: [
      { key: "custom_css", type: "code", label: "Custom CSS", hint: "Applied to every storefront page after the theme. Invalid CSS is ignored by browsers but can affect layout, so test in the preview first." }
    ] }
  ];
  const FIELD = {};
  GROUPS.forEach(g => (g.fields || []).forEach(f => { FIELD[f.key] = f; }));

  /* ---------- rendering ---------- */
  function fieldHtml(f) {
    const id = "ap-" + f.key, v = state[f.key];
    const hint = f.hint ? '<small class="ap-hint">' + esc(f.hint) + "</small>" : "";
    if (f.type === "color") {
      return '<div class="ap-field ap-color" data-field="' + f.key + '"><label for="' + id + '-hex">' + esc(f.label) + (f.hint ? '<small class="ap-hint">' + esc(f.hint) + "</small>" : "") + '</label>' +
        '<div class="ap-color-input"><input type="color" id="' + id + '" data-key="' + f.key + '" value="' + esc(v) + '" aria-label="' + esc(f.label) + ' picker">' +
        '<input type="text" id="' + id + '-hex" data-hex="' + f.key + '" value="' + esc(v) + '" maxlength="7" spellcheck="false" autocomplete="off" inputmode="text"></div></div>';
    }
    if (f.type === "seg") {
      return '<fieldset class="ap-field" data-field="' + f.key + '"><legend>' + esc(f.label) + "</legend>" + '<div class="ap-seg">' +
        f.options.map(o => '<label><input type="radio" name="' + f.key + '" data-key="' + f.key + '" value="' + esc(o.value) + '"' + (String(v) === o.value ? " checked" : "") + "><span>" + esc(o.label) + "</span></label>").join("") +
        "</div>" + hint + "</fieldset>";
    }
    if (f.type === "toggle") {
      return '<div class="ap-field ap-toggle" data-field="' + f.key + '"><label for="' + id + '"><span>' + esc(f.label) + "</span>" + hint + '</label><input type="checkbox" role="switch" id="' + id + '" data-key="' + f.key + '"' + (v ? " checked" : "") + "></div>";
    }
    if (f.type === "font") {
      const list = Object.keys(T.FONTS[f.set]);
      return '<div class="ap-field" data-field="' + f.key + '"><label for="' + id + '">' + esc(f.label) + '</label><select id="' + id + '" data-key="' + f.key + '">' +
        list.map(n => '<option value="' + esc(n) + '"' + (n === v ? " selected" : "") + ">" + esc(n) + "</option>").join("") + "</select>" + hint + "</div>";
    }
    if (f.type === "range") {
      return '<div class="ap-field" data-field="' + f.key + '"><label for="' + id + '">' + esc(f.label) + ' <output id="' + id + '-out">' + esc(v) + f.unit + "</output></label>" +
        '<input type="range" id="' + id + '" data-key="' + f.key + '" min="' + f.min + '" max="' + f.max + '" value="' + esc(v) + '">' + hint + "</div>";
    }
    if (f.type === "image") {
      return '<div class="ap-field ap-image" data-field="' + f.key + '"><span class="ap-label">' + esc(f.label) + "</span>" +
        '<div class="ap-image-box ap-focus" id="' + id + '-box" title="Click the most important part of the photo"><img id="' + id + '-img" alt="Hero photo preview"' + (v ? ' src="' + esc(v) + '"' : " hidden") + '><span class="ap-focus-dot" id="' + id + '-dot"' + (v ? "" : " hidden") + '></span><p id="' + id + '-empty"' + (v ? " hidden" : "") + ">No photo selected yet.</p></div>" +
        '<small class="ap-hint ap-focus-hint"' + (v ? "" : " hidden") + ' id="' + id + '-focus-hint">Click the photo to choose its focus point — this part stays visible on phones and wide screens.</small>' +
        '<small class="ap-hint ap-variants" id="' + id + '-variants"></small>' +
        '<div class="ap-image-actions"><label class="btn light ap-upload">Upload photo<input type="file" id="' + id + '-file" accept="image/jpeg,image/png,image/webp" hidden></label>' +
        '<button type="button" class="btn light" id="' + id + '-remove"' + (v ? "" : " hidden") + ">Remove</button></div>" +
        '<label class="ap-sublabel" for="' + id + '-url">Or paste an image link</label><input type="url" id="' + id + '-url" data-key="' + f.key + '" value="' + esc(v) + '" placeholder="https://…">' +
        '<small class="ap-hint" id="' + id + '-status">' + esc(f.hint || "") + "</small></div>";
    }
    if (f.type === "slides") {
      return '<div class="ap-field ap-slides-field" data-field="' + f.key + '"><span class="ap-label">' + esc(f.label) + "</span>" +
        '<div class="ap-size-guide"><strong>Photo size guide</strong><ul>' +
        "<li><b>Best:</b> landscape <b>2400 × 1350 px</b> (16:9) or larger.</li>" +
        "<li><b>Minimum:</b> 1600 px wide — smaller photos look soft on big screens.</li>" +
        "<li>JPG, PNG or WebP, up to <b>20 MB</b> each. Use similar brightness on every slide so the headline stays readable.</li>" +
        "<li>The headline sits on the <b>left</b> — keep the main subject in the centre or right, then click the photo to set its focus point.</li>" +
        "<li>Tablet (1600 px) and phone (1080 × 1920 portrait) versions are made automatically.</li>" +
        "<li><b>Banners with text</b> (promos, prices): choose <b>Show whole image</b>. Any shape works; <b>2400 × 1000 px</b> or <b>2400 × 1350 px</b> is ideal. Upload an extra <b>phone version 1080 × 1350 px</b> (4:5) per slide so the text stays readable on phones.</li></ul></div>" +
        '<div id="ap-slides"></div></div>';
    }
    if (f.type === "code") {
      return '<div class="ap-field" data-field="' + f.key + '"><label for="' + id + '">' + esc(f.label) + '</label><textarea id="' + id + '" data-key="' + f.key + '" rows="7" spellcheck="false" placeholder=".product-card h3 { letter-spacing: .2px; }">' + esc(v) + "</textarea>" + hint + "</div>";
    }
    return "";
  }

  function presetsHtml() {
    return '<div class="ap-presets">' + T.PRESETS.map(p => {
      const t = p.theme;
      return '<button type="button" class="ap-preset" data-preset="' + p.id + '" aria-pressed="' + (state.preset === p.id) + '">' +
        '<span class="ap-preset-sample" style="background:' + t.background + ";color:" + t.primary + '">' +
        '<b style="font-family:\'' + esc(t.heading_font) + '\',serif">Aa</b>' +
        '<i style="background:' + t.primary + '"></i><i style="background:' + t.accent + '"></i><i style="background:' + t.surface + ";box-shadow:inset 0 0 0 1px " + T.mix(t.text, t.background, 0.85) + '"></i></span>' +
        '<span class="ap-preset-name">' + esc(p.name) + "</span><small>" + esc(t.heading_font) + " + " + esc(t.body_font) + "</small></button>";
    }).join("") + "</div>" + '<p class="ap-hint ap-preset-note" id="ap-preset-note"></p>';
  }

  function render() {
    const root = $("#ap-groups");
    root.innerHTML = GROUPS.map(g =>
      '<details class="ap-group" data-group="' + g.id + '"' + (g.open ? " open" : "") + "><summary><span><h3>" + esc(g.title) + "</h3><p>" + esc(g.desc) + "</p></span></summary>" +
      '<div class="ap-body' + (g.layout === "colors" ? " ap-body-colors" : "") + '">' +
      (g.custom === "presets" ? presetsHtml() : "") +
      (g.layout === "colors" ? '<div class="ap-colors">' + g.fields.map(fieldHtml).join("") + "</div>" : (g.fields || []).map(fieldHtml).join("")) +
      (g.after === "contrast" ? '<div class="ap-contrast" id="ap-contrast" aria-live="polite"></div>' : "") +
      (g.after === "specimen" ? '<div class="ap-specimen" id="ap-specimen"><p class="ap-specimen-h">Fresh from Bali’s farms</p><p class="ap-specimen-b">Organic flours, natural sweeteners and pantry staples, packed by hand and delivered across the island.</p></div>' : "") +
      "</div></details>"
    ).join("");
    T.loadFonts(T.PRESETS.map(p => p.theme.heading_font), document, "ap-preset-fonts");
    refresh();
  }

  /* ---------- live state ---------- */
  function refresh() {
    renderSlides();
    Object.values(FIELD).forEach(f => {
      const el = document.querySelector('[data-field="' + f.key + '"]');
      if (el) el.hidden = f.show ? !f.show(state) : false;
    });
    document.querySelectorAll("[data-preset]").forEach(b => b.setAttribute("aria-pressed", String(state.preset === b.dataset.preset)));
    const note = $("#ap-preset-note");
    if (note) note.textContent = state.preset === "custom" ? "You’ve customised this look. Pick a preset to start over from it." : "";
    refreshContrast();
    refreshSpecimen();
    refreshStatus();
    sendPreview();
  }

  function refreshContrast() {
    const box = $("#ap-contrast"); if (!box) return;
    const t = T.normalize(state), c = T.contrast, issues = [];
    if (c(t.text, t.background) < 4.5) issues.push("Text color is hard to read on the page background.");
    if (c(t.text, t.surface) < 4.5) issues.push("Text color is hard to read on cards and panels.");
    if (c(T.readableOn(t.primary, t.text), t.primary) < 4.5) issues.push("Button labels will be hard to read on the primary color. Pick a darker or lighter shade.");
    if (c(t.primary, t.surface) < 3) issues.push("Headings in the primary color are faint on cards.");
    if (c(t.footer_text, t.footer_bg) < 4.5) issues.push("Footer text is hard to read on the footer background.");
    if (c(t.announce_text, t.announce_bg) < 4.5) issues.push("Announcement text is hard to read on its bar.");
    box.className = "ap-contrast " + (issues.length ? "warn" : "ok");
    box.innerHTML = issues.length
      ? "<strong>Readability check</strong><ul>" + issues.map(i => "<li>" + esc(i) + "</li>").join("") + "</ul>"
      : "<strong>Readability check</strong><p>All color pairs meet accessibility contrast guidelines.</p>";
  }

  function refreshSpecimen() {
    const box = $("#ap-specimen"); if (!box) return;
    T.loadFonts([state.heading_font, state.body_font], document, "ap-specimen-fonts");
    const hf = T.FONTS.heading[state.heading_font] || {};
    box.style.setProperty("--sp-h", '"' + state.heading_font + '",' + (hf.fallback || "serif"));
    box.style.setProperty("--sp-hw", hf.weight || 600);
    box.style.setProperty("--sp-b", '"' + state.body_font + '",Arial,sans-serif');
    box.style.setProperty("--sp-c", state.primary);
    box.style.setProperty("--sp-bg", state.background);
    box.style.setProperty("--sp-t", T.mix(state.text, state.background, 0.3));
    box.dataset.size = state.text_size;
  }

  function isDirty() { return !!(saved && state && !same(saved, state)); }
  /** A hero photo published before automatic sizing existed has no tablet/phone versions yet. */
  function needsHeroSizes() {
    if (!state) return false;
    if (state.hero_style === "slides") return T.activeSlides(state).some(x => !x.md || !x.sm);
    return !!(state.hero_style === "image" && state.hero_image && (!state.hero_image_md || !state.hero_image_sm));
  }
  function refreshStatus(text, tone) {
    const el = $("#ap-status"); if (!el) return;
    const dirty = isDirty(), sizes = needsHeroSizes();
    el.className = "ap-status " + (tone || (dirty || sizes ? "dirty" : "clean"));
    el.textContent = text || (dirty ? "Unsaved changes — visible in the preview only" : sizes ? "Your hero photo has no phone/tablet sizes yet — click Publish to create them" : "All changes are live on your storefront");
    $("#ap-save").disabled = !(dirty || sizes) || !state;
    $("#ap-discard").disabled = !dirty || !state;
  }

  function setValue(key, value, fromPreset) {
    state[key] = value;
    if (!fromPreset && T.STYLE_KEYS.includes(key)) state.preset = "custom";
  }

  function syncInputs() {
    Object.values(FIELD).forEach(f => {
      const v = state[f.key];
      if (f.type === "color") { const a = $("#ap-" + f.key), b = $("#ap-" + f.key + "-hex"); if (a) a.value = v; if (b) { b.value = v; b.removeAttribute("aria-invalid"); } }
      else if (f.type === "seg") document.querySelectorAll('input[name="' + f.key + '"]').forEach(r => { r.checked = r.value === String(v); });
      else if (f.type === "toggle") { const el = $("#ap-" + f.key); if (el) el.checked = !!v; }
      else if (f.type === "range") { const el = $("#ap-" + f.key); if (el) el.value = v; const o = $("#ap-" + f.key + "-out"); if (o) o.textContent = v + f.unit; }
      else if (f.type === "image") { showImage(v); const u = $("#ap-" + f.key + "-url"); if (u) u.value = v; }
      else { const el = $("#ap-" + f.key); if (el) el.value = v; }
    });
  }

  function showImage(url) {
    const img = $("#ap-hero_image-img"), empty = $("#ap-hero_image-empty"), rm = $("#ap-hero_image-remove");
    if (!img) return;
    const dot = $("#ap-hero_image-dot"), fh = $("#ap-hero_image-focus-hint"), vs = $("#ap-hero_image-variants");
    if (url) { img.src = url; img.hidden = false; empty.hidden = true; rm.hidden = false; }
    else { img.removeAttribute("src"); img.hidden = true; empty.hidden = false; rm.hidden = true; }
    if (dot) { dot.hidden = !url; dot.style.left = state.hero_focus_x + "%"; dot.style.top = state.hero_focus_y + "%"; }
    if (fh) fh.hidden = !url;
    if (vs) vs.textContent = !url ? "" : state.hero_image_md && state.hero_image_sm ? "✓ Optimized for desktop, tablet and phone." : "Sizes for tablet and phone will be created when you publish.";
  }

  /* ---------- events ---------- */
  function onInput(e) {
    const el = e.target;
    if (el.dataset.hex) {
      let v = el.value.trim(); if (v && v[0] !== "#") v = "#" + v;
      if (T.isHex(v)) { el.removeAttribute("aria-invalid"); setValue(el.dataset.hex, v.toLowerCase()); $("#ap-" + el.dataset.hex).value = v.toLowerCase(); refresh(); }
      else el.setAttribute("aria-invalid", "true");
      return;
    }
    const key = el.dataset.key; if (!key) return;
    const f = FIELD[key];
    if (f.type === "toggle") setValue(key, el.checked);
    else if (f.type === "range") { setValue(key, Number(el.value)); $("#ap-" + key + "-out").textContent = el.value + f.unit; }
    else if (f.type === "seg") { if (!el.checked) return; setValue(key, el.value); }
    else if (f.type === "image") { const v = el.value.trim(); if (v && !/^https:\/\//i.test(v)) return; if (v !== state.hero_image) { heroSource = null; state.hero_image_md = ""; state.hero_image_sm = ""; } setValue(key, v); showImage(T.normalize(state).hero_image); }
    else if (f.type === "color") { setValue(key, el.value.toLowerCase()); const hx = $("#ap-" + key + "-hex"); if (hx) { hx.value = el.value.toLowerCase(); hx.removeAttribute("aria-invalid"); } }
    else setValue(key, el.value);
    refresh();
  }

  function onHexBlur(e) {
    const el = e.target; if (!el.dataset || !el.dataset.hex) return;
    el.value = state[el.dataset.hex]; el.removeAttribute("aria-invalid");
  }

  function applyPreset(id) {
    const p = T.PRESETS.find(x => x.id === id); if (!p) return;
    Object.entries(p.theme).forEach(([k, v]) => setValue(k, v, true));
    state.preset = id;
    syncInputs(); refresh();
  }

  /* ---------- hero photo: one upload → desktop, tablet and phone sizes ---------- */
  let heroSource = null; // original photo (File/Blob) kept in memory so the phone crop can be re-made
  const VARIANTS = { lg: { width: 2400 }, md: { width: 1600 }, sm: { width: 1080, height: 1920 }, ph: { width: 1080 } };

  function loadImage(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob), img = new Image();
      img.onload = () => resolve({ img, done: () => URL.revokeObjectURL(url) });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This photo could not be read. Try a JPG or PNG.")); };
      img.src = url;
    });
  }
  function toJpeg(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Could not create the image."))), "image/jpeg", 0.88));
  }
  /** Landscape sizes keep the whole photo; the phone size is a 9:16 portrait crop around the focus point. */
  async function renderVariant(img, kind, fx, fy) {
    const W = img.naturalWidth, H = img.naturalHeight, v = VARIANTS[kind];
    let sx = 0, sy = 0, sw = W, sh = H, ow, oh;
    if (kind === "sm") {
      const ratio = v.width / v.height;
      if (W / H > ratio) { sw = Math.round(H * ratio); sx = Math.round(Math.min(W - sw, Math.max(0, fx / 100 * W - sw / 2))); }
      else { sh = Math.round(W / ratio); sy = Math.round(Math.min(H - sh, Math.max(0, fy / 100 * H - sh / 2))); }
      ow = Math.min(v.width, sw); oh = Math.round(ow / ratio);
    } else { ow = Math.min(v.width, W); oh = Math.round(H * ow / W); }
    const canvas = document.createElement("canvas");
    canvas.width = ow; canvas.height = oh;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
    return toJpeg(canvas);
  }
  async function uploadBlob(blob, path) {
    let lastError = null;
    for (const bucket of MEDIA_BUCKETS) {
      const { data, error } = await db.storage.from(bucket).upload(path, blob, { upsert: false, contentType: "image/jpeg", cacheControl: "31536000" });
      if (!error && data?.path) return db.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
      lastError = error;
    }
    throw new Error("Upload failed: " + (lastError?.message || "storage did not accept the file."));
  }
  async function makeAndUploadVariants(source, kinds, fx = state.hero_focus_x, fy = state.hero_focus_y) {
    const { img, done } = await loadImage(source);
    try {
      const stamp = Date.now(), out = {};
      for (const kind of kinds) {
        const blob = await renderVariant(img, kind, fx, fy);
        out[kind] = await uploadBlob(blob, "theme/hero-" + stamp + "-" + kind + ".jpg");
      }
      return out;
    } finally { done(); }
  }

  /* ---------- hero slideshow editor ---------- */
  const slideSources = {}; // original photo per slide (by desktop URL), used to re-crop the phone version
  let slidesSig = "";
  function slideList() {
    const n = Number(state.hero_slide_count) || 3;
    const list = clone(state.hero_slides || []);
    while (list.length < n) list.push({ lg: "", md: "", sm: "", ph: "", fx: 50, fy: 50 });
    return list;
  }
  function renderSlides(force) {
    const box = $("#ap-slides");
    if (!box || !state) return;
    const list = slideList(), n = Number(state.hero_slide_count) || 3;
    const sig = JSON.stringify([list.slice(0, n), n, state.hero_slide_fit]);
    if (!force && sig === slidesSig) return;
    slidesSig = sig;
    box.innerHTML = list.slice(0, n).map((sl, i) =>
      '<div class="ap-slide" data-slide="' + i + '">' +
      '<div class="ap-slide-head"><strong>Slide ' + (i + 1) + "</strong>" +
      '<span class="ap-slide-state ' + (sl.lg ? "ok" : "") + '">' + (sl.lg ? (sl.md && sl.sm ? "✓ Ready for every screen" : "Sizes made when you publish") : "No photo yet") + "</span>" +
      '<span class="ap-slide-move"><button type="button" class="ap-icon-btn" data-slide-up="' + i + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Move slide ' + (i + 1) + ' up">↑</button>' +
      '<button type="button" class="ap-icon-btn" data-slide-down="' + i + '"' + (i === n - 1 ? " disabled" : "") + ' aria-label="Move slide ' + (i + 1) + ' down">↓</button></span></div>' +
      '<div class="ap-image-box ap-focus" data-slide-box="' + i + '" title="Click the most important part of the photo">' +
      (sl.lg ? '<img src="' + esc(sl.lg) + '" alt="Slide ' + (i + 1) + ' photo"><span class="ap-focus-dot" style="left:' + sl.fx + "%;top:" + sl.fy + '%"></span>' : "<p>No photo yet</p>") + "</div>" +
      '<div class="ap-image-actions"><label class="btn light ap-upload">' + (sl.lg ? "Replace photo" : "Upload photo") + '<input type="file" data-slide-file="' + i + '" accept="image/jpeg,image/png,image/webp" hidden></label>' +
      (sl.lg ? '<button type="button" class="btn light" data-slide-remove="' + i + '">Remove</button>' : "") + "</div>" +
      (state.hero_slide_fit === "contain" && sl.lg ?
        '<div class="ap-slide-phone"><span>Phone version <em>(optional)</em></span>' +
        (sl.ph ? '<img src="' + esc(sl.ph) + '" alt="Slide ' + (i + 1) + ' phone version">' : "<small>Not set — phones show the full desktop image (smaller).</small>") +
        '<div class="ap-image-actions"><label class="btn light ap-upload">' + (sl.ph ? "Replace" : "Upload phone version") + '<input type="file" data-slide-phone="' + i + '" accept="image/jpeg,image/png,image/webp" hidden></label>' +
        (sl.ph ? '<button type="button" class="btn light" data-slide-phone-remove="' + i + '">Remove</button>' : "") + "</div></div>" : "") +
      '<small class="ap-hint" data-slide-status="' + i + '"></small></div>').join("");
  }
  function setSlides(list) { setValue("hero_slides", list); renderSlides(true); refresh(); }

  async function uploadSlide(i, file) {
    const status = document.querySelector('[data-slide-status="' + i + '"]');
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPG, PNG or WebP photo.");
      if (file.size > 20 * 1024 * 1024) throw new Error("This photo is larger than 20 MB. Export it smaller and try again.");
      status.textContent = "Creating sizes for desktop, tablet and phone…";
      const probe = await loadImage(file); const w = probe.img.naturalWidth, h = probe.img.naturalHeight; probe.done();
      const urls = await makeAndUploadVariants(file, ["lg", "md", "sm"], 50, 50);
      slideSources[urls.lg] = file;
      const list = slideList();
      list[i] = { ...list[i], lg: urls.lg, md: urls.md, sm: urls.sm, fx: 50, fy: 50 };
      setSlides(list);
      const note = document.querySelector('[data-slide-status="' + i + '"]');
      if (note) note.textContent = w < 1600 ? "⚠️ This photo is only " + w + " × " + h + " px — it may look soft on large screens. 2400 × 1350 px is ideal." : "Photo ready (" + w + " × " + h + " px). Click it to set the focus point.";
    } catch (err) { if (status) status.textContent = err.message; }
  }

  async function uploadSlidePhone(i, file) {
    const status = document.querySelector('[data-slide-status="' + i + '"]');
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPG, PNG or WebP image.");
      if (file.size > 20 * 1024 * 1024) throw new Error("This image is larger than 20 MB.");
      status.textContent = "Uploading phone version…";
      const probe = await loadImage(file); const w = probe.img.naturalWidth, h = probe.img.naturalHeight; probe.done();
      const urls = await makeAndUploadVariants(file, ["ph"], 50, 50);
      const list = slideList(); list[i].ph = urls.ph; setSlides(list);
      const note = document.querySelector('[data-slide-status="' + i + '"]');
      if (note) note.textContent = w < 900 ? "⚠️ The phone version is only " + w + " px wide — 1080 × 1350 px is ideal." : "Phone version ready (" + w + " × " + h + " px).";
    } catch (err) { if (status) status.textContent = err.message; }
  }

  function onSlidesClick(e) {
    const t = e.target;
    const up = t.closest("[data-slide-up]"), down = t.closest("[data-slide-down]"), rm = t.closest("[data-slide-remove]"), box = t.closest("[data-slide-box]");
    if (up || down) {
      const i = Number((up || down).dataset[up ? "slideUp" : "slideDown"]), j = up ? i - 1 : i + 1, list = slideList();
      [list[i], list[j]] = [list[j], list[i]];
      setSlides(list);
    } else if (t.closest("[data-slide-phone-remove]")) {
      const list = slideList(); list[Number(t.closest("[data-slide-phone-remove]").dataset.slidePhoneRemove)].ph = ""; setSlides(list);
    } else if (rm) {
      const list = slideList(); list[Number(rm.dataset.slideRemove)] = { lg: "", md: "", sm: "", ph: "", fx: 50, fy: 50 }; setSlides(list);
    } else if (box) {
      const i = Number(box.dataset.slideBox), list = slideList(), img = box.querySelector("img");
      if (!img || !list[i].lg) return;
      const r = img.getBoundingClientRect();
      list[i].fx = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100);
      list[i].fy = Math.round(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * 100);
      list[i].sm = ""; // phone crop is re-made around the new focus point when publishing
      setSlides(list);
    }
  }

  /* ---------- preview ---------- */
  function startPreview() {
    if (frameStarted) return;
    frameStarted = true;
    $("#ap-frame").src = "index.html?theme-preview=1";
    layoutPreview();
  }
  function sendPreview() {
    const frame = $("#ap-frame");
    if (!frameStarted || !frame || !frame.contentWindow || !state) return;
    try { frame.contentWindow.postMessage({ type: "nl-theme-preview", theme: T.normalize(state) }, location.origin); } catch (e) { /* frame not ready */ }
  }
  function layoutPreview() {
    const stage = $("#ap-stage"), wrap = $("#ap-frame-wrap"), frame = $("#ap-frame");
    if (!stage || !stage.clientWidth) return;
    const w = DEVICES[device], scale = Math.min(1, (stage.clientWidth - (device === "desktop" ? 0 : 32)) / w);
    frame.style.width = w + "px";
    frame.style.height = Math.ceil(stage.clientHeight / scale) + "px";
    frame.style.transform = "scale(" + scale + ")";
    wrap.style.width = Math.floor(w * scale) + "px";
    wrap.style.height = stage.clientHeight + "px";
    wrap.classList.toggle("device", device !== "desktop");
    $("#ap-scale").textContent = Math.round(scale * 100) + "%";
  }

  /* ---------- load & save ---------- */
  const legitHex = v => T.isHex(v) && !["#000000", "#ffffff"].includes(String(v).toLowerCase());

  async function loadAppearance(force) {
    startPreview();
    if (loading || (loaded && !force)) { requestAnimationFrame(layoutPreview); return; }
    loading = true;
    refreshStatus("Loading your theme…", "busy");
    try {
      const [themeRes, settingsRes] = await withTimeout(Promise.all([
        db.from("store_homepage_pages").select("page_schema,updated_at").eq("slug", SLUG).maybeSingle(),
        db.from("store_settings").select("primary_color,background_color,catalog_columns,show_hero").eq("id", true).maybeSingle()
      ]), 15000);
      if (themeRes.error) throw new Error("Could not load the saved theme: " + themeRes.error.message);
      let theme = themeRes.data?.page_schema?.theme;
      if (!theme) {
        const s = settingsRes.data || {};
        theme = {};
        if (legitHex(s.primary_color)) { theme.primary = s.primary_color; theme.preset = "custom"; }
        if (legitHex(s.background_color)) { theme.background = s.background_color; theme.preset = "custom"; }
        if (s.catalog_columns) theme.columns_desktop = String(s.catalog_columns);
        if (s.show_hero === false) theme.show_hero = false;
      }
      saved = T.normalize(theme);
      state = clone(saved);
      loaded = true;
      render();
      $("#appearance-message").textContent = "";
    } catch (err) {
      $("#ap-groups").innerHTML = '<div class="ap-load-error"><strong>Your theme could not be loaded.</strong><p>' + esc(err.message || "Unknown error.") + '</p><button type="button" class="btn primary" id="ap-retry">Retry</button></div>';
      $("#ap-retry").onclick = () => loadAppearance(true);
      refreshStatus("Theme could not be loaded", "error");
    } finally { loading = false; }
  }

  async function publish() {
    const btn = $("#ap-save");
    btn.disabled = true;
    refreshStatus("Publishing…", "busy");
    try {
      if (state.hero_style === "slides" && needsHeroSizes()) {
        refreshStatus("Optimizing slide photos for phones and tablets…", "busy");
        const list = clone(state.hero_slides);
        for (const sl of list.slice(0, Number(state.hero_slide_count))) {
          if (!sl.lg || (sl.md && sl.sm)) continue;
          try {
            const source = slideSources[sl.lg] || await fetch(sl.lg, { mode: "cors" }).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.blob(); });
            slideSources[sl.lg] = source;
            const urls = await makeAndUploadVariants(source, [!sl.md && "md", !sl.sm && "sm"].filter(Boolean), sl.fx, sl.fy);
            if (urls.md) sl.md = urls.md;
            if (urls.sm) sl.sm = urls.sm;
          } catch (err) {
            console.warn("Slide optimisation skipped:", err);
            say("#appearance-message", "A slide photo could not be resized automatically. It is still published; upload it again to create phone sizes.");
          }
        }
        state.hero_slides = list;
        refreshStatus("Publishing…", "busy");
      }
      if (state.hero_style === "image" && state.hero_image && (!state.hero_image_md || !state.hero_image_sm)) {
        refreshStatus("Optimizing the hero photo for phones and tablets…", "busy");
        try {
          const need = [!state.hero_image_md && "md", !state.hero_image_sm && "sm"].filter(Boolean);
          const source = heroSource || await fetch(state.hero_image, { mode: "cors" }).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.blob(); });
          heroSource = source;
          const urls = await makeAndUploadVariants(source, need);
          if (urls.md) state.hero_image_md = urls.md;
          if (urls.sm) state.hero_image_sm = urls.sm;
        } catch (err) {
          console.warn("Hero photo optimisation skipped:", err);
          say("#appearance-message", "The hero photo could not be resized automatically (" + (err.message || err) + "). It is still published; upload it again to create phone sizes.");
        }
        refreshStatus("Publishing…", "busy");
      }
      const theme = T.normalize(state), now = new Date().toISOString();
      const { error } = await withTimeout(db.from("store_homepage_pages").upsert(
        { slug: SLUG, title: "Site theme", status: "published", page_schema: { version: 1, blocks: [], theme }, updated_at: now, published_at: now },
        { onConflict: "slug" }), 20000);
      if (error) throw new Error("Publishing failed: " + error.message);
      // Keep the original store_settings fields in step, so older code and other forms stay consistent.
      const legacy = { primary_color: theme.primary, background_color: theme.background, catalog_columns: theme.columns_desktop, show_hero: theme.show_hero };
      const res = await db.from("store_settings").update({ ...legacy, updated_at: now }).eq("id", true);
      if (res.error) console.warn("store_settings sync skipped:", res.error.message);
      else if (typeof settingsRow !== "undefined" && settingsRow) Object.assign(settingsRow, legacy);
      saved = clone(theme); state = clone(theme);
      say("#appearance-message", "Published. Visitors see the new look on their next page load.", true);
      refreshStatus();
    } catch (err) {
      say("#appearance-message", err.message || "Publishing failed.");
      refreshStatus("Not published — see the message below", "error");
      btn.disabled = false;
    }
  }

  /* ---------- wiring ---------- */
  function init() {
    const form = $("#theme-form");
    if (!form) return;
    form.addEventListener("input", onInput);
    form.addEventListener("change", e => { if (e.target.type !== "file") onInput(e); });
    form.addEventListener("focusout", onHexBlur);
    form.addEventListener("submit", e => e.preventDefault());
    form.addEventListener("click", e => { if (e.target.closest("#ap-slides")) onSlidesClick(e); });
    form.addEventListener("change", e => { const f = e.target.closest("[data-slide-file]"); if (f && f.files[0]) { uploadSlide(Number(f.dataset.slideFile), f.files[0]); f.value = ""; } });
    form.addEventListener("change", e => { const f = e.target.closest("[data-slide-phone]"); if (f && f.files[0]) { uploadSlidePhone(Number(f.dataset.slidePhone), f.files[0]); f.value = ""; } });
    form.addEventListener("change", e => {
      if (e.target.name !== "hero_style" || e.target.value !== "slides") return;
      if (!T.activeSlides(state).length && state.hero_image) {
        const list = slideList();
        list[0] = { lg: state.hero_image, md: state.hero_image_md, sm: state.hero_image_sm, fx: state.hero_focus_x, fy: state.hero_focus_y };
        setSlides(list);
      }
    });
    form.addEventListener("click", e => {
      const p = e.target.closest("[data-preset]"); if (p) applyPreset(p.dataset.preset);
      if (e.target.id === "ap-hero_image-remove") { heroSource = null; ["hero_image", "hero_image_md", "hero_image_sm"].forEach(k => setValue(k, "")); syncInputs(); refresh(); }
      const box = e.target.closest("#ap-hero_image-box");
      if (box && state.hero_image) {
        const r = box.getBoundingClientRect();
        setValue("hero_focus_x", Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100));
        setValue("hero_focus_y", Math.round(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * 100));
        setValue("hero_image_sm", ""); // the phone crop is re-made around the new focus point when publishing
        showImage(state.hero_image); refresh();
      }
    });
    form.addEventListener("change", async e => {
      if (e.target.id !== "ap-hero_image-file" || !e.target.files[0]) return;
      const status = $("#ap-hero_image-status");
      try {
        const file = e.target.files[0];
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPG, PNG or WebP photo.");
        if (file.size > 20 * 1024 * 1024) throw new Error("The photo is larger than 20 MB. Export it smaller and try again.");
        heroSource = file;
        state.hero_focus_x = 50; state.hero_focus_y = 50;
        status.textContent = "Creating sizes for desktop, tablet and phone…";
        const urls = await makeAndUploadVariants(file, ["lg", "md", "sm"]);
        setValue("hero_image", urls.lg); setValue("hero_image_md", urls.md); setValue("hero_image_sm", urls.sm);
        syncInputs(); refresh();
        status.textContent = "Photo ready for every screen size. Publish to make it live.";
      } catch (err) { status.textContent = err.message; }
      e.target.value = "";
    });
    $("#ap-save").onclick = publish;
    $("#ap-discard").onclick = () => { if (!saved) return; state = clone(saved); syncInputs(); refresh(); say("#appearance-message", "Changes discarded.", true); };
    $("#ap-reset").onclick = () => {
      if (!state) return;
      if (!confirm("Reset every appearance setting to the original Naturalife look? Nothing changes on your live site until you publish.")) return;
      state = T.normalize({ ...T.DEFAULTS, hero_image: state.hero_image, hero_image_md: state.hero_image_md, hero_image_sm: state.hero_image_sm, hero_focus_x: state.hero_focus_x, hero_focus_y: state.hero_focus_y, custom_css: state.custom_css });
      syncInputs(); refresh();
    };
    $("#ap-devices").addEventListener("change", e => { device = e.target.value; layoutPreview(); });
    if (window.matchMedia("(max-width: 700px)").matches) { device = "mobile"; const r = document.querySelector('#ap-devices input[value="mobile"]'); if (r) r.checked = true; }
    $("#ap-reload").onclick = () => { $("#ap-frame").contentWindow?.location.reload(); };
    $("#ap-frame").addEventListener("load", sendPreview);
    window.addEventListener("message", e => { if (e.origin === location.origin && e.data?.type === "nl-theme-preview-ready") sendPreview(); });
    new ResizeObserver(layoutPreview).observe($("#ap-stage"));
    window.addEventListener("beforeunload", e => { if (isDirty() && !leaving) { e.preventDefault(); e.returnValue = ""; } });
    // Ask before leaving the appearance view with unpublished changes.
    document.addEventListener("click", e => {
      const nav = e.target.closest("#side-nav [data-view], #side-nav a, [data-go]");
      if (!nav || !isDirty() || $("#view-appearance").classList.contains("hidden")) return;
      if (nav.dataset.view === "appearance") return;
      if (confirm("You have unpublished appearance changes. Leave without publishing?")) { leaving = true; state = clone(saved); refreshStatus(); leaving = false; if (nav.tagName === "A") leaving = true; }
      else { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  window.loadAppearance = loadAppearance;
  function watchView() {
    const view = $("#view-appearance"); if (!view) return;
    const check = () => { if (!view.classList.contains("hidden")) loadAppearance(); };
    new MutationObserver(check).observe(view, { attributes: true, attributeFilter: ["class"] });
    check();
  }
  const boot = () => { init(); watchView(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
