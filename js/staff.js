import { supabase } from "./supabase.js";
import { SUPABASE_CONFIG_ERROR } from "./config.js";
import { notify, escapeHtml, money } from "./utils.js";

const page = document.body.dataset.page;
const staffPage = document.body.dataset.staff;
const status = document.querySelector("[data-staff-status]");
const signout = document.querySelector("[data-signout]");

if (signout) signout.addEventListener("click", async () => { await supabase?.auth.signOut(); location.href = "../index.html"; });
// Mobile nav: backdrop + toggle + close handlers
function ensureBackdrop() {
  if (document.getElementById("dashboard-backdrop")) return;
  const el = document.createElement("div");
  el.id = "dashboard-backdrop";
  el.className = "dashboard-backdrop";
  document.body.appendChild(el);
}

function closeDashboardNav() {
  const nav = document.querySelector(".dashboard-nav");
  const btn = document.querySelector("[data-dashboard-toggle]");
  if (nav && btn) {
    nav.classList.remove("is-open");
    btn.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Open navigation");
    document.getElementById("dashboard-backdrop")?.classList.remove("is-visible");
    document.body.classList.remove("is-nav-open");
  }
}

function openDashboardNav() {
  const nav = document.querySelector(".dashboard-nav");
  const btn = document.querySelector("[data-dashboard-toggle]");
  if (nav && btn) {
    nav.classList.add("is-open");
    btn.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-label", "Close navigation");
    document.getElementById("dashboard-backdrop")?.classList.add("is-visible");
    document.body.classList.add("is-nav-open");
  }
}

ensureBackdrop();

document.querySelector("[data-dashboard-toggle]")?.addEventListener("click", () => {
  const btn = document.querySelector("[data-dashboard-toggle]");
  const isOpen = btn?.getAttribute("aria-expanded") === "true";
  if (isOpen) closeDashboardNav();
  else openDashboardNav();
});

document.getElementById("dashboard-backdrop")?.addEventListener("click", closeDashboardNav);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDashboardNav(); });
document.querySelectorAll(".dashboard-nav nav a").forEach(link => link.addEventListener("click", closeDashboardNav));

if (!supabase) setStatus(SUPABASE_CONFIG_ERROR || "Configure the Supabase public URL and anon key to connect the studio workspace.");
else authorize();

async function authorize() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = "../login.html?next=staff"; return; }
  const { data: profile } = await supabase.from("profiles").select("role,account_status").eq("id", user.id).single();
  if (!profile || !["admin", "staff"].includes(profile.role) || profile.account_status !== "active") { location.href = "../account.html"; return; }
  setStatus(`Studio access active for ${profile.role}.`);
  initWorkspace(user);
}

async function initWorkspace(user) {
  window._myUser = user; // make available to deleteProduct and other functions
  const content = document.querySelector("[data-my-content]");
  if (content) {
    const { data, error } = await supabase.from("media").select("id,title,kind,status,feedback,created_at").eq("created_by", user.id).order("created_at", { ascending: false }).limit(20);
    if (error) { content.textContent = error.message; return; }
    content.innerHTML = data.length ? mediaTable(data) : "<p>No uploads yet.</p>";
  }
  if (staffPage === "products") {
    const coverInput = document.querySelector("[name=cover]");
    const preview = document.querySelector("[data-cover-preview]");
    if (coverInput) coverInput.addEventListener("change", () => {
      const file = coverInput.files?.[0];
      if (preview) {
        if (!file) {
          preview.innerHTML = "";
        } else if (file.type.startsWith("image/")) {
          preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Preview" style="max-width:200px;max-height:140px;object-fit:cover;border-radius:4px;">`;
        } else if (file.type.startsWith("video/")) {
          preview.innerHTML = `<video src="${URL.createObjectURL(file)}" controls style="max-width:200px;max-height:140px;border-radius:4px;"></video>`;
        } else {
          preview.innerHTML = file.name;
        }
      }
    });
    document.querySelector("[data-product-form]")?.addEventListener("submit", (e) => createProduct(e, user));
    document.querySelector("[data-search]")?.addEventListener("input", renderProducts);
    document.querySelector("[data-status-filter]")?.addEventListener("change", renderProducts);
    await loadMyProducts(user);
  }
}

async function createProduct(event, user) {
  event.preventDefault();
  const form = event.target;
  const title = form.title.value?.trim();
  if (!title) { setFieldError(form, "A title is required."); return; }
  const output = form.querySelector("[data-form-error]");
  const btn = form.querySelector("[data-submit-btn]");
  btn.disabled = true; output.textContent = "Working…";
  try {
    let coverPath = null;
    const coverFile = form.cover.files?.[0];
    if (coverFile?.size) {
      if (coverFile.size > 10 * 1024 * 1024) throw new Error("Cover image must be under 10 MB.");
      if (!/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm))$/.test(coverFile.type)) throw new Error("Use JPG, PNG, WebP, AVIF, MP4, or WebM for the cover.");
      const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const path = `${user.id}/${Date.now()}-${safeSlug}.${ext}`;
      const { error: upErr } = await supabase.storage.from("public-media").upload(path, coverFile, { contentType: coverFile.type, upsert: false });
      if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);
      coverPath = path;
    }
    const slug = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error: insErr } = await supabase.from("products").insert({ title, slug, description: form.description.value || null, listing_type: form.listing_type.value || "fabric", unit: form.unit.value || "metre", price: form.price.value ? Number(form.price.value) : null, color: form.color.value || null, fabric_composition: form.fabric_composition.value || null, fabric_width_cm: form.fabric_width_cm.value ? Number(form.fabric_width_cm.value) : null, availability: form.availability.value || "available", status: "draft", cover_path: coverPath, created_by: user.id });
    if (insErr) { if (coverPath) await supabase.storage.from("public-media").remove([coverPath]); throw new Error(`Save failed: ${insErr.message}`); }
    notify("Listing saved as draft. An administrator will review and publish it.");
    form.reset(); if (document.querySelector("[data-cover-preview]")) document.querySelector("[data-cover-preview]").innerHTML = "";
    output.textContent = ""; await loadMyProducts(user);
  } catch (err) { output.textContent = err.message; notify(err.message, "error"); } finally { btn.disabled = false; }
}

async function loadMyProducts(user) {
  const { data, error } = await supabase.from("products").select("id,title,listing_type,unit,price,currency,status,availability,created_at,cover_path").eq("created_by", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) { const el = document.querySelector("[data-my-products]"); if (el) el.innerHTML = `<p style="color:red">${error.message}</p>`; return; }
  window._myProducts = data || []; renderProducts();
}

function renderProducts() {
  const container = document.querySelector("[data-my-products]");
  if (!container || !window._myProducts) return;
  const search = document.querySelector("[data-search]")?.value.toLowerCase() || "";
  const statusFilter = document.querySelector("[data-status-filter]")?.value || "";
  const filtered = window._myProducts.filter((p) => (!search || p.title.toLowerCase().includes(search)) && (!statusFilter || p.status === statusFilter));
  container.innerHTML = filtered.length
    ? `<table class="dashboard-table"><thead><tr><th>Title</th><th>Type</th><th>Price</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>${filtered.map((p) => { const cls = p.status === "published" ? "status--published" : p.status === "rejected" ? "status--rejected" : ""; return `<tr><td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.listing_type)} / ${escapeHtml(p.unit)}</td><td>${p.price == null ? "—" : money(p.price, p.currency ?? "NGN")}</td><td><span class="status-badge ${cls}">${escapeHtml(p.status)}</span></td><td>${new Date(p.created_at).toLocaleDateString()}</td><td><button class="table-action table-action--danger" data-delete-product="${p.id}">Delete</button></td></tr>`; }).join("")}</tbody></table>`
    : "<p>No listings match your filters.</p>";
  container.querySelectorAll("[data-delete-product]").forEach((btn) => btn.addEventListener("click", () => deleteProduct(btn.dataset.deleteProduct, window._myUser)));
}

async function deleteProduct(id, user) {
  if (!confirm("Delete this listing? This cannot be undone.")) return;
  const item = window._myProducts?.find((p) => p.id === id);
  if (!item) return;
  const output = document.querySelector("[data-staff-status]");
  try {
    if (item.cover_path) {
      const { error: storageError } = await supabase.storage.from("public-media").remove([item.cover_path]);
      if (storageError) output.textContent = `Warning: cover image could not be removed from storage: ${storageError.message}`;
    }
    const { error } = await supabase.from("products").delete().eq("id", id).eq("created_by", user.id);
    if (error) throw error;
    notify("Listing deleted.");
    await loadMyProducts(user);
  } catch (err) { notify(err.message, "error"); output.textContent = err.message; }
}

function mediaTable(data) {
  return `<table class="dashboard-table"><thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Feedback</th><th>Date</th></tr></thead><tbody>${data.map((item) => { const cls = item.status === "published" ? "status--published" : item.status === "rejected" ? "status--rejected" : ""; return `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.kind)}</td><td><span class="status-badge ${cls}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.feedback ?? "—")}</td><td>${new Date(item.created_at).toLocaleDateString()}</td></tr>`; }).join("")}</tbody></table>`;
}

uploadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const form = new FormData(uploadForm);
  const file = form.get("file");
  const output = uploadForm.querySelector("[data-form-error]");
  if (!file?.size) { output.textContent = "Choose an image or video first."; return; }
  if (file.size > 50 * 1024 * 1024) { output.textContent = "Maximum file size is 50 MB."; return; }
  if (!/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm))$/.test(file.type)) { output.textContent = "Use JPG, PNG, WebP, AVIF, MP4, or WebM."; return; }
  const btn = uploadForm.querySelector("[type=submit]"); btn.disabled = true; output.textContent = "Uploading…";
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  try {
    const { error: upErr } = await supabase.storage.from("public-media").upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw upErr;
    const { error: recErr } = await supabase.from("media").insert({ title: form.get("title"), description: form.get("description"), kind: file.type.startsWith("video/") ? "video" : "image", mime_type: file.type, byte_size: file.size, storage_path: path, status: "pending", created_by: user.id });
    if (recErr) { await supabase.storage.from("public-media").remove([path]); throw new Error(recErr.message); }
    uploadForm.reset(); output.textContent = "Submitted for review."; notify("Upload submitted for review.");
  } catch (err) { output.textContent = err.message; notify("Upload failed.", "error"); } finally { btn.disabled = false; }
});

function setStatus(msg) { if (status) status.textContent = msg; }
function setFieldError(form, msg) { form.querySelector("[data-form-error]").textContent = msg; }
