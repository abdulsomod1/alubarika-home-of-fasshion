import { supabase } from "./supabase.js";
import { SUPABASE_CONFIG_ERROR } from "./config.js";
import { getPublished, getProducts, getSettings, mediaUrl } from "./data.js";
import { escapeHtml, money, notify } from "./utils.js";
import { onAuthChange, isSignedIn } from "./session.js";

const page = document.body.dataset.page;
const navItems = [["Fabrics", "shop.html"], ["Tailoring", "services.html"], ["Our work", "portfolio.html"], ["Gallery", "gallery.html"], ["About", "about.html"], ["Contact", "contact.html"]];

async function buildAuthLink() {
  return supabase && (await isSignedIn())
    ? `<a class="header-action-link" href="#" data-sign-out-nav>Sign out</a>`
    : `<a class="header-action-link" href="login.html">Sign in</a>`;
}

async function updateHeaderAuth(header) {
  const authSlot = header.querySelector("[data-auth-slot]");
  if (authSlot) authSlot.innerHTML = await buildAuthLink();
}

const header = document.querySelector("[data-site-header]");
if (header) {
  const authLink = await buildAuthLink();
  header.innerHTML = `
    <header class="site-header">
      <a class="brand" href="index.html" aria-label="Albarika Home of Designs home">
        <img class="brand__mark" src="assets/images/logo.png" alt="Albarika logo" width="42" height="42">
        <span class="brand__name">Albarika<span class="brand__sub">CLOTH &amp; TAILORING</span></span>
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="nav-drawer" aria-label="Open navigation">
        <span class="menu-toggle__bar"></span>
        <span class="menu-toggle__bar"></span>
        <span class="menu-toggle__bar"></span>
      </button>
      <nav class="primary-nav" aria-label="Main navigation">
        ${navItems.map(([label, href]) => `<a href="${href}"${location.pathname.endsWith(href) ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
      <div class="header-actions">
        <span data-auth-slot>${authLink}</span>
        <a class="cart-link" href="cart.html" aria-label="Shopping bag">Bag <span class="cart-count" data-cart-count>0</span></a>
      </div>
    </header>
    <div id="nav-backdrop" class="nav-backdrop" aria-hidden="true"></div>
    <nav id="nav-drawer" class="nav-drawer" aria-label="Mobile navigation" aria-hidden="true">
      <div class="nav-drawer__inner">
        <div class="nav-drawer__head">
          <a class="brand" href="index.html" aria-label="Albarika home">
            <img class="brand__mark" src="assets/images/logo.png" alt="Albarika logo" width="40" height="40">
            <span class="brand__name">Albarika<span class="brand__sub">CLOTH &amp; TAILORING</span></span>
          </a>
        </div>
        <div class="nav-drawer__links">
          ${navItems.map(([label, href]) => `<a href="${href}"${location.pathname.endsWith(href) ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
        </div>
        <div class="nav-drawer__actions">
          <span data-auth-slot>${authLink}</span>
          <a class="cart-link" href="cart.html" aria-label="Shopping bag">Bag <span class="cart-count" data-cart-count>0</span></a>
        </div>
      </div>
    </nav>`;

  // Defensive: always start with the menu in the closed state on page load.
  // This clears any orphan state if the page was navigated to while the
  // menu was open, and ensures no backdrop is visible before event listeners
  // are attached.
  document.body.classList.remove("is-nav-open");

  // ── Drawer state management ──────────────────────────────────────────────
  const drawer = document.getElementById("nav-drawer");
  const backdrop = document.getElementById("nav-backdrop");
  const menuButton = header.querySelector(".menu-toggle");
  const drawerLinks = drawer.querySelectorAll(".nav-drawer__links a");

  function closeMenu() {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("is-visible");
    document.body.classList.remove("is-nav-open");
    menuButton.focus();
  }

  function openMenu() {
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Close navigation");
    drawer.classList.add("is-open");
    backdrop.classList.add("is-visible");
    document.body.classList.add("is-nav-open");
    drawer.setAttribute("aria-hidden", "false");
    drawer.querySelector("a")?.focus();
  }

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeMenu();
  });

  // Close on backdrop click
  backdrop.addEventListener("click", closeMenu);

  // Close when a nav link is activated (navigates to a new page)
  drawerLinks.forEach((link) => link.addEventListener("click", closeMenu));

  // Close on focus-trap breach: Tab outside drawer closes it
  drawer.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !drawer.contains(e.relatedTarget)) closeMenu();
  });

  // Sign out — delegated on the header so it works after re-renders
  header.addEventListener("click", async (e) => {
    if (e.target.matches("[data-sign-out-nav]")) {
      e.preventDefault();
      if (supabase) await supabase.auth.signOut();
      location.href = "index.html";
    }
  });

  // React to auth state changes
  onAuthChange(() => updateHeaderAuth(header));
}

const footer = document.querySelector("[data-site-footer]");
if (footer) {
  supabase?.auth.getUser().then(({ data }) => {
    const authText = data?.user
      ? `<a href="account.html">Your account</a><button class="footer-signout" type="button" data-sign-out-footer>Sign out</button>`
      : `<a href="login.html">Sign in</a>`;
    footer.innerHTML = `<footer class="site-footer"><div class="footer-main"><div class="footer-brand"><a class="brand" href="index.html"><img class="brand__mark" src="assets/images/logo.png" alt="Albarika logo" width="42" height="42"><span class="brand__name">Albarika<span class="brand__sub">CLOTH & TAILORING</span></span></a><p>Fine cloth, thoughtful tailoring, and a fit made around you.</p></div><div class="footer-col"><h2>EXPLORE</h2><a href="shop.html">Shop fabrics</a><a href="services.html">Tailoring</a><a href="portfolio.html">Our work</a><a href="gallery.html">Fabric gallery</a></div><div class="footer-col"><h2>GET IN TOUCH</h2>${authText}</div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Albarika Home of Designs</span><span>Cloth · craft · fit.</span></div></footer>`;
    footer.querySelector("[data-sign-out-footer]")?.addEventListener("click", async () => { if (supabase) await supabase.auth.signOut(); location.href = "index.html"; });
  });

  // React to auth state changes in footer
  onAuthChange((event) => {
    if (event === "SIGNED_OUT" && footer) {
      footer.innerHTML = `<footer class="site-footer"><div class="footer-main"><div class="footer-brand"><a class="brand" href="index.html"><img class="brand__mark" src="assets/images/logo.png" alt="Albarika logo" width="42" height="42"><span class="brand__name">Albarika<span class="brand__sub">CLOTH & TAILORING</span></span></a><p>Fine cloth, thoughtful tailoring, and a fit made around you.</p></div><div class="footer-col"><h2>EXPLORE</h2><a href="shop.html">Shop fabrics</a><a href="services.html">Tailoring</a><a href="portfolio.html">Our work</a><a href="gallery.html">Fabric gallery</a></div><div class="footer-col"><h2>GET IN TOUCH</h2><a href="login.html">Sign in</a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Albarika Home of Designs</span><span>Cloth · craft · fit.</span></div></footer>`;
    }
  });
}

async function renderHome() {
  try {
    const [settings, projects, products] = await Promise.all([
      getSettings(), getPublished("portfolio_projects", "id,title,description,location,cover_path,created_at"), getProducts()
    ]);
    const title = document.querySelector("[data-hero-title]");
    const description = document.querySelector("[data-hero-description]");
    if (title && settings.hero_heading) title.innerHTML = escapeHtml(settings.hero_heading).replace(/\n/g, "<br>");
    if (description && settings.hero_description) description.textContent = settings.hero_description;
    if (settings.hero_image_path) document.querySelector("[data-hero-image]").src = await mediaUrl(settings.hero_image_path);
    const projectGrid = document.querySelector("[data-project-grid]");
    if (projectGrid) projectGrid.innerHTML = projects.length ? (await Promise.all(projects.slice(0, 2).map(async (item) => `<a class="project-card" href="portfolio.html"><img class="project-card__image" src="${escapeHtml(await mediaUrl(item.cover_path))}" alt="${escapeHtml(item.title)}" loading="lazy"><div class="project-card__meta"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.location ?? "")}</p></div><span aria-hidden="true">↗</span></div></a>`))).join("") : `<p class="loading-line">Our project stories are taking shape. Check back soon.</p>`;
    const productGrid = document.querySelector("[data-featured-products]");
    if (productGrid) productGrid.innerHTML = products.length ? (await Promise.all(products.slice(0, 2).map(productCard))).join("") : `<p class="loading-line">The collection is being thoughtfully assembled. Check back soon.</p>`;
  } catch (error) {
    const message = /invalid api key/i.test(error?.message ?? "")
      ? "Supabase rejected the anon key. Replace it with the project's valid anon/public key in js/config.js."
      : /PGRST205|schema cache|could not find the table/i.test(`${error?.code ?? ""} ${error?.message ?? ""}`)
        ? "The Albarika catalog schema is not installed in this Supabase project yet. Apply the migration in supabase/migrations."
        : /rls|permission\s*denied|permission_error|violates\s*row\s*level\s*security|privileges|no\s*perm/i.test(`${error?.code ?? ""} ${error?.message ?? ""}`)
          ? "The published catalogue is not publicly accessible. Add a public RLS policy to the products table in Supabase."
          : "The Albarika catalog is unavailable. Check the Supabase connection and migration status.";
    if (supabase) notify(message, "error");
    document.querySelectorAll(".loading-line").forEach((el) => { el.textContent = message; });
  }
}

async function productCard(product) {
  const unit = product.unit === "metre" ? "per metre" : product.unit === "yard" ? "per yard" : "per piece";
  const media = await mediaUrl(product.cover_path);
  const isVideo = /\.(mp4|webm|mov|ogv)$/i.test(product.cover_path ?? "");
  return `<article class="product-card"><a href="product-details.html?slug=${encodeURIComponent(product.slug)}"><div class="product-card__image-wrap">${isVideo ? `<div class="product-card__video-wrap"><video src="${escapeHtml(media)}" muted loop playsinline preload="none"></video></div>` : `<img class="product-card__image" src="${escapeHtml(media)}" alt="${escapeHtml(product.title)}" loading="lazy">`}<span class="product-card__quick">View fabric</span></div><h3>${escapeHtml(product.title)}</h3><p class="product-card__price">${product.price == null ? "Enquire for price" : `${money(product.price, product.currency ?? "NGN")} ${unit}`}</p></a></article>`;
}

const cartCount = document.querySelector("[data-cart-count]");
if (cartCount) cartCount.textContent = String(JSON.parse(localStorage.getItem("ahd-cart") || "[]").reduce((sum, row) => sum + row.quantity, 0));
if (page === "home" && supabase) renderHome();
if (page === "home" && !supabase) document.querySelectorAll(".loading-line").forEach((el) => { el.textContent = SUPABASE_CONFIG_ERROR || "The fabric collection will appear here when it is published."; });

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: .12 });
document.querySelectorAll(".content-section,.intro-section,.feature-band,.shop-band,.closing-note").forEach((section) => { section.classList.add("reveal"); observer.observe(section); });

// Video hover play/pause on product cards (handles dynamically loaded cards)
function attachVideoHover(card) {
  const video = card.querySelector("video");
  if (!video) return;
  card.addEventListener("mouseenter", () => { video.play().catch(() => {}); });
  card.addEventListener("mouseleave", () => { video.pause(); video.currentTime = 0; });
}
document.querySelectorAll(".product-card").forEach(attachVideoHover);
const cardObserver = new MutationObserver((mutations) => {
  mutations.forEach((m) => m.addedNodes.forEach((node) => { if (node.nodeType === 1 && node.matches(".product-card")) attachVideoHover(node); if (node.nodeType === 1) node.querySelectorAll?.(".product-card").forEach(attachVideoHover); }));
});
document.querySelectorAll("[data-page-content]").forEach((el) => cardObserver.observe(el, { childList: true }));
