/**
 * Shared session management for the storefront.
 * Call onAuthChange(fn) to react to sign-in/sign-out events.
 * Call isSignedIn() to synchronously check the current session state.
 */
import { supabase } from "./supabase.js";

let _user = null;

/** Get the current session user synchronously (may be null). */
export async function getSessionUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

/** Check if a user is currently signed in. */
export async function isSignedIn() {
  return !!(await getSessionUser());
}

/** Fire a custom event whenever auth state changes. */
if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    _user = event === "SIGNED_IN" ? { signedIn: true } : null;
    document.dispatchEvent(new CustomEvent("auth-change", { detail: { event } }));
  });

  // Prime the local cache on first load
  supabase.auth.getUser().then(({ data }) => { if (data?.user) _user = { signedIn: true }; });
}

/** Register a callback for auth state changes. */
export function onAuthChange(callback) {
  document.addEventListener("auth-change", (e) => callback(e.detail.event));
}
