/* Naturalife Bali — site theme engine.
   Storefront pages:  <script src="theme.js"></script> in <head> (after styles), plus theme.css.
   Admin panel:       <script src="theme.js" data-config-only></script> (exposes config, styles nothing).
   The published theme lives in public.store_homepage_pages (slug "site-theme", page_schema.theme). */
(function () {
  "use strict";
  var SUPABASE_URL = "https://fvxbssqitctrdmxysiqb.supabase.co";
  var KEY = "sb_publishable_2O8WRCv_BAhL7BEVtnTgfQ_GfGzIgFR";
  var CACHE_KEY = "nl-theme-v1";
  var SLUG = "site-theme";
  var script = document.currentScript;
  var configOnly = !!(script && script.hasAttribute("data-config-only"));

  var FONTS = {
    heading: {
      "Playfair Display": { axes: "600;700", weight: 600, fallback: "Georgia,serif" },
      "Cormorant Garamond": { axes: "500;600;700", weight: 600, fallback: "Georgia,serif" },
      "Fraunces": { axes: "500;600;700", weight: 600, fallback: "Georgia,serif" },
      "Lora": { axes: "500;600;700", weight: 600, fallback: "Georgia,serif" },
      "Libre Baskerville": { axes: "400;700", weight: 400, fallback: "Georgia,serif" },
      "DM Serif Display": { axes: "400", weight: 400, fallback: "Georgia,serif" },
      "Marcellus": { axes: "400", weight: 400, fallback: "Georgia,serif" },
      "Poppins": { axes: "500;600;700", weight: 600, fallback: "Arial,sans-serif" },
      "Montserrat": { axes: "500;600;700", weight: 600, fallback: "Arial,sans-serif" },
      "Outfit": { axes: "500;600;700", weight: 600, fallback: "Arial,sans-serif" }
    },
    body: {
      "DM Sans": { axes: "400;500;600;700" },
      "Inter": { axes: "400;500;600;700" },
      "Nunito Sans": { axes: "400;600;700" },
      "Lato": { axes: "400;700" },
      "Work Sans": { axes: "400;500;600;700" },
      "Karla": { axes: "400;500;600;700" },
      "Mulish": { axes: "400;500;600;700" },
      "Source Sans 3": { axes: "400;600;700" },
      "Poppins": { axes: "400;500;600;700" }
    }
  };
  var PAGE_FONTS = { "Playfair Display": 1, "DM Sans": 1 }; // already loaded by every page

  var DEFAULTS = {
    preset: "classic",
    primary: "#244b3c", accent: "#829478", background: "#f6f5ef", surface: "#fffefa", text: "#26352e",
    header_bg: "#fffefa", footer_bg: "#244b3c", footer_text: "#f5f3e9", announce_bg: "#244b3c", announce_text: "#ffffff",
    heading_font: "Playfair Display", body_font: "DM Sans", text_size: "standard",
    corners: "soft", button_shape: "pill", card_style: "bordered", container: "standard", spacing: "comfortable", sticky_header: true,
    columns_desktop: "4", columns_mobile: "2", image_ratio: "fixed", image_fit: "cover", add_button: "soft",
    show_filters: true, show_search: true, show_descriptions: true, hover_effects: true,
    show_hero: true, hero_style: "gradient", hero_bg: "#e9eee3", hero_image: "", hero_image_md: "", hero_image_sm: "", hero_focus_x: 50, hero_focus_y: 50, hero_slides: [], hero_slide_count: "3", hero_slide_interval: "6", hero_slide_fit: "cover", hero_overlay: 45, hero_art: true, hero_text: true,
    show_announcement: true, show_slideshow: true, show_education: true, show_faq: true,
    custom_css: ""
  };

  var ENUMS = {
    text_size: ["standard", "large"], corners: ["square", "soft", "rounded"], button_shape: ["pill", "rounded", "square"],
    card_style: ["bordered", "elevated", "flat"], container: ["narrow", "standard", "full"], spacing: ["compact", "comfortable", "spacious"],
    columns_desktop: ["2", "3", "4", "5"], columns_mobile: ["1", "2"], image_ratio: ["fixed", "square", "portrait", "landscape"],
    image_fit: ["cover", "contain"], add_button: ["soft", "solid", "outline"], hero_style: ["gradient", "solid", "image", "slides"], hero_slide_count: ["2", "3", "4", "5", "6"], hero_slide_interval: ["4", "6", "8", "10"], hero_slide_fit: ["cover", "contain"]
  };
  var COLOR_KEYS = ["primary", "accent", "background", "surface", "text", "header_bg", "footer_bg", "footer_text", "announce_bg", "announce_text", "hero_bg"];
  // Keys a preset controls. Everything else (catalog, sections, hero image…) is kept when switching presets.
  var STYLE_KEYS = ["primary", "accent", "background", "surface", "text", "header_bg", "footer_bg", "footer_text", "announce_bg", "announce_text", "hero_bg",
    "heading_font", "body_font", "corners", "button_shape", "card_style"];

  var PRESETS = [
    { id: "classic", name: "Naturalife Classic", theme: { primary: "#244b3c", accent: "#829478", background: "#f6f5ef", surface: "#fffefa", text: "#26352e", header_bg: "#fffefa", footer_bg: "#244b3c", footer_text: "#f5f3e9", announce_bg: "#244b3c", announce_text: "#ffffff", hero_bg: "#e9eee3", heading_font: "Playfair Display", body_font: "DM Sans", corners: "soft", button_shape: "pill", card_style: "bordered" } },
    { id: "bali-earth", name: "Bali Earth", theme: { primary: "#5e4330", accent: "#a87b51", background: "#f4ede3", surface: "#fffaf2", text: "#3a2a1f", header_bg: "#fffaf2", footer_bg: "#3a2a1f", footer_text: "#efe3d2", announce_bg: "#5e4330", announce_text: "#fffaf2", hero_bg: "#eadfce", heading_font: "Cormorant Garamond", body_font: "Nunito Sans", corners: "rounded", button_shape: "pill", card_style: "bordered" } },
    { id: "rice-terrace", name: "Rice Terrace", theme: { primary: "#4a6b1f", accent: "#9bb562", background: "#f6f8ee", surface: "#ffffff", text: "#27331a", header_bg: "#ffffff", footer_bg: "#2f4513", footer_text: "#eef3e0", announce_bg: "#4a6b1f", announce_text: "#ffffff", hero_bg: "#e4ecd2", heading_font: "Fraunces", body_font: "Karla", corners: "rounded", button_shape: "pill", card_style: "elevated" } },
    { id: "lagoon", name: "Lagoon", theme: { primary: "#1d5a63", accent: "#5f9fa3", background: "#f1f6f5", surface: "#ffffff", text: "#1b3034", header_bg: "#ffffff", footer_bg: "#163f45", footer_text: "#e3f0ef", announce_bg: "#1d5a63", announce_text: "#ffffff", hero_bg: "#dcebea", heading_font: "Lora", body_font: "Work Sans", corners: "soft", button_shape: "rounded", card_style: "bordered" } },
    { id: "coconut", name: "Coconut Minimal", theme: { primary: "#2f3a34", accent: "#8c8a7c", background: "#ffffff", surface: "#ffffff", text: "#232a26", header_bg: "#ffffff", footer_bg: "#f1f1ed", footer_text: "#2f3a34", announce_bg: "#2f3a34", announce_text: "#ffffff", hero_bg: "#f1f1ed", heading_font: "Montserrat", body_font: "Inter", corners: "square", button_shape: "square", card_style: "flat" } },
    { id: "frangipani", name: "Frangipani", theme: { primary: "#7a3b33", accent: "#d39b3f", background: "#fdf6ec", surface: "#fffdf8", text: "#3b2320", header_bg: "#fffdf8", footer_bg: "#3b2320", footer_text: "#f6e8d6", announce_bg: "#d39b3f", announce_text: "#2c1a16", hero_bg: "#f7e7d2", heading_font: "Marcellus", body_font: "Mulish", corners: "soft", button_shape: "pill", card_style: "elevated" } }
  ];

  /* ---------- color helpers ---------- */
  function isHex(v) { return /^#[0-9a-f]{6}$/i.test(String(v || "")); }
  function rgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function hex(c) { return "#" + c.map(function (v) { return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"); }).join(""); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex(x.map(function (v, i) { return v + (y[i] - v) * t; })); }
  function luminance(h) {
    var c = rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { var A = luminance(a), B = luminance(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); }
  function readableOn(bg, dark) { dark = dark || "#1d2420"; return contrast("#ffffff", bg) >= contrast(dark, bg) ? "#ffffff" : dark; }
  function rgba(h, a) { return "rgba(" + rgb(h).join(",") + "," + a + ")"; }

  /* ---------- theme model ---------- */
  var URL_RE = /^https:\/\/[^\s"'()<>\\]+$/i;
  /** Hero slideshow: up to 6 slides, each { lg, md, sm, fx, fy } (desktop / tablet / phone photo + focus point). */
  function normSlides(v) {
    if (!Array.isArray(v)) return [];
    return v.slice(0, 6).map(function (x) {
      x = x && typeof x === "object" ? x : {};
      var url = function (u) { return URL_RE.test(String(u || "")) ? String(u) : ""; };
      var pct = function (n) { n = Number(n); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 50; };
      return { lg: url(x.lg), md: url(x.md), sm: url(x.sm), ph: url(x.ph), fx: pct(x.fx), fy: pct(x.fy) };
    });
  }
  /** Slides that will actually be shown on the storefront. */
  function activeSlides(t) {
    return (t.hero_slides || []).slice(0, Number(t.hero_slide_count) || 0).filter(function (x) { return x.lg; });
  }

  function normalize(input) {
    var t = {}, src = input && typeof input === "object" ? input : {};
    Object.keys(DEFAULTS).forEach(function (k) {
      var d = DEFAULTS[k], v = src[k];
      if (k === "hero_slides") t[k] = normSlides(v);
      else if (COLOR_KEYS.indexOf(k) > -1) t[k] = isHex(v) ? String(v).toLowerCase() : d;
      else if (ENUMS[k]) t[k] = ENUMS[k].indexOf(String(v)) > -1 ? String(v) : d;
      else if (typeof d === "boolean") t[k] = typeof v === "boolean" ? v : d;
      else if (k === "hero_overlay") t[k] = Number.isFinite(Number(v)) && v !== "" && v !== null ? Math.max(0, Math.min(85, Math.round(Number(v)))) : d;
      else if (k === "heading_font") t[k] = FONTS.heading[v] ? v : d;
      else if (k === "body_font") t[k] = FONTS.body[v] ? v : d;
      else if (k === "hero_focus_x" || k === "hero_focus_y") t[k] = Number.isFinite(Number(v)) && v !== "" && v !== null ? Math.max(0, Math.min(100, Math.round(Number(v)))) : d;
      else if (k.indexOf("hero_image") === 0) t[k] = /^https:\/\/[^\s"'()<>\\]+$/i.test(String(v || "")) ? String(v) : "";
      else if (k === "custom_css") t[k] = typeof v === "string" ? v.slice(0, 20000) : "";
      else t[k] = typeof v === "string" && v ? v.slice(0, 40) : d;
    });
    return t;
  }

  function cssUrl(u) { return u ? 'url("' + String(u).replace(/"/g, "%22") + '")' : "none"; }

  function derive(t) {
    var p = t.primary, bg = t.background, s = t.surface, tx = t.text;
    var hf = FONTS.heading[t.heading_font], radius = { square: [2, 3, 4], soft: [13, 9, 15], rounded: [22, 14, 26] }[t.corners];
    var heroBase = t.hero_style === "solid" ? t.hero_bg : bg;
    var heroDark = t.hero_style === "image" || t.hero_style === "slides" || luminance(heroBase) < 0.2;
    var headerDark = luminance(t.header_bg) < 0.2;
    var onHeader = readableOn(t.header_bg, tx);
    var vars = {
      "--green": p, "--green-dark": mix(p, "#000000", 0.28), "--green-mid": mix(p, "#ffffff", 0.16), "--accent": t.accent,
      "--ivory": bg, "--paper": s, "--surface": s, "--ink": tx, "--muted": mix(tx, bg, 0.42), "--line": mix(tx, bg, 0.88),
      "--primary-soft": mix(p, s, 0.86), "--primary-tint": mix(p, s, 0.93), "--section-alt": mix(bg, s, 0.5),
      "--on-primary": readableOn(p, tx), "--shadow-color": rgba(mix(p, "#000000", 0.5), 0.12),
      "--shade-strong": rgba(mix(p, "#000000", 0.55), 0.78), "--shade-soft": rgba(mix(p, "#000000", 0.55), 0.12),
      "--header-bg": t.header_bg,
      "--header-text": headerDark ? mix(onHeader, t.header_bg, 0.18) : mix(tx, t.header_bg, 0.3),
      "--header-strong": headerDark ? onHeader : (contrast(p, t.header_bg) >= 3 ? p : tx),
      "--footer-bg": t.footer_bg, "--footer-text": t.footer_text,
      "--announce-bg": t.announce_bg, "--announce-text": t.announce_text,
      "--hero-bg": t.hero_bg, "--hero-1": mix(bg, s, 0.55), "--hero-2": mix(bg, tx, 0.035), "--hero-glow": mix(p, bg, 0.86),
      "--hero-title": heroDark ? "#ffffff" : (contrast(p, heroBase) >= 3 ? p : tx),
      "--hero-text": heroDark ? "rgba(255,255,255,.88)" : mix(tx, heroBase, 0.38),
      "--hero-eyebrow": heroDark ? "rgba(255,255,255,.8)" : mix(p, "#ffffff", 0.16),
      "--hero-accent": heroDark ? mix(t.accent, "#ffffff", 0.4) : t.accent,
      "--hero-overlay": rgba(mix(p, "#000000", 0.6), (t.hero_overlay / 100).toFixed(2)),
      "--hero-image": cssUrl(t.hero_image),
      "--hero-image-md": cssUrl(t.hero_image_md || t.hero_image),
      "--hero-image-sm": cssUrl(t.hero_image_sm || t.hero_image_md || t.hero_image),
      "--hero-pos": t.hero_focus_x + "% " + t.hero_focus_y + "%",
      "--hero-pos-sm": t.hero_image_sm ? "50% 50%" : t.hero_focus_x + "% " + t.hero_focus_y + "%",
      "--serif": '"' + t.heading_font + '",' + hf.fallback, "--sans": '"' + t.body_font + '",Arial,sans-serif',
      "--heading-weight": String(hf.weight),
      "--radius": radius[0] + "px", "--radius-input": radius[1] + "px", "--radius-lg": radius[2] + "px",
      "--container": { narrow: "1180px", standard: "1440px", full: "none" }[t.container],
      "--catalog-columns": t.columns_desktop
    };
    var hide = [];
    if (!t.show_hero) hide.push("hero");
    if (!t.hero_art) hide.push("art");
    if (!t.hero_text) hide.push("herotext");
    if (!t.show_announcement) hide.push("announcement");
    if (!t.show_slideshow) hide.push("slideshow");
    if (!t.show_education) hide.push("education");
    if (!t.show_faq) hide.push("faq");
    if (!t.show_filters) hide.push("filters");
    if (!t.show_search) hide.push("search");
    if (!t.show_descriptions) hide.push("descriptions");
    var attrs = {
      "data-nl-theme": t.preset || "custom", "data-corners": t.corners, "data-buttons": t.button_shape, "data-cards": t.card_style,
      "data-container": t.container, "data-spacing": t.spacing, "data-text-size": t.text_size, "data-sticky": t.sticky_header ? "on" : "off",
      "data-mobile-columns": t.columns_mobile, "data-img-ratio": t.image_ratio, "data-img-fit": t.image_fit, "data-add-button": t.add_button,
      "data-hero-style": (t.hero_style === "image" && !t.hero_image) || (t.hero_style === "slides" && !activeSlides(t).length) ? "gradient" : t.hero_style,
      "data-slide-fit": t.hero_slide_fit,
      "data-hide": hide.join(" "), "data-hover": t.hover_effects ? "on" : "off"
    };
    return { vars: vars, attrs: attrs };
  }

  function fontsHref(families) {
    var parts = families.filter(Boolean).map(function (f) {
      var cfg = FONTS.heading[f] || FONTS.body[f]; if (!cfg) return null;
      var axes = FONTS.body[f] && FONTS.heading[f] ? "400;500;600;700" : cfg.axes;
      return "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@" + axes;
    }).filter(Boolean);
    return parts.length ? "https://fonts.googleapis.com/css2?" + parts.join("&") + "&display=swap" : "";
  }

  function loadFonts(families, doc, id) {
    doc = doc || document; id = id || "nl-theme-fonts";
    var unique = families.filter(function (f, i) { return f && families.indexOf(f) === i; });
    var href = fontsHref(unique), link = doc.getElementById(id);
    if (!href) { if (link) link.remove(); return; }
    if (!link) { link = doc.createElement("link"); link.id = id; link.rel = "stylesheet"; doc.head.appendChild(link); }
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  }

  function styleEl(id) {
    var el = document.getElementById(id);
    if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }
    return el;
  }

  function apply(input, opts) {
    var t = normalize(input), d = derive(t), root = document.documentElement;
    Object.keys(d.attrs).forEach(function (k) { root.setAttribute(k, d.attrs[k]); });
    // !important so these win over the older inline colors set by app.js from store_settings
    styleEl("nl-theme-vars").textContent = ":root{" + Object.keys(d.vars).map(function (k) { return k + ":" + d.vars[k] + "!important"; }).join(";") + "}";
    styleEl("nl-theme-custom").textContent = t.custom_css || "";
    loadFonts([t.heading_font, t.body_font].filter(function (f) { return !PAGE_FONTS[f]; }));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.header_bg === "#ffffff" || luminance(t.header_bg) > 0.8 ? t.primary : t.header_bg);
    if (opts && opts.cache) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(t)); } catch (e) { /* storage unavailable */ } }
    window.NaturalifeTheme.current = t;
    try { document.dispatchEvent(new CustomEvent("nl-theme", { detail: t })); } catch (e) { /* old browsers */ }
    return t;
  }

  window.NaturalifeTheme = {
    SLUG: SLUG, DEFAULTS: DEFAULTS, PRESETS: PRESETS, FONTS: FONTS, ENUMS: ENUMS, STYLE_KEYS: STYLE_KEYS, COLOR_KEYS: COLOR_KEYS,
    normalize: normalize, derive: derive, activeSlides: activeSlides, loadFonts: loadFonts, contrast: contrast, readableOn: readableOn, isHex: isHex, mix: mix
  };
  if (configOnly) return;

  /* ---------- storefront runtime ---------- */
  var isPreview = /[?&]theme-preview=1(&|$)/.test(location.search) && window.parent !== window;
  var previewLocked = false;
  window.NaturalifeTheme.apply = apply;

  try { var cached = localStorage.getItem(CACHE_KEY); if (cached) apply(JSON.parse(cached)); } catch (e) { /* ignore */ }

  if (isPreview) {
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== "nl-theme-preview") return;
      previewLocked = true;
      apply(e.data.theme, { cache: false });
    });
    var ready = function () { window.parent.postMessage({ type: "nl-theme-preview-ready" }, location.origin); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
  }

  fetch(SUPABASE_URL + "/rest/v1/store_homepage_pages?select=page_schema&slug=eq." + SLUG + "&status=eq.published&limit=1", { headers: { apikey: KEY, Authorization: "Bearer " + KEY } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rows) {
      if (previewLocked || !rows) return;
      var theme = rows[0] && rows[0].page_schema && rows[0].page_schema.theme;
      if (theme) apply(theme, { cache: !isPreview });
      else if (!isPreview) { try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* ignore */ } }
    })
    .catch(function (e) { console.warn("Site theme could not be loaded", e); });
})();
