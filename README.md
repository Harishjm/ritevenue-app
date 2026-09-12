# RiteVenue

Bengaluru venue booking prototype: 20 fictional venues, shared availability, two-hour holds, simulated advance payments, locked itemized quotes, owner drafts and private photo uploads, and admin review. Approved owner venues now appear alongside samples in the private catalog, with their supplied photos, prices and simulated booking calendar.

**Demo only:** no real reservations, payment collection, verified reviews or Google Places calls. The hosted demonstration remains private and noindex.

## Owner submission to listing

1. Open `/owner`, add details, pricing and photos, then submit for review.
2. Open `/admin` as the configured administrator and choose **Approve & add to venues**.
3. Use **View listed venue & calendar** or return to the home catalog. Open catalog tabs refresh within 10 seconds.
4. Saving an edit hides the listing until it is approved again. Existing bookings and locked quotes remain saved.

All listings and photos remain behind the private Site access policy. Approval does not enable real payments or publish the site publicly.

## Source and hosting

This repository contains a source snapshot of the working Sites application, including the calendar, checkout and confirmation-navigation fixes.

Imported Sites source commit: `dd74cfaf7b03e1c84bc2e78109110b328ee09743`.

Live demonstration: https://ritevenue-karnataka.gentle-orbit-8189.chatgpt.site

GitHub stores the code. Pushing here does not automatically deploy the hosted Site. Production database records, uploaded owner photos, runtime secrets, build output and dependencies are not included. Earlier Sites Git history remains in the original repository; this GitHub repository starts with this import.

## Stack

React 19, TypeScript, Vinext (Next-compatible App Router), Cloudflare Workers, D1/SQLite, Drizzle migrations and R2 object storage. This is not a standard Next.js/Vercel deployment.

## Clone and install

Use Node.js 22.13 or newer (Node 22 LTS recommended) and pnpm 11.19.0. The commands below are for a normal local terminal, not the hosted Sites environment.

```sh
git clone https://github.com/Harishjm/ritevenue-app.git
cd ritevenue-app
npm install --global pnpm@11.19.0
pnpm install --frozen-lockfile
```

Keep the lockfile. Clean clones automatically use the portable development profile.

## Local database and sign-in

The development server uses local Cloudflare emulation. Initialize its database before opening the app:

```sh
pnpm exec wrangler d1 migrations apply DB --local --config wrangler.local.jsonc
```

Create an ignored `.dev.vars` file containing this development-only setting:

```dotenv
RITEVENUE_ADMIN_EMAIL=seedy@sites.test
```

Then start the application:

```sh
pnpm dev
```

Open http://localhost:5173. Protected pages lead to the bundled local sign-in flow, which uses the test account `seedy@sites.test`. This loopback-only development identity is not production authentication. Local bookings and uploaded files stay in the ignored `.wrangler` directory.

The local database configuration uses a placeholder ID for local emulation only. Do not deploy it or use it against a remote database. Hosted identity, D1, R2 and secret configuration are supplied separately by Sites.

## Checks

```sh
node tests/prototype.mjs
pnpm exec tsc --noEmit
pnpm build
```

The booking test harness exercises real handlers against SQLite with a D1 adapter and mocked object storage. It tests hold contention, expiration, immutable quotes, confirmation retries, account isolation, uploads and moderation without external calls.

The original source passed these checks in the managed environment. Clean-clone local startup and browser testing have not been verified here. If local startup reports missing tables, rerun the migration command with the development server stopped. Do not run older validation scripts as the current booking suite; some cover retired enquiry/Google flows.

## Code map

- `app/`: pages, protected workflows and API routes.
- `components/`: search, calendar, owner workspace and UI components.
- `lib/venues.ts`: the 20 fictional venue fixtures.
- `lib/booking.ts`: pricing, validation and atomic booking SQL.
- `lib/owner-venue.ts`: owner submission validation and listing mapping.
- `lib/demo-server.ts`: approved catalog and pricing resolution.
- `lib/calendar.ts`: shared calendar snapshots.
- `db/schema.ts` and `drizzle/`: database schema and migrations.
- `tests/prototype.mjs`: current booking regression checks.
- `PROTOTYPE.md`: architecture, limits and production milestones.
- `TESTING.md`: validation history.
- `ASSETS.md`: stock-photo sources and attribution.

Legacy Google/enquiry files remain for reference; their active API endpoints are retired. No Google API key is needed.

## Before a real customer launch

Actual payment processing requires a supported production host, approved venue inventory, provider integration with verified webhooks, booking agreements, cancellation/refund handling, production authentication and operational testing. The current Site is a non-transactional owner demonstration. Do not publish fictional inventory as real listings or reuse demo tax/price assumptions as a live quote policy.
