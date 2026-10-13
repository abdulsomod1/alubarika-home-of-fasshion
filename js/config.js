// Supabase anon credentials are public browser configuration; never place service-role keys here.
export const SUPABASE_URL = "https://fksciflwoszonudkpozz.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrc2NpZmx3b3N6b251ZGtwb3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjQxNTAsImV4cCI6MjEwNjgwMDE1MH0.8JMukaAoTYJDoEfn2hj-NLfDs5AFQV8hhw0R62mPYLc";
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
const keyClaims = (() => {
	try {
		const base64 = SUPABASE_ANON_KEY.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
		return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
	}
	catch { return null; }
})();
export const isSupabaseConfigured = SUPABASE_URL.startsWith("https://") && (SUPABASE_ANON_KEY.startsWith("sb_publishable_") || (keyClaims?.ref === projectRef && keyClaims?.role === "anon"));
export const SUPABASE_CONFIG_ERROR = isSupabaseConfigured ? "" : "The supplied Supabase anon key is invalid. Copy the current anon/public key from Project Settings and update js/config.js.";
