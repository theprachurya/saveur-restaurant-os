# Saveur Restaurant OS

Saveur Restaurant OS is a browser-based restaurant management and ordering demo built as a static frontend. It supports separate customer and owner workflows, menu browsing, cart and order handling, inventory-aware stock updates, feedback, notifications, and a lightweight QA test screen.

The app runs entirely from [index.html](index.html) and uses localStorage by default. If you provide Supabase credentials in [config.js](config.js), the same data model can persist to Supabase Postgres instead.

## Features

- Customer and owner role selection during registration and sign-in.
- Customer flows for browsing the menu, filtering/searching items, managing the cart, placing orders, viewing order history, reordering, and leaving feedback.
- Owner flows for managing menu items, handling incoming orders, tracking revenue, and monitoring inventory.
- Stock-safe ordering rules so quantities cannot exceed available stock.
- Automatic low-stock alerts and item disabling when stock reaches zero.
- Notification feed filtered by role and user.
- In-browser QA page for basic acceptance checks.

## Project Structure

- [index.html](index.html) - main application shell, styles, and runtime logic.
- [config.js](config.js) - runtime config for optional Supabase credentials.
- [supabase-schema.sql](supabase-schema.sql) - database schema and permissive demo policies for Supabase.
- [saveur_restaurant_os (1).html](saveur_restaurant_os%20(1).html) - standalone HTML export included in the repo.

## Getting Started

### Local use

1. Clone the repository.
2. Open [index.html](index.html) in a browser, or serve the folder with any static file server.
3. The app will use localStorage automatically if Supabase is not configured.

### Optional Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run [supabase-schema.sql](supabase-schema.sql).
3. Set the following values in [config.js](config.js):
  - `window.SAVEUR_SUPABASE_URL`
  - `window.SAVEUR_SUPABASE_ANON_KEY`
4. Refresh the app. If both values are present, the app will try to read and write Supabase data.

### Vercel deployment

1. Import the repository into Vercel.
2. Set the project to deploy from the repository root.
3. Vercel will serve [index.html](index.html) as the site entrypoint.
4. The live site is available at [https://saveur-restaurant-os.vercel.app/](https://saveur-restaurant-os.vercel.app/).

## Usage Notes

- Registration includes an OTP demo flow and password length validation.
- The app supports customer and owner roles, so make sure you sign in with the correct role.
- The `QA Tests` page is useful for checking cart, ordering, status progression, feedback, and stock behavior.
- If Supabase config is missing or invalid, the app falls back to local mode automatically.

## Database Notes

The included schema is intentionally simple and demo-friendly:

- Tables cover users, menu items, orders, feedback, and notifications.
- Row-level security is enabled, but the policies are permissive for ease of setup.
- For production use, replace the demo auth and policies with Supabase Auth and stricter access rules.

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- Supabase JS client loaded from a CDN
- Vercel for static hosting

## Security Caveat

This project is suitable as a demo or prototype, but it is not production-hardened:

- Authentication is client-side and demo-oriented.
- Credentials and records are visible to the browser in local/demo mode.
- The Supabase policies are wide open for simplicity.

For a real deployment, add secure authentication, stricter authorization rules, and server-side validation.
