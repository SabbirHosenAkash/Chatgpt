# Sabbir Hosen Akash — Portfolio & Digital Business Platform

This repository contains the GitHub Pages frontend and an optional Cloudflare Worker + Supabase backend starter.

## What is included
- Existing portfolio identity, images, books, music embed, organizations, education and project content retained.
- Expanded service presentation, About section, website marketplace inquiry form, blog and testimonials areas.
- Meetwoyou project overview page.
- Responsive/accessibility improvements, SEO metadata, Person + WebSite structured data, sitemap and robots file.
- Fixed missing CV download target (now a CV request email link).
- Safer JavaScript initialization, PWA install handling and versioned service-worker caching.
- Optional Cloudflare Worker API, Supabase schema and admin dashboard for content, messages and orders.

## Hosting
Keep the public website on GitHub Pages. Backend features require a separate Cloudflare Worker deployment and Supabase project; GitHub Pages alone cannot run server-side code.

## Setup
Follow [SETUP_GUIDE.md](SETUP_GUIDE.md) in order. Do not upload real credentials or secret keys to this repository.

## Important status
The frontend works as a static GitHub Pages site without backend credentials. In that mode, contact and order forms use the existing FormSubmit email fallback. Supabase storage, Telegram notifications and the admin API only become active after the external setup steps are completed and the API URL is configured.

The admin page is a static interface; all privileged operations are checked by the Worker against Supabase Auth and the `admin_users` allowlist. Do not treat hiding `/admin.html` as security.

## Files
- `index.html`, `style.css`, `script.js`: public website
- `config.js`: public Worker URL setting (no secrets)
- `admin.html`, `admin.js`, `admin.css`, `admin-config.js`: admin login and content manager
- `worker.js`: Cloudflare Worker API
- `schema.sql`: database schema
- `SETUP_GUIDE.md`: deployment instructions
- `AUDIT_REPORT.md`: source audit and test notes
