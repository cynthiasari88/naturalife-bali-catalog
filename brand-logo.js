/* Naturalife Bali - shared logo. Add to every page (storefront, blog, faq, admin):
   <script src="https://naturalife-bali-catalog.vercel.app/brand-logo.js" defer></script>
   To change the logo later, replace logo.png in the repo. */
(function () {
  var LOGO = "https://naturalife-bali-catalog.vercel.app/logo.png";
  var style = document.createElement("style");
  style.textContent =
    ".nl-logo{display:block;height:52px;width:auto;max-width:190px;object-fit:contain}" +
    ".nl-hide{display:none!important}" +
    "@media(max-width:540px){.nl-logo{height:38px;max-width:125px}}";
  document.head.appendChild(style);

  function apply() {
    var brands = document.querySelectorAll(".brand, .brand-link, .admin-brand, .sidebar-brand, .logo");
    brands.forEach(function (brand) {
      if (brand.querySelector(".nl-logo")) return;
      var img = document.createElement("img");
      img.className = "nl-logo";
      img.src = LOGO;
      img.alt = "Naturalife Bali";
      brand.insertBefore(img, brand.firstChild);
      brand.querySelectorAll(".brand-mark, .brand-logo-image, .brand-fixed-logo, strong").forEach(function (el) {
        el.classList.add("nl-hide");
      });
    });
  }

  function start() {
    apply();
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
