import { supabase } from "./supabase.js";
import { SUPABASE_CONFIG_ERROR } from "./config.js";
import { notify, escapeHtml } from "./utils.js";

const status = document.querySelector("[data-dashboard-status]");
const signout = document.querySelector("[data-signout]");
const adminNav = document.querySelector(".dashboard-nav nav");
if (adminNav && !adminNav.querySelector('a[href="security.html"]')) {
  const securityLink = document.createElement("a");
  securityLink.href = "security.html";
  securityLink.textContent = "Account security";
  adminNav.append(securityLink);
}
document.querySelector("[data-dashboard-toggle]")?.addEventListener("click", () => {
  const nav = document.querySelector(".dashboard-nav");
  const btn = document.querySelector("[data-dashboard-toggle]");
  const open = btn?.getAttribute("aria-expanded") === "true";
  nav?.classList.toggle("is-open", !open);
  btn?.setAttribute("aria-expanded", String(!open));
  btn?.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
});
signout?.addEventListener("click", async () => { await supabase?.auth.signOut(); location.href = "../index.html"; });

if (!supabase) setStatus(SUPABASE_CONFIG_ERROR || "Configure the Supabase public URL and anon key to connect the admin dashboard.");
else initialize();

async function initialize() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = "../login.html?next=admin"; return; }
    const { data: profile, error } = await supabase.from("profiles").select("role,account_status").eq("id", user.id).single();
    if (error || profile?.role !== "admin" || profile.account_status !== "active") { location.href = "../account.html"; return; }
    setStatus(`Signed in as ${user.email ?? "administrator"}.`);
    const [users, products, projects, enquiries] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("portfolio_projects").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "open")
    ]);
    const results = { users, products, projects, enquiries };
    for (const [key, result] of Object.entries(results)) {
      if (result.error) throw result.error;
      const target = document.querySelector(`[data-stat="${key}"]`);
      if (target) target.textContent = String(result.count ?? 0);
    }
    const { data: events, error: auditError } = await supabase.from("audit_logs").select("action,target_type,target_id,created_at").order("created_at", { ascending: false }).limit(8);
    if (auditError) throw auditError;
    const activity = document.querySelector("[data-activity]");
    if (activity) activity.innerHTML = events.length ? `<table class="dashboard-table"><thead><tr><th>Action</th><th>Record</th><th>When</th></tr></thead><tbody>${events.map((event) => `<tr><td>${escapeHtml(event.action)}</td><td>${escapeHtml(event.target_type)} ${escapeHtml(event.target_id ?? "")}</td><td>${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</td></tr>`).join("")}</tbody></table>` : "<p>No recorded activity yet.</p>";
  } catch (error) { setStatus(error.message || "Could not load dashboard data."); notify("Some dashboard data could not be loaded.", "error"); }
}
function setStatus(message) { if (status) status.textContent = message; }
