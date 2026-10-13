import { supabase } from "./supabase.js";
import { SUPABASE_CONFIG_ERROR } from "./config.js";
const form = document.querySelector("[data-contact-form]");
const subject = new URLSearchParams(location.search).get("subject");
if (subject && form?.elements.subject) form.elements.subject.value = subject.slice(0, 180);
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorLine = form.querySelector("[data-form-error]");
  if (!supabase) { errorLine.textContent = SUPABASE_CONFIG_ERROR || "Enquiries are offline until this site is connected to Supabase."; return; }
  const button = form.querySelector("[type=submit]"); button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(form).entries());
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("enquiries").insert({ ...values, customer_id: user?.id ?? null });
    if (error) throw error;
    form.reset(); errorLine.textContent = "Thank you. Your enquiry has been received.";
  } catch (_error) { errorLine.textContent = "Your enquiry could not be sent. Please try again shortly."; }
  finally { button.disabled = false; }
});
