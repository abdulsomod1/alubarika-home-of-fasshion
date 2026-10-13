import { supabase } from "./supabase.js";

const status = document.querySelector("[data-security-status]");
const usernameForm = document.querySelector("[data-username-form]");
const passwordForm = document.querySelector("[data-password-form]");
let signedInUser;

document.querySelector("[data-signout]")?.addEventListener("click", async () => {
  await supabase?.auth.signOut();
  location.href = "../login.html";
});
document.querySelector("[data-dashboard-toggle]")?.addEventListener("click", () => {
  const nav = document.querySelector(".dashboard-nav");
  const btn = document.querySelector("[data-dashboard-toggle]");
  const open = btn?.getAttribute("aria-expanded") === "true";
  nav?.classList.toggle("is-open", !open);
  btn?.classList.toggle("is-open", !open);
  btn?.setAttribute("aria-expanded", String(!open));
  btn?.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
});

if (!supabase) setStatus("Supabase is not configured.");
else authorize();

async function authorize() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) { location.href = "../login.html?next=admin/security.html"; return; }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("username,role,account_status").eq("id", user.id).single();
  if (profileError || profile?.role !== "admin" || profile.account_status !== "active") { location.href = "../account.html"; return; }
  signedInUser = user;
  usernameForm.elements.username.value = profile.username;
  setStatus(`Administrator session active for ${user.email}.`);
}

usernameForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorLine = usernameForm.querySelector("[data-username-error]");
  const password = usernameForm.elements.current_password.value;
  const username = usernameForm.elements.username.value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) { errorLine.textContent = "Use 3–24 letters, numbers, or underscores."; return; }
  setBusy(usernameForm, true);
  try {
    await reauthenticate(password);
    const { error } = await supabase.rpc("change_my_username", { new_username: username });
    if (error) throw error;
    errorLine.textContent = "Username updated.";
    usernameForm.elements.current_password.value = "";
    setStatus(`Signed in as ${signedInUser.email}; username updated to ${username}.`);
  } catch (error) { errorLine.textContent = explain(error); }
  finally { setBusy(usernameForm, false); }
});

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorLine = passwordForm.querySelector("[data-password-error]");
  const current = passwordForm.elements.current_password.value;
  const password = passwordForm.elements.new_password.value;
  if (password !== passwordForm.elements.confirm_password.value) { errorLine.textContent = "The new passwords do not match."; return; }
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { errorLine.textContent = "Use at least 10 characters with a letter and a number."; return; }
  setBusy(passwordForm, true);
  try {
    await reauthenticate(current);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    passwordForm.reset();
    errorLine.textContent = "Password changed. Your current session remains active.";
  } catch (error) { errorLine.textContent = explain(error); }
  finally { setBusy(passwordForm, false); }
});

async function reauthenticate(password) {
  if (!signedInUser?.email) throw new Error("Could not verify the signed-in account.");
  const { error } = await supabase.auth.signInWithPassword({ email: signedInUser.email, password });
  if (error) throw new Error("Current password was not accepted.");
}
function setBusy(form, busy) { form.querySelector("[type=submit]").disabled = busy; }
function setStatus(message) { if (status) status.textContent = message; }
function explain(error) {
  if (error.code === "23505") return "That username is already in use.";
  if (/function.*change_my_username|change_my_username.*schema cache/i.test(error.message ?? "")) return "Username changes are not enabled in the database yet. The project owner must apply the admin account security migration.";
  return error.message || "The change could not be saved.";
}
