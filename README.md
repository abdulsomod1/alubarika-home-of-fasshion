# Albarika Home of Designs

A framework-free storefront and studio platform for fabric sales and tailoring, built with HTML, CSS, vanilla JavaScript modules, Supabase, and Netlify. No privileged Supabase key belongs in browser code.

## Current implementation

The home, fabric catalogue, tailoring services, work gallery, product-detail view, account pages, staff workspace, and admin tools are present. The catalogue supports fabrics, ready-to-wear garments, and made-to-measure listings with sale units and cloth details. No sample inventory is seeded.

The frontend is configured for project `fksciflwoszonudkpozz` and the current anon key authenticates successfully. The public core tables (`products`, `site_settings`, `categories`, `media`, `portfolio_projects`, and `services`) respond, but currently contain no published catalog items. The fabric extension columns have not been applied yet. Enquiries/orders are private and reject anonymous reads as expected.

The latest live Auth check reports `mailer_autoconfirm: true` and signup enabled. All four Edge Functions (`register-user`, `username-login`, `account-recovery`, and `complete-recovery`) are now deployed, and both the fabric and admin account-security migrations are applied. The `ALLOWED_ORIGINS` secret is set to `https://alubarikahomeoffashionn.netlify.app,http://127.0.0.1:4173` to support both the production site and local testing. Update it with a comma-separated list when adding a custom domain.

The cart currently sends an order enquiry; it does not create a database order or represent completed payment. Live payment processing is not enabled. The logo asset was not supplied, so the AHD text mark remains temporary. The hero photo is editorial stock imagery, not an Albarika product photo; replace it with approved studio photography.

## Local setup

1. Keep the valid current anon/public key in `js/config.js`. Never put a service-role/secret key there.
2. The live project currently reports email autoconfirm enabled. In Supabase Dashboard, verify **Authentication → Sign In / Providers → Email → Confirm email** is off.
3. In Supabase Dashboard, open **SQL Editor** and run `202610090001_product_fabric_fields.sql` and `202610090002_admin_account_security.sql` from `supabase/migrations/`. The base tables are already present in the connected project.
4. Install the Supabase CLI on Windows. With Scoop installed, run these in PowerShell from the project root:

	```powershell
	scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
	scoop install supabase
	supabase login
	supabase link --project-ref fksciflwoszonudkpozz
	supabase functions deploy register-user
	supabase functions deploy username-login
	supabase functions deploy account-recovery
	supabase functions deploy complete-recovery
	```

	The CLI login must belong to an account authorized for this Supabase project. If Scoop is unavailable, install the CLI using Supabase's official Windows instructions and run the same commands.
5. In Supabase Dashboard, open **Edge Functions → Secrets** and set `ALLOWED_ORIGINS` to a comma-separated list of allowed origins with no trailing slashes. For production use `https://alubarikahomeoffashionn.netlify.app`; for local testing also include `http://127.0.0.1:4173`. When adding a custom domain, append it to the comma-separated list. Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into hosted functions. Never put the service-role key into browser code or Git.
6. Set the Netlify publish directory to the repository root. Serve locally with Netlify CLI (`netlify dev`) so ES modules use an HTTP origin; do not open pages as `file://`.
7. Put the actual supplied logo under `assets/logo/`, then replace the text AHD mark when its file is available.

## First administrator

### Option 1 — Supabase Dashboard (Recommended)

1. Go to **Authentication → Users → Add user**
2. Enter:
   - **Email:** `alubarikahomeoffashion@gmail.com`
   - **Password:** `Alubarika12345`
3. Confirm the user manually (click **Confirm** in the Users table if needed)
4. Go to **SQL Editor** and run:
   ```sql
   -- Apply the admin promotion migration:
   \i supabase/migrations/202610100001_create_admin_account.sql
   ```
   Or run the SQL from that file directly — it will promote the user's profile to `admin`.

### Option 2 — `create-admin` Edge Function

A `create-admin` Edge Function is included at `supabase/functions/create-admin/`.

1. Deploy it:
   ```powershell
   supabase functions deploy create-admin
   ```
2. Invoke it from the Supabase Dashboard (Edge Functions → create-admin → invoke)
   with payload:
   ```json
   {
     "email": "alubarikahomeoffashion@gmail.com",
     "password": "Alubarika12345",
     "username": "ahdadmin"
   }
   ```
3. The function creates the auth user, sets the profile role to `admin`, and logs the action.

After setup, sign in at `/login.html` with the email and password above. Use **Account security** from the admin navigation to change your username or password later; each change requires the current password.

The admin account is not created by this repository because that requires privileged project-owner access. Never grant admin by changing a browser-side role flag; the profile role must be promoted in the database by the project owner.

## Auth and recovery configuration

Users may enter a real email or a syntactically valid placeholder address; Supabase still requires uniqueness and email-shaped identifiers. Because addresses are unverified, account recovery does not depend on email. Signup requires a security question and answer; the normalized answer is stored only as a salted PBKDF2-SHA256 verifier (310,000 rounds) in an Edge Function. Username lookup is server-side and returns a generic credential error.

The Edge Function recovery endpoints are the protected boundary. Apply Supabase platform-level function rate limits/WAF controls and monitor failed requests in production. Recovery answers are weak factors by nature. Sensitive administrator recovery should be handled out-of-band by the project owner; do not enable the ordinary recovery flow for an admin account without adding the extra verification factor requested by the business. Recovery endpoint implementation and browser recovery UI must be exercised against a real Supabase project before production use.

## Storage and content

The migration creates a private `public-media` bucket with a 50 MiB limit and image/video MIME allowlist. The name is retained for compatibility; files are not anonymously readable. The browser requests one-hour signed URLs only where the storage RLS policy permits published content or owner/admin preview. Uploads are restricted to active staff/admin in a user-specific path and deletions to admins. Validate storage MIME and file size again server-side for any production upload workflow.

Public content loaders query published rows only. Seed approved content through the admin/editor workflow or controlled SQL. No fabricated statistics or sample inventory are seeded.

## Deployment checklist

- [ ] Replace the logo placeholder and remote photography with approved, optimized assets.
- [ ] Set Supabase URL/anon key and confirm the production project has email confirmations disabled.
- [ ] Apply migrations, deploy functions, set ALLOWED_ORIGINS secret, and check Edge Function logs.
- [ ] Confirm Storage bucket policies, upload MIME/size limits, and a private-draft strategy.
- [ ] Bootstrap the first admin out-of-band and verify the active administrator cannot be removed as the last admin.
- [ ] Set exact Netlify and Supabase Auth domains/redirect URLs; add a custom domain and HTTPS.
- [ ] Test signup, username/email login, logout, recovery expiry/reuse, role escalation denial, suspension, uploads, and RLS with customer/staff/admin accounts.
- [ ] Test mobile sizes, keyboard navigation, reduced motion, console output, and broken links.
- [ ] Configure backups, audit monitoring, incident response, and function-level rate limiting.

## Scope notes

The public database connection works, Auth email autoconfirm is enabled, all four authentication/recovery Edge Functions plus the `create-admin` function are deployed, and the fabric/admin-security migrations are applied. The current catalog has no published rows. Full content authoring, quantity-editing checkout/order creation, admin session revocation, verified sales reporting, and payment integrations remain future work. Paystack must be initialized and verified server-side before enabling paid checkout.

An anon key cannot change Supabase Auth provider settings, create an Auth admin, or deploy Edge Functions. The Supabase project owner must use the Dashboard or SQL Editor to create the first admin account as described in the First administrator section above.
