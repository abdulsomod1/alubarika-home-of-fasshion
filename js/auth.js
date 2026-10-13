import { requireSupabase } from "./supabase.js";

export async function signUp({ username, email, password, question, answer, custom_question }) {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) throw new Error("Use 3–24 characters: lowercase letters, numbers, and underscores.");
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error("Use at least 10 characters with a letter and a number.");
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("register-user", { body: { username: normalized, email: email.trim().toLowerCase(), password, question, answer, custom_question } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  const result = await client.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  if (result.error) throw result.error;
  return result.data;
}

export async function signIn(identifier, password) {
  const client = requireSupabase();
  const value = identifier.trim();
  if (value.includes("@")) {
    const { data, error } = await client.auth.signInWithPassword({ email: value, password });
    if (error) throw error;
    return data;
  }
  const { data, error } = await client.functions.invoke("username-login", { body: { username: value, password } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  const result = await client.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  if (result.error) throw result.error;
  return result.data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
