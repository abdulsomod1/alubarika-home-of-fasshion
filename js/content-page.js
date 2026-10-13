import { requireSupabase } from "./supabase.js";
import { notify } from "./utils.js";
const content = document.querySelector("[data-content]");
try {
  const { data, error } = await requireSupabase().from("site_settings").select("value").eq("key", content.dataset.content).maybeSingle();
  if (error) throw error;
  if (data?.value?.body) content.innerHTML = data.value.body;
} catch (_error) { /* The approved editorial copy remains visible until settings are configured. */ }
