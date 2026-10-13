import { signIn, signUp, signOut } from "./auth.js";
import { supabase } from "./supabase.js";
import { notify } from "./utils.js";
import { requireSupabase } from "./supabase.js";

document.querySelectorAll("[data-password-toggle]").forEach((button) => button.addEventListener("click", () => {
  const input = document.getElementById(button.dataset.passwordToggle);
  input.type = input.type === "password" ? "text" : "password";
  button.textContent = input.type === "password" ? "Show" : "Hide";
}));

const questionSelect = document.querySelector("#question");
questionSelect?.addEventListener("change", () => {
  const custom = document.querySelector("[data-custom-question]");
  custom.hidden = questionSelect.value !== "custom";
  custom.querySelector("input").required = questionSelect.value === "custom";
});

const loginForm = document.querySelector("[data-login-form]");
loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(loginForm);
  setBusy(loginForm, true);
  try {
    await signIn(form.get("identifier"), form.get("password"));
    const params = new URLSearchParams(location.search);
    const next = params.get("next");
    if (next === "admin") { location.href = "admin/index.html"; return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = "account.html"; return; }
    const { data: profile } = await supabase
      .from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
    if (!profile) {
      showError(loginForm, "Your account is not set up yet. Please sign up again or contact support.");
    } else if (profile.role === "admin" && profile.account_status === "active") {
      location.href = "admin/index.html";
    } else {
      location.href = "account.html";
    }
  } catch (error) { showError(loginForm, error.message); }
  finally { setBusy(loginForm, false); }
});

const signupForm = document.querySelector("[data-signup-form]");
signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(signupForm);
  if (form.get("password") !== form.get("confirm_password")) return showError(signupForm, "The passwords do not match.");
  if (form.get("answer").trim().toLocaleLowerCase() !== form.get("confirm_answer").trim().toLocaleLowerCase()) return showError(signupForm, "The security answers do not match.");
  setBusy(signupForm, true);
  try {
    await signUp(Object.fromEntries(form.entries()));
    location.href = "account.html";
  } catch (error) { showError(signupForm, friendlyError(error)); }
  finally { setBusy(signupForm, false); }
});

const signout = document.querySelector("[data-signout]");
signout?.addEventListener("click", async () => { try { await signOut(); location.href = "index.html"; } catch (error) { notify(error.message, "error"); } });

if (document.body.dataset.page === "account") {
  if (!supabase) showAccount("Connect Supabase to enable customer accounts.");
  else supabase.auth.getUser().then(({ data, error }) => {
    if (error || !data.user) location.href = "login.html?next=account.html";
    else {
      const name = data.user.user_metadata?.username ?? data.user.email;
      document.querySelector("[data-account-name]").textContent = name;
      document.querySelector("[data-account-email]").textContent = data.user.email;
    }
  });
}

const recoveryForm = document.querySelector("[data-recovery-form]");
recoveryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = recoveryForm.querySelector("[data-form-error]");
  const button = recoveryForm.querySelector("[data-recovery-start]");
  button.disabled = true;
  try {
    const { data, error: invokeError } = await requireSupabase().functions.invoke("account-recovery", { body: { username: recoveryForm.elements.username.value } });
    if (invokeError) throw invokeError;
    document.querySelector("[data-recovery-question]").hidden = false;
    document.querySelector("[data-question-text]").textContent = data.question ?? data.message;
    if (!data.question) document.querySelector("[data-verify-answer]").disabled = true;
  } catch (exception) { error.textContent = friendlyError(exception); }
  finally { button.disabled = false; }
});

document.querySelector("[data-verify-answer]")?.addEventListener("click", async () => {
  const error = recoveryForm.querySelector("[data-form-error]");
  try {
    const { data, error: invokeError } = await requireSupabase().functions.invoke("account-recovery", { body: { username: recoveryForm.elements.username.value, answer: recoveryForm.elements.answer.value } });
    if (invokeError) throw invokeError;
    if (!data.recovery_token) throw new Error("The recovery answer could not be verified. Start the recovery process again later.");
    recoveryForm.elements.recovery_token.value = data.recovery_token;
    document.querySelector("[data-recovery-password]").hidden = false;
    document.querySelector("[data-recovery-message]").textContent = "Answer verified. This authorization expires in 10 minutes and can only be used once.";
  } catch (exception) { error.textContent = friendlyError(exception); }
});

document.querySelector("[data-complete-recovery]")?.addEventListener("click", async () => {
  const error = recoveryForm.querySelector("[data-form-error]");
  const password = recoveryForm.elements.new_password.value;
  if (password !== recoveryForm.elements.confirm_new_password.value) { error.textContent = "The passwords do not match."; return; }
  try {
    const { data, error: invokeError } = await requireSupabase().functions.invoke("complete-recovery", { body: { token: recoveryForm.elements.recovery_token.value, password } });
    if (invokeError) throw invokeError;
    if (data.error) throw new Error(data.error);
    document.querySelector("[data-recovery-message]").textContent = data.message;
    recoveryForm.querySelectorAll("input,button").forEach((control) => control.disabled = true);
  } catch (exception) { error.textContent = friendlyError(exception); }
});

function setBusy(form, busy) { const button = form.querySelector("[type=submit]"); button.disabled = busy; button.dataset.original ??= button.textContent; button.textContent = busy ? "Please wait…" : button.dataset.original; }
function showError(form, message) { const output = form.querySelector("[data-form-error]"); if (output) output.textContent = message; else notify(message, "error"); }
function friendlyError(error) {
  if (/username.*(taken|duplicate)|already registered/i.test(error.message ?? "")) return "That username or email is already in use.";
  if (error.context?.status === 404) return "Account services are not deployed to Supabase yet. Ask the project administrator to deploy the Edge Functions.";
  // CORS/network errors when calling Edge Functions — usually APP_ORIGIN mismatch
  if (/failed to (send|invoke)|fetch|network|cors|net::ERR/i.test(error.message ?? "")) {
    return "Could not reach account services. If this site is deployed, ask the administrator to update the APP_ORIGIN secret in Supabase Edge Functions to match the live site URL.";
  }
  return error.message || "Something went wrong. Please try again.";
}
function showAccount(message) { document.querySelector("[data-account-status]").textContent = message; }
