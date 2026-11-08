# Step-by-step setup guide

## 0. Keep the public website on GitHub Pages
1. Extract this ZIP.
2. Open your existing repository `SabbirHosenAkash/sabbirhosenakash.github.io`.
3. Upload/replace the repository files with the contents of the `sabbirhosenakash.github.io-main` folder (upload the contents, not the outer folder).
4. Commit to the branch/folder already configured for GitHub Pages.
5. Wait for the GitHub Pages deployment, then open `https://sabbirhosenakash.github.io/`.
6. Test the public page on mobile and desktop. Do not delete the existing Google verification HTML file.

## 1. Create the Supabase database
1. Create a Supabase project at https://supabase.com/.
2. Open **SQL Editor → New query**.
3. Copy all of `schema.sql` into the editor and run it.
4. Open **Project Settings → API** and keep these values privately:
   - Project URL
   - `anon` / publishable key
   - `service_role` / secret key
5. Never put the service-role key in `config.js`, `admin-config.js`, HTML, JavaScript, GitHub, screenshots or public messages.

## 2. Create the first administrator
1. In Supabase, open **Authentication → Users → Add user**.
2. Create your own admin email/password. Use a strong unique password and enable MFA if available.
3. Copy that user's UUID from the Users page.
4. In SQL Editor, run this query after replacing the placeholders:
   ```sql
   insert into public.admin_users (id,email,active)
   values ('YOUR-AUTH-USER-UUID','YOUR-ADMIN-EMAIL',true)
   on conflict (id) do update set active=true,email=excluded.email;
   ```
5. Do not create a public registration form. Only UUIDs listed in `admin_users` are authorized by the Worker.

## 3. Create and deploy the Cloudflare Worker
1. Create a Cloudflare account at https://dash.cloudflare.com/.
2. Install Node.js on a computer, then open a terminal in the repository root folder.
3. Install Wrangler (one time): `npm install -g wrangler`.
4. Sign in: `wrangler login`.
5. Deploy the Worker: `wrangler deploy`.
6. Copy the deployed Worker URL, for example `https://sabbir-portfolio-api.<your-subdomain>.workers.dev`.

### Add Worker secrets
Run each command from the repository root folder. The CLI asks for the value; paste it only into the private terminal prompt.

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put ALLOWED_ORIGIN
```

- `SUPABASE_URL`: Supabase Project URL.
- `SUPABASE_ANON_KEY`: Supabase anon/publishable key (Worker uses it to validate Supabase Auth access tokens).
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role secret. Worker only.
- `TELEGRAM_BOT_TOKEN`: Telegram BotFather token.
- `TELEGRAM_CHAT_ID`: your private Telegram chat ID or private admin group ID.
- `ALLOWED_ORIGIN`: `https://sabbirhosenakash.github.io` (add other exact trusted origins comma-separated only if needed).

If you have not configured Telegram yet, skip the two Telegram secrets. Database storage can still work; API responses will say the notification is pending.

### Optional rate limiting (recommended)
1. In Cloudflare Workers & Pages → KV, create a KV namespace.
2. Copy its namespace ID.
3. In `wrangler.toml`, uncomment the `[[kv_namespaces]]` block and replace `YOUR_KV_NAMESPACE_ID`.
4. Deploy again with `wrangler deploy`.
5. The Worker then applies a basic per-IP/hour submission limit. Without this binding, the Worker does not have this KV-based rate limiter.

### Check the Worker
Open `https://YOUR-WORKER-URL/api/health`. It should return JSON showing `ok: true` and whether database/Telegram configuration is present. This health check does not prove every form or admin action works; test those separately.

## 4. Connect the public website to the Worker
1. Open the root `config.js`.
2. Set `API_BASE_URL` to the exact deployed Worker URL, with no trailing slash:
   ```js
   window.PORTFOLIO_CONFIG = Object.freeze({
     API_BASE_URL: "https://YOUR-WORKER-URL",
     TURNSTILE_SITE_KEY: ""
   });
   ```
3. Commit the updated `config.js` to GitHub Pages.
4. After deployment, submit a test contact message. Confirm it appears in Supabase `contact_messages` and Telegram if configured.
5. Submit a test website request. Confirm it appears in Supabase `orders` and Telegram if configured.
6. Delete the test records when finished.

## 5. Configure Admin Dashboard
1. Open `admin-config.js`.
2. Fill the same Worker URL and the Supabase Project URL and anon/publishable key:
   ```js
   window.ADMIN_CONFIG = Object.freeze({
     API_BASE_URL: "https://YOUR-WORKER-URL",
     SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
     SUPABASE_ANON_KEY: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
   });
   ```
3. These are public client values; the service-role key and Telegram token must never go here.
4. Commit the file.
5. Visit `https://sabbirhosenakash.github.io/admin.html` and sign in using the administrator account created in Step 2.
6. Test Projects, Services, Marketplace, Blog, Testimonials, Messages and Orders.
7. Publish one test item and verify it appears on the public website. Remove the test item afterwards.

## 6. Telegram bot setup
1. In Telegram, open the official `@BotFather` account and create a bot.
2. Copy the bot token privately.
3. Start a private chat with your new bot and send `/start`.
4. Obtain your chat ID using Telegram Bot API `getUpdates` from a private environment, or use a trusted bot utility. Never paste your token into a public website or public chat.
5. Add the token and chat ID as Worker secrets (Step 3).
6. Send a test contact message and verify the notification arrives.
7. For a group, add the bot to the private group and use that group's chat ID.

## 7. Marketplace and payment note
The current marketplace collects **order requests only**. It does not charge cards or claim a payment is complete. A real payment gateway requires a merchant account, provider credentials, webhook verification and a separate payment implementation. Do not advertise online payment until those steps are completed and tested.

## 8. Important limitations / security
- GitHub Pages is static hosting; it cannot securely host database credentials or server-side logic.
- Admin pages are publicly reachable, but the Worker verifies Supabase Auth and the `admin_users` allowlist for every protected API request.
- The admin interface currently edits content fields and image URLs; it does not upload binary files to Supabase Storage.
- Blog entries are rendered from the public API and use `blog.html?slug=...` URLs. Add individual published posts to your sitemap if you want explicit sitemap discovery; the Worker does not rewrite the static sitemap.
- No production credentials are included in this ZIP. Telegram, database and admin integrations are not live until you complete the steps above.
- Back up Supabase before bulk edits. Delete actions are permanent.
- Keep the Supabase service-role key, Telegram bot token and other secrets only in Cloudflare Worker secrets.
