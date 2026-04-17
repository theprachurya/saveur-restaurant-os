# Saveur Restaurant OS - GitHub Pages + Database Setup

## What was implemented

The app now includes complete end-to-end functionality for customer and owner workflows:

- Role-based registration/login with OTP demo verification.
- Customer pages: dashboard, menu browse/search/filter, item details, cart, order confirmation, tracking, order history, reorder, feedback, profile, notifications.
- Owner pages: dashboard, menu management (add/edit/delete/enable/disable), incoming orders (accept/reject/status updates), revenue analytics, inventory, profile, notifications.
- Stock-safe ordering:
  - Cart quantity cannot exceed stock.
  - Stock is decremented on order placement.
  - Items auto-disable when stock reaches zero.
  - Low stock alerts are generated automatically.
- Real-time-like order progression simulation (auto status updates every 12 seconds).
- Persistence:
  - LocalStorage fallback works out of the box.
  - Supabase persistence is supported when configured.
- QA suite page (`QA Tests`) that runs acceptance-focused checks in-browser.

## Database recommendation

Recommended database: **Supabase Postgres**.

Why this is the best fit for your GitHub Pages frontend:

- Works well with static hosting (frontend-only app).
- Managed PostgreSQL with SQL support.
- Simple JavaScript SDK from browser.
- Real-time options for future improvements.
- Generous free tier and easy setup.

Alternative options:

- Firebase Firestore (great for NoSQL and realtime).
- Neon + serverless API (more custom backend work needed).

For your feature set (orders, menus, inventory, revenue), relational data is a strong fit, so Supabase/Postgres is the recommended default.

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run [supabase-schema.sql](supabase-schema.sql).
3. In [config.js](config.js), set:
   - `window.SAVEUR_SUPABASE_URL`
   - `window.SAVEUR_SUPABASE_ANON_KEY`
4. Commit and deploy.

If config values are empty, the app automatically runs in local mode.

## GitHub Pages deployment

This repo includes workflow [deploy-pages.yml](.github/workflows/deploy-pages.yml).

1. Push this folder to a GitHub repository (branch `main`).
2. In GitHub repo settings:
   - Go to **Pages**.
   - Set **Source** to **GitHub Actions**.
3. Push to `main` (or run workflow manually from Actions tab).
4. Your site will be published at your GitHub Pages URL.

## App entrypoint

GitHub Pages uses [index.html](index.html) (copied from your updated file).

## Test coverage and validation

Run tests inside the app:

1. Login as customer or owner.
2. Open `QA Tests` from sidebar.
3. Click `Run All Tests`.

The suite validates key use cases:

- cart add/update and order creation
- status progression
- low-stock logic
- feedback persistence
- core flow integrity

Also manually validate:

- Registration with OTP demo and password length enforcement
- Login errors for invalid credentials
- Owner can accept/reject/advance orders
- Revenue dashboard values update from actual orders
- Inventory auto-unavailability at zero stock
- Notifications filtered by role/user

## Security note

This build is production-like for workflow, but still a demo architecture:

- Passwords are stored directly in client-visible storage/schema.
- Row-level policies are currently permissive for easy setup.

For production hardening, add:

- Supabase Auth (instead of custom client-side auth)
- strict RLS policies by authenticated user/role
- secure server-side business checks
