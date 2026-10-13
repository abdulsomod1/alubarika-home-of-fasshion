import { requireSupabase } from "./supabase.js";
import { mediaUrl, getProducts, getPublished, normalizeProduct } from "./data.js";
import { escapeHtml, money, notify } from "./utils.js";

const page = document.body.dataset.page;
const root = document.querySelector("[data-page-content]");
const filterBar = document.querySelector("[data-shop-filter]");
let activeFilter = "";

if (root && ["shop", "portfolio", "gallery", "videos", "services", "product"].includes(page)) loadPage().catch((error) => {
  const message = /invalid.*key|key.*invalid/i.test(error?.message ?? "")
    ? "Supabase rejected the anon key. Replace it with the current project anon/public key in js/config.js."
    : /PGRST205|schema cache|could not find the table/i.test(`${error?.code ?? ""} ${error?.message ?? ""}`)
      ? "The Albarika catalogue schema is not installed yet. Apply the Supabase migration first."
      : "The published catalogue could not be loaded. Check the Supabase connection and migration status.";
  root.innerHTML = `<div class="empty-state"><h2>Catalogue unavailable</h2><p>${escapeHtml(message)}</p></div>`;
});

if (filterBar) filterBar.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter]");
  if (!btn) return;
  filterBar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  activeFilter = btn.dataset.filter;
  loadPage();
});

async function loadPage() {
  if (page === "product") return renderProduct();
  if (root) root.innerHTML = `<p class="loading-line">Loading the collection…</p>`;
  const config = {
    portfolio: ["portfolio_projects", "id,title,description,location,cover_path,created_at", "project-grid"],
    gallery: ["media", "id,title,description,category,storage_path,kind", "catalog-grid"],
    videos: ["media", "id,title,description,category,storage_path,thumbnail_path,kind", "catalog-grid"],
    services: ["services", "id,title,description,cover_path", "catalog-grid"]
  }[page];

  let items;
  if (page === "shop") {
    items = await getProducts();
    if (activeFilter) items = items.filter((item) => item.listing_type === activeFilter);
  } else {
    items = await getPublished(config[0], config[1]);
  }

  root.className = page === "shop" ? "catalog-grid" : config[2];
  const emptyMessage = page === "shop"
    ? activeFilter
      ? `No ${activeFilter === "fabric" ? "fabrics" : activeFilter === "garment" ? "ready-to-wear pieces" : "tailoring services"} published yet. Check back soon.`
      : "No fabrics are currently published. Please check again soon."
    : `New ${escapeHtml(page)} will appear here as soon as they are published.`;
  if (root) root.innerHTML = items.length ? (await Promise.all(items.filter((item) => page !== "videos" || item.kind === "video").map((item) => card(item)))).join("") : `<div class="empty-state"><h2>Nothing to show just yet</h2><p>${emptyMessage}</p>${page === "shop" ? `<a class="empty-cta" href="shop.html">Browse all fabrics ↗</a>` : ""}</div>`;
}

async function card(item) {
  const title = escapeHtml(item.title);
  const media = await mediaUrl(item.cover_path ?? item.thumbnail_path ?? item.storage_path);
  const isVideo = /\.(mp4|webm|mov|ogv)$/i.test(item.cover_path ?? item.thumbnail_path ?? item.storage_path ?? "");
  if (page === "shop") return `<article class="product-card"><a href="product-details.html?slug=${encodeURIComponent(item.slug)}"><div class="product-card__image-wrap">${isVideo ? `<div class="product-card__video-wrap"><video src="${escapeHtml(media)}" muted loop playsinline preload="none"></video></div>` : `<img class="product-card__image" src="${escapeHtml(media)}" alt="${title}" loading="lazy">`}<span class="product-card__quick">View fabric</span></div><h3>${title}</h3><p class="product-card__price">${item.price == null ? "Enquire for price" : `${money(item.price, item.currency ?? "NGN")} ${item.unit === "metre" ? "per metre" : item.unit === "yard" ? "per yard" : "per piece"}`}</p></a></article>`;
  if (page === "videos") return `<article class="media-card"><video controls preload="metadata" poster="${escapeHtml(mediaUrl(item.thumbnail_path))}" src="${escapeHtml(media)}"></video><h2>${title}</h2><p>${escapeHtml(item.description ?? "")}</p></article>`;
  if (page === "services") return `<article class="service-card"><h2>${title}</h2><p>${escapeHtml(item.description ?? "")}</p></article>`;
  return `<article class="project-card"><img class="project-card__image" src="${escapeHtml(media)}" alt="${title}" loading="lazy"><div class="project-card__meta"><div><h3>${title}</h3><p>${escapeHtml(item.location ?? item.category ?? "")}</p></div></div></article>`;
}

async function renderProduct() {
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) throw new Error("No design was selected.");
  const { data, error } = await requireSupabase().from("products").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This design is not available.");
  Object.assign(data, normalizeProduct(data));
  const media = await mediaUrl(data.cover_path);
  const isVideo = /\.(mp4|webm|mov|ogv)$/i.test(data.cover_path ?? "");
  const listingLabel = data.listing_type === "tailoring" ? "MADE TO MEASURE" : data.listing_type === "garment" ? "READY TO WEAR" : "ALBARIKA FABRIC";
  const priceHtml = data.price == null ? `<p class="product-price">Enquire for price</p>` : `<p class="product-price">${money(data.price, data.currency ?? "NGN")} ${data.unit === "metre" ? "per metre" : data.unit === "yard" ? "per yard" : "per piece"}</p>`;
  const actionHtml = data.availability === "enquiry" || data.listing_type === "tailoring"
    ? `<a class="button button--dark" href="contact.html?subject=${encodeURIComponent(`Enquiry: ${data.title}`)}">Ask about this piece</a>`
    : `<button class="button button--dark" data-add-to-cart="${escapeHtml(data.id)}"${data.availability === "unavailable" ? " disabled" : ""}>Add to bag</button>`;
  const metaItems = [
    data.color ? `<p><strong>Colour</strong> ${escapeHtml(data.color)}</p>` : "",
    data.fabric_composition ? `<p><strong>Composition</strong> ${escapeHtml(data.fabric_composition)}</p>` : "",
    data.fabric_width_cm ? `<p><strong>Width</strong> ${escapeHtml(data.fabric_width_cm)} cm</p>` : ""
  ].filter(Boolean).join("");
  root.innerHTML = `<div class="detail-layout"><${isVideo ? `video src="${escapeHtml(media)}" muted loop playsinline` : `img src="${escapeHtml(media)}"`} alt="${escapeHtml(data.title)}"><div class="detail-copy"><p class="eyebrow eyebrow--ink">${listingLabel}</p><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.description ?? "")}</p>${metaItems}${priceHtml}${actionHtml}</div></div>`;
  root.querySelector("[data-add-to-cart]")?.addEventListener("click", () => {
    const cart = JSON.parse(localStorage.getItem("ahd-cart") || "[]");
    const found = cart.find((item) => item.id === data.id);
    if (found) found.quantity += 1; else cart.push({ id: data.id, quantity: 1 });
    localStorage.setItem("ahd-cart", JSON.stringify(cart));
    notify("Added to your bag.");
    const count = document.querySelector("[data-cart-count]"); if (count) count.textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
  });
}
