// Admin authentication and authorization utilities
// This module is used by admin pages that need special authentication handling.
import { requireSupabase } from "./supabase.js";

/**
 * Checks if the current user is an active administrator.
 * Returns the user profile if admin, throws otherwise.
 */
export async function requireAdmin() {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    location.href = "../login.html?next=admin";
    throw new Error("Sign in required.");
  }
  const { data, error } = await client.from("profiles").select("role,account_status").eq("id", user.id).single();
  if (error || data?.role !== "admin" || data.account_status !== "active") {
    location.href = "../account.html";
    throw new Error("Administrator access required.");
  }
  return user;
}

/**
 * Gets the current admin user, or null if not signed in.
 */
export async function getAdminUser() {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data } = await client.from("profiles").select("role,account_status").eq("id", user.id).single();
  if (data?.role !== "admin" || data.account_status !== "active") return null;
  return user;
}
