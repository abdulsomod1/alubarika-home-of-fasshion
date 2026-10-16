import { supabase } from "./supabase.js";
import { SUPABASE_CONFIG_ERROR } from "./config.js";
import { escapeHtml, notify, money } from "./utils.js";

const kind = document.body.dataset.management;
const table = document.querySelector("[data-management-table]");
const statusLine = document.querySelector("[data-management-status]");
const adminNav = document.querySelector(".dashboard-nav nav");
if (adminNav && !adminNav.querySelector('a[href="security.html"]')) {
  const securityLink = document.createElement("a");
  securityLink.href = "security.html";
  securityLink.textContent = "Account security";
  adminNav.append(securityLink);
}
let rows = [];

if (!supabase) setStatus(SUPABASE_CONFIG_ERROR || "Configure Supabase before using management tools.");
else authorize().then(() => load()).catch((error) => setStatus(error.message));
document.querySelector("[data-signout]")?.addEventListener("click", async () => { await supabase?.auth.signOut(); location.href = "../index.html"; });

// Create backdrop element for mobile nav drawer
let backdrop = document.getElementById("dashboard-backdrop");
if (!backdrop) {
  backdrop = document.createElement("div");
  backdrop.id = "dashboard-backdrop";
  backdrop.className = "dashboard-backdrop";
  backdrop.style.display = "none";
  document.body.appendChild(backdrop);
}

function closeDashboardNav() {
  const nav = document.querySelector(".dashboard-nav nav");
  const navAside = document.querySelector(".dashboard-nav");
  const btn = document.querySelector("[data-dashboard-toggle]");
  if (nav) {
    nav.style.transform = "translateX(100%)";
    nav.style.pointerEvents = "none";
  }
  if (navAside) navAside.classList.remove("is-open");
  if (btn) {
    btn.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Open navigation");
  }
  if (backdrop) {
    backdrop.classList.remove("is-visible");
    backdrop.style.pointerEvents = "none";
  }
  document.body.classList.remove("is-nav-open");
}

function openDashboardNav() {
  const nav = document.querySelector(".dashboard-nav nav");
  const navAside = document.querySelector(".dashboard-nav");
  const btn = document.querySelector("[data-dashboard-toggle]");
  if (nav) {
    nav.style.transform = "";
    nav.style.pointerEvents = "auto";
  }
  if (navAside) navAside.classList.add("is-open");
  if (btn) {
    btn.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-label", "Close navigation");
  }
  if (backdrop) {
    backdrop.style.pointerEvents = "auto";
    backdrop.classList.add("is-visible");
  }
  document.body.classList.add("is-nav-open");
}

document.querySelector("[data-dashboard-toggle]")?.addEventListener("click", () => {
  const nav = document.querySelector(".dashboard-nav");
  const btn = document.querySelector("[data-dashboard-toggle]");
  const isOpen = btn?.getAttribute("aria-expanded") === "true";
  if (isOpen) closeDashboardNav();
  else openDashboardNav();
});

// Close nav when clicking on backdrop
backdrop?.addEventListener("click", closeDashboardNav);

// Close nav on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDashboardNav();
});

// Close nav when clicking on nav links
document.querySelectorAll(".dashboard-nav nav a").forEach(link => {
  link.addEventListener("click", closeDashboardNav);
});
document.querySelector("[data-search]")?.addEventListener("input", render);
document.querySelector("[data-role-filter]")?.addEventListener("change", render);
document.querySelector("[data-status-filter]")?.addEventListener("change", render);

async function authorize() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = "../login.html?next=admin"; throw new Error("Sign in required."); }
  const { data, error } = await supabase.from("profiles").select("role,account_status").eq("id", user.id).single();
  if (error || data?.role !== "admin" || data.account_status !== "active") { location.href = "../account.html"; throw new Error("Administrator access required."); }
}

async function load() {
  setStatus("Loading records…");
  if (kind === "users" || kind === "staff") return loadUsers();
  if (kind === "products") return loadProducts();
  if (kind === "media") return loadMedia();
  if (kind === "audit") return loadAudit();
  if (kind === "analytics") return loadAnalytics();
  if (kind === "settings") return loadSettings();
  setStatus("Choose a management section.");
}

async function loadUsers() {
  const query = supabase.from("profiles").select("id,username,display_name,role,account_status,created_at").order("created_at", { ascending: false }).range(0, 99);
  const { data, error } = await query;
  if (error) throw error;
  rows = kind === "staff" ? data.filter((row) => row.role === "staff") : data;
  setStatus(`${rows.length} ${kind === "staff" ? "staff members" : "accounts"} loaded. Showing up to 100 newest records.`);
  render();
}

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("id,title,slug,price,currency,availability,status,created_at,listing_type,unit,color,fabric_composition,fabric_width_cm,cover_path").order("created_at", { ascending: false }).range(0, 99);
  if (error) throw error;
  rows = data;
  setStatus(`${rows.length} catalogue listings loaded.`);
  render();
  document.querySelector("[data-product-form]")?.addEventListener("submit", createProduct);
  const coverInput = document.querySelector("[name=cover]");
  const preview = document.querySelector("[data-cover-preview]");
  if (coverInput && preview) {
    coverInput.addEventListener("change", () => {
      const file = coverInput.files?.[0];
      if (!file) {
        preview.innerHTML = "";
      } else if (file.type.startsWith("image/")) {
        preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Preview" style="max-width:200px;max-height:140px;object-fit:cover;border-radius:4px;">`;
      } else if (file.type.startsWith("video/")) {
        preview.innerHTML = `<video src="${URL.createObjectURL(file)}" controls style="max-width:200px;max-height:140px;border-radius:4px;"></video>`;
      } else {
        preview.innerHTML = file.name;
      }
    });
  }
}

async function createProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const { data: { user } } = await supabase.auth.getUser();
  const title = form.title.value?.trim();
  if (!title) { form.querySelector("[data-form-error]").textContent = "A title is required."; return; }
  const slug = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const output = form.querySelector("[data-form-error]");
  const btn = form.querySelector("[type=submit]"); btn.disabled = true;
  try {
    let coverPath = form.cover_path.value?.trim() || null;
    const coverFile = form.cover.files?.[0];
    if (coverFile?.size) {
      if (coverFile.size > 10 * 1024 * 1024) throw new Error("Cover image must be under 10 MB.");
      if (!/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm))$/.test(coverFile.type)) throw new Error("Use JPG, PNG, WebP, AVIF, MP4, or WebM for the cover.");
      const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}-${slug}.${ext}`;
      const { error: upErr } = await supabase.storage.from("public-media").upload(path, coverFile, { contentType: coverFile.type, upsert: false });
      if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);
      coverPath = path;
    }
    const { data: marker } = await supabase.from("site_settings").select("value").eq("key", "catalog_schema").maybeSingle();
    const listing = { title, slug, description: form.description.value || null, listing_type: form.listing_type.value || "fabric", unit: form.unit.value || "metre", price: form.price.value ? Number(form.price.value) : null, color: form.color.value || null, fabric_composition: form.fabric_composition.value || null, fabric_width_cm: form.fabric_width_cm.value ? Number(form.fabric_width_cm.value) : null, cover_path: coverPath, availability: form.availability.value || "available", status: form.status.value || "draft", created_by: user.id };
    let coreListing = listing;
    if (marker?.value !== "fabric-v1") {
      const { listing_type, unit, color, fabric_composition, fabric_width_cm, ...coreValues } = listing;
      coreListing = coreValues;
    }
    const { error } = await supabase.from("products").insert(coreListing);
    if (error) { if (coverPath !== (form.cover_path.value?.trim() || null)) await supabase.storage.from("public-media").remove([coverPath]); throw new Error(error.message); }
    form.reset(); notify("Design saved as a draft.");
    if (document.querySelector("[data-cover-preview]")) document.querySelector("[data-cover-preview]").innerHTML = "";
    await loadProducts();
  } catch (err) { output.textContent = err.message; notify(err.message, "error"); }
  finally { btn.disabled = false; }
}

async function loadMedia() {
  const { data, error } = await supabase.from("media").select("id,title,description,kind,storage_path,thumbnail_path,mime_type,byte_size,status,feedback,created_by,created_at").order("created_at", { ascending: false }).range(0, 99);
  if (error) throw error;
  rows = data;
  setStatus(`${rows.length} media records loaded.`);
  render();
}

async function loadAudit() {
  const { data, error } = await supabase.from("audit_logs").select("id,actor_id,action,target_type,target_id,created_at").order("created_at", { ascending: false }).range(0, 99);
  if (error) throw error;
  rows = data;
  setStatus(`${rows.length} recent audit events loaded.`);
  render();
}

async function loadAnalytics() {
  const counts = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "staff").eq("account_status", "active"),
    supabase.from("media").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "open")
  ]);
  const keys = ["users", "staff", "pending", "enquiries"];
  counts.forEach((result, index) => { if (result.error) throw result.error; document.querySelector(`[data-stat="${keys[index]}"]`).textContent = String(result.count ?? 0); });
  setStatus("Counts reflect current Supabase records; no sample figures are shown.");
}

async function loadSettings() {
  const form = document.querySelector("[data-settings-form]");
  const { data, error } = await supabase.from("site_settings").select("key,value").in("key", ["hero_heading", "hero_description", "contact_email"]);
  if (error) throw error;
  for (const entry of data) if (form.elements[entry.key]) form.elements[entry.key].value = entry.value;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = await supabase.auth.getUser();
    const updates = [...new FormData(form).entries()].map(([key, value]) => ({ key, value, updated_by: user.data.user.id }));
    const result = await supabase.from("site_settings").upsert(updates, { onConflict: "key" });
    if (result.error) form.querySelector("[data-form-error]").textContent = result.error.message;
    else { form.querySelector("[data-form-error]").textContent = "Settings saved."; notify("Website settings saved."); }
  });
  setStatus("Website settings loaded.");
}

function render() {
  if (!table) return;
  const search = (document.querySelector("[data-search]")?.value ?? "").trim().toLowerCase();
  const role = document.querySelector("[data-role-filter]")?.value ?? "";
  const status = document.querySelector("[data-status-filter]")?.value ?? "";
  const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search) && (!role || row.role === role) && (!status || row.account_status === status || row.status === status));
  if (kind === "users" || kind === "staff") table.innerHTML = `<table class="dashboard-table"><thead><tr><th>Username</th><th>Display name</th><th>Role</th><th>Account</th><th>Joined</th><th>Change access</th></tr></thead><tbody>${filtered.map((row) => `<tr><td>${escapeHtml(row.username)}</td><td>${escapeHtml(row.display_name)}</td><td>${escapeHtml(row.role)}</td><td>${escapeHtml(row.account_status)}</td><td>${new Date(row.created_at).toLocaleDateString()}</td><td><select aria-label="New role" data-new-role="${row.id}"><option ${row.role === "customer" ? "selected" : ""}>customer</option><option ${row.role === "staff" ? "selected" : ""}>staff</option><option ${row.role === "admin" ? "selected" : ""}>admin</option></select><select aria-label="New account status" data-new-status="${row.id}"><option ${row.account_status === "active" ? "selected" : ""}>active</option><option ${row.account_status === "suspended" ? "selected" : ""}>suspended</option></select><button class="table-action" data-save-user="${row.id}">Save</button></td></tr>`).join("")}</tbody></table>`;
  else if (kind === "products") table.innerHTML = `<table class="dashboard-table"><thead><tr><th>Listing</th><th>Type</th><th>Price</th><th>Availability</th><th>Status</th><th>Actions</th></tr></thead><tbody>${filtered.map((row) => `<tr><td>${escapeHtml(row.title)}${row.color ? `<br><small>${escapeHtml(row.color)}</small>` : ""}</td><td>${escapeHtml(row.listing_type)} / ${escapeHtml(row.unit)}</td><td>${row.price == null ? "Ask for price" : `${money(row.price, row.currency)} / ${escapeHtml(row.unit)}`}</td><td>${escapeHtml(row.availability)}</td><td><select data-product-status="${row.id}"><option ${row.status === "draft" ? "selected" : ""}>draft</option><option ${row.status === "published" ? "selected" : ""}>published</option></select></td><td><button class="table-action" data-update-product="${row.id}">Update</button> <button class="table-action" data-delete-product="${row.id}">Delete</button></td></tr>`).join("")}</tbody></table>`;
  else if (kind === "media") table.innerHTML = `<table class="dashboard-table"><thead><tr><th>Media</th><th>Type</th><th>File size</th><th>Status</th><th>Actions</th></tr></thead><tbody>${filtered.map((row) => `<tr><td>${escapeHtml(row.title)}<br><small>${escapeHtml(row.feedback ?? "")}</small></td><td>${escapeHtml(row.kind)}</td><td>${(row.byte_size / 1048576).toFixed(1)} MB</td><td>${escapeHtml(row.status)}</td><td><select data-media-status="${row.id}"><option ${row.status === "pending" ? "selected" : ""}>pending</option><option ${row.status === "published" ? "selected" : ""}>published</option><option ${row.status === "rejected" ? "selected" : ""}>rejected</option></select><button class="table-action" data-update-media="${row.id}">Review</button><button class="table-action" data-delete-media="${row.id}">Delete</button></td></tr>`).join("")}</tbody></table>`;
  else if (kind === "audit") table.innerHTML = `<table class="dashboard-table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>${filtered.map((row) => `<tr><td>${new Date(row.created_at).toLocaleString()}</td><td>${escapeHtml(row.actor_id ?? "system")}</td><td>${escapeHtml(row.action)}</td><td>${escapeHtml(row.target_type)} ${escapeHtml(row.target_id ?? "")}</td></tr>`).join("")}</tbody></table>`;
  if (!filtered.length) table.innerHTML = `<div class="empty-state"><h2>No matching records</h2></div>`;
  table.querySelectorAll("[data-save-user]").forEach((button) => button.addEventListener("click", () => changeUser(button.dataset.saveUser)));
  table.querySelectorAll("[data-update-product]").forEach((button) => button.addEventListener("click", () => updateProduct(button.dataset.updateProduct)));
  table.querySelectorAll("[data-delete-product]").forEach((button) => button.addEventListener("click", () => deleteProduct(button.dataset.deleteProduct)));
  table.querySelectorAll("[data-update-media]").forEach((button) => button.addEventListener("click", () => updateMedia(button.dataset.updateMedia)));
  table.querySelectorAll("[data-delete-media]").forEach((button) => button.addEventListener("click", () => deleteMedia(button.dataset.deleteMedia)));
}

async function changeUser(id) {
  const role = table.querySelector(`[data-new-role="${CSS.escape(id)}"]`).value;
  const accountStatus = table.querySelector(`[data-new-status="${CSS.escape(id)}"]`).value;
  if (!confirm(`Apply role: ${role} and status: ${accountStatus}?`)) return;
  const { error } = await supabase.rpc("admin_set_user_access", { target_user: id, new_role: role, new_status: accountStatus });
  if (error) { notify(error.message, "error"); return; }
  notify("Account access updated."); await loadUsers();
}
async function updateProduct(id) {
  const statusValue = table.querySelector(`[data-product-status="${CSS.escape(id)}"]`).value;
  if (statusValue === "published" && !confirm("Publish this design on the public storefront?")) return;
  const { error } = await supabase.from("products").update({ status: statusValue }).eq("id", id);
  if (error) notify(error.message, "error"); else { notify("Design status updated."); await loadProducts(); }
}
async function deleteProduct(id) {
  if (!confirm("Delete this design? This cannot be undone.")) return;
  const item = rows.find((row) => row.id === id);
  // Remove cover image from storage if one exists
  if (item?.cover_path) {
    const { error: storageError } = await supabase.storage.from("public-media").remove([item.cover_path]);
    if (storageError) notify(`Cover image could not be removed from storage: ${storageError.message}`, "error");
  }
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) { notify(error.message, "error"); return; }
  notify("Design deleted."); await loadProducts();
}
async function updateMedia(id) {
  const item = rows.find((row) => row.id === id);
  const statusValue = table.querySelector(`[data-media-status="${CSS.escape(id)}"]`).value;
  if (statusValue === "published" && !confirm("Approve and publish this media? It becomes available to public pages.")) return;
  const { error } = await supabase.from("media").update({ status: statusValue }).eq("id", id);
  if (error) { notify(error.message, "error"); return; }
  notify("Media review saved."); await loadMedia();
}
async function deleteMedia(id) {
  const item = rows.find((row) => row.id === id);
  if (!confirm("Delete this media record and its stored file?")) return;
  const { error: storageError } = await supabase.storage.from("public-media").remove([item.storage_path]);
  if (storageError) { notify(`Storage file could not be removed: ${storageError.message}`, "error"); return; }
  const { error: dbError } = await supabase.from("media").delete().eq("id", id);
  if (dbError) { notify(`Storage file removed, but the database record could not be deleted. Manual cleanup may be needed: ${dbError.message}`, "error"); return; }
  notify("Media and its stored file deleted.");
  await loadMedia();
}
function setStatus(message) { if (statusLine) statusLine.textContent = message; }
