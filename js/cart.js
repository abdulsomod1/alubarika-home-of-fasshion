import { requireSupabase } from "./supabase.js";
import { getProducts } from "./data.js";
import { escapeHtml, money, notify } from "./utils.js";

const root = document.querySelector("[data-cart]");
if (root) renderCart();

async function renderCart() {
  try {
    const client = requireSupabase();
    const cart = JSON.parse(localStorage.getItem("ahd-cart") || "[]");
    if (!cart.length) { root.innerHTML = `<div class="empty-state"><h2>Your bag is at ease.</h2><p>When you find something you love, it will be here.</p><a class="empty-cta" href="shop.html">Explore the collection ↗</a></div>`; return; }
    const ids = cart.map((item) => item.id);
    const data = await getProducts(ids);
    const products = new Map(data.map((product) => [product.id, product]));
    const valid = cart.filter((item) => products.has(item.id));
    const total = valid.reduce((sum, item) => sum + Number(products.get(item.id).price || 0) * item.quantity, 0);
    root.innerHTML = `<div class="cart-layout"><div>${valid.map((item) => { const product = products.get(item.id); const unit = product.unit === "metre" ? "m" : product.unit === "yard" ? "yd" : "pc"; return `<article class="cart-row"><div><h2>${escapeHtml(product.title)}</h2><p>${money(product.price, product.currency ?? "NGN")} / ${escapeHtml(product.unit)} · Quantity ${item.quantity} ${unit}</p></div><button class="text-link" data-remove="${escapeHtml(item.id)}">Remove</button></article>`; }).join("")}</div><aside class="cart-summary"><h2>Order summary</h2><p>Subtotal <strong>${money(total)}</strong></p><p>Delivery and final quantity are confirmed with Albarika.</p><button class="button button--dark" data-checkout>Send order enquiry</button></aside></div>`;
    root.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => { const remaining = valid.filter((item) => item.id !== button.dataset.remove); localStorage.setItem("ahd-cart", JSON.stringify(remaining)); renderCart(); }));
    root.querySelector("[data-checkout]").addEventListener("click", () => { const summary = valid.map((item) => `${products.get(item.id).title} × ${item.quantity}`).join(", "); location.href = `contact.html?subject=${encodeURIComponent(`Order request: ${summary}`)}`; });
  } catch (error) { root.innerHTML = `<div class="empty-state"><h2>Connect to shop</h2><p>${escapeHtml(error.message)}</p></div>`; }
}
