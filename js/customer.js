import { supabase } from "./supabase.js";
import { SUPABASE_CONFIG_ERROR } from "./config.js";
import { escapeHtml, money } from "./utils.js";
const root = document.querySelector("[data-customer-content]");
if (root) load();
async function load() {
  if (!supabase) { root.textContent = SUPABASE_CONFIG_ERROR || "Connect Supabase to access customer account data."; return; }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = "login.html"; return; }
  if (document.body.dataset.page === "orders") {
    const { data, error } = await supabase.from("orders").select("id,status,payment_status,total,currency,created_at").eq("customer_id", user.id).order("created_at", { ascending: false });
    if (error) { root.textContent = "Orders could not be loaded."; return; }
    root.innerHTML = data.length ? `<table class="dashboard-table"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>${data.map((order) => `<tr><td>${escapeHtml(order.id.slice(0,8))}</td><td>${new Date(order.created_at).toLocaleDateString()}</td><td>${escapeHtml(order.status)}</td><td>${money(order.total, order.currency)}</td></tr>`).join("")}</tbody></table>` : `<div class="empty-state"><h2>No orders yet.</h2><p>Once you place an order, it will appear here.</p></div>`;
  } else {
    const { data, error } = await supabase.from("profiles").select("username,display_name,created_at").eq("id", user.id).single();
    if (error) { root.textContent = "Account details could not be loaded."; return; }
    root.innerHTML = `<div class="notice">Username: ${escapeHtml(data.username)}<br>Email: ${escapeHtml(user.email ?? "")}<br>Email ownership has not been verified.</div>`;
  }
}
