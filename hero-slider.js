/* Naturalife Bali — homepage hero slideshow.
   Built from the published theme (Website appearance → Homepage hero → Slideshow). Each slide uses <picture> with a
   desktop (2400 px), tablet (1600 px) and phone (1080×1920) photo, so every device downloads only its own size. */
(() => {
  "use strict";
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LABELS = { en: ["Previous slide", "Next slide", "Slide {n} of {t}"], id: ["Slide sebelumnya", "Slide berikutnya", "Slide {n} dari {t}"], ru: ["Предыдущий слайд", "Следующий слайд", "Слайд {n} из {t}"] };
  let root = null, slides = [], index = 0, timer = 0, interval = 6000, paused = false, signature = "";

  const lang = () => { const v = (document.getElementById("language") || {}).value; return LABELS[v] ? v : "en"; };
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let fit = "cover";
  function pictureHtml(s, i) {
    const lazy = i > 1; // first two load right away; the rest just before they appear
    const a = lazy ? "data-" : "";
    // "cover": phones get the 9:16 crop. "contain" (whole image): phones get the optional phone design, else the tablet size.
    const phone = fit === "contain" ? (s.ph || s.md) : s.sm;
    return '<picture class="hero-slide' + (fit === "cover" && s.sm ? " has-sm" : "") + (i === 0 ? " is-active" : "") + '" data-i="' + i + '" style="--fp:' + s.fx + "% " + s.fy + '%">' +
      (fit === "contain" ? '<span class="hero-slide-bg" aria-hidden="true"></span>' : "") +
      (phone ? '<source media="(max-width: 760px)" ' + a + 'srcset="' + esc(phone) + '">' : "") +
      (s.md ? '<source media="(max-width: 1280px)" ' + a + 'srcset="' + esc(s.md) + '">' : "") +
      "<img " + a + 'src="' + esc(s.lg) + '" alt="" decoding="async"' + (i === 0 ? ' fetchpriority="high"' : "") + "></picture>";
  }

  function load(i) {
    const pic = root && root.querySelector('.hero-slide[data-i="' + i + '"]');
    if (!pic) return;
    pic.querySelectorAll("[data-srcset]").forEach(el => { el.setAttribute("srcset", el.dataset.srcset); el.removeAttribute("data-srcset"); });
    pic.querySelectorAll("[data-src]").forEach(el => { el.setAttribute("src", el.dataset.src); el.removeAttribute("data-src"); });
  }

  function show(i, fromUser) {
    if (!slides.length) return;
    index = (i + slides.length) % slides.length;
    load(index); load((index + 1) % slides.length);
    root.querySelectorAll(".hero-slide").forEach(p => p.classList.toggle("is-active", Number(p.dataset.i) === index));
    root.querySelectorAll(".hero-dot").forEach((d, n) => d.setAttribute("aria-current", String(n === index)));
    if (fromUser) restart();
  }

  function restart() {
    clearInterval(timer);
    if (slides.length > 1 && !reduceMotion && !paused) timer = setInterval(() => show(index + 1), interval);
  }

  /** Whole-image mode: full width, height from the tallest photo currently in use (phone designs included), max 88% of the screen. */
  function sizeHero() {
    if (!root || fit !== "contain") return;
    let ratio = 0;
    root.querySelectorAll(".hero-slide img").forEach(img => {
      if (img.naturalWidth && img.naturalHeight) ratio = Math.max(ratio, img.naturalHeight / img.naturalWidth);
    });
    if (!ratio) ratio = 9 / 16;
    hero.style.height = Math.round(Math.min(hero.clientWidth * ratio, window.innerHeight * 0.88)) + "px";
  }
  window.addEventListener("resize", () => sizeHero());

  function teardown() {
    clearInterval(timer);
    if (root) root.remove();
    root = null; slides = []; index = 0;
    hero.classList.remove("has-slides");
    hero.style.removeProperty("height");
  }

  function build(theme) {
    const T = window.NaturalifeTheme;
    const list = theme && theme.hero_style === "slides" && T && T.activeSlides ? T.activeSlides(theme) : [];
    const sig = JSON.stringify([list, theme && theme.hero_slide_interval, theme && theme.hero_slide_fit]);
    if (sig === signature) return; // only rebuild when the slides themselves change (not on every colour tweak)
    signature = sig;
    teardown();
    if (!list.length) return;
    slides = list;
    fit = theme.hero_slide_fit === "contain" ? "contain" : "cover";
    interval = (Number(theme.hero_slide_interval) || 6) * 1000;
    const L = LABELS[lang()];
    root = document.createElement("div");
    root.className = "hero-slides";
    root.setAttribute("aria-roledescription", "carousel");
    root.innerHTML = '<div class="hero-slide-track">' + list.map(pictureHtml).join("") + "</div>" +
      (list.length > 1 ?
        '<button type="button" class="hero-arrow prev" aria-label="' + esc(L[0]) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<button type="button" class="hero-arrow next" aria-label="' + esc(L[1]) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
        '<div class="hero-dots">' + list.map((_, i) => '<button type="button" class="hero-dot" aria-label="' + esc(L[2].replace("{n}", i + 1).replace("{t}", list.length)) + '" aria-current="' + (i === 0) + '"></button>').join("") + "</div>" : "");
    hero.prepend(root);
    hero.classList.add("has-slides");
    // Whole-image mode: the hero takes the shape of the first slide (no cropping), and each photo gets a soft blurred backdrop.
    root.querySelectorAll(".hero-slide img").forEach((img, i) => {
      const onLoad = () => {
        const bg = img.parentNode.querySelector(".hero-slide-bg");
        if (bg && img.currentSrc) bg.style.backgroundImage = 'url("' + img.currentSrc.replace(/"/g, "%22") + '")';
        sizeHero();
      };
      img.addEventListener("load", onLoad);
      if (img.complete && img.naturalWidth) onLoad();
    });
    root.addEventListener("click", e => {
      if (e.target.closest(".hero-arrow.prev")) show(index - 1, true);
      else if (e.target.closest(".hero-arrow.next")) show(index + 1, true);
      else { const d = e.target.closest(".hero-dot"); if (d) show([...root.querySelectorAll(".hero-dot")].indexOf(d), true); }
    });
    load(1);
    restart();
  }

  // Pause while the visitor hovers or uses the keyboard inside the hero, and while the tab is hidden.
  hero.addEventListener("mouseenter", () => { paused = true; restart(); });
  hero.addEventListener("mouseleave", () => { paused = false; restart(); });
  hero.addEventListener("focusin", () => { paused = true; restart(); });
  hero.addEventListener("focusout", () => { paused = false; restart(); });
  document.addEventListener("visibilitychange", () => { paused = document.hidden; restart(); });

  // Swipe on phones.
  let startX = 0, startY = 0;
  hero.addEventListener("touchstart", e => { const p = e.touches[0]; startX = p.clientX; startY = p.clientY; }, { passive: true });
  hero.addEventListener("touchend", e => {
    if (slides.length < 2) return;
    const p = e.changedTouches[0], dx = p.clientX - startX, dy = p.clientY - startY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) show(index + (dx < 0 ? 1 : -1), true);
  }, { passive: true });
  hero.addEventListener("keydown", e => {
    if (slides.length < 2 || !e.target.closest(".hero-slides")) return;
    if (e.key === "ArrowLeft") show(index - 1, true);
    if (e.key === "ArrowRight") show(index + 1, true);
  });

  document.addEventListener("nl-theme", e => build(e.detail));
  if (window.NaturalifeTheme && window.NaturalifeTheme.current) build(window.NaturalifeTheme.current);
  const langSel = document.getElementById("language");
  if (langSel) langSel.addEventListener("change", () => {
    if (!root) return;
    const L = LABELS[lang()];
    const prev = root.querySelector(".hero-arrow.prev"), next = root.querySelector(".hero-arrow.next");
    if (prev) prev.setAttribute("aria-label", L[0]);
    if (next) next.setAttribute("aria-label", L[1]);
    root.querySelectorAll(".hero-dot").forEach((d, i) => d.setAttribute("aria-label", L[2].replace("{n}", i + 1).replace("{t}", slides.length)));
  });
})();
