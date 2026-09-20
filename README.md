# RiteVenue

## Public directory launch — 16 September 2026

The current public experience supports owner-authorized venue listings and read-only, owner-reported calendars. Checkout, holds, confirmation and catering attachment/estimate endpoints are disabled in the default launch mode. Fictional fixtures and private-demo approvals are excluded from public pages and APIs. Earlier sections below describe the retained private prototype history.

Venue representatives apply through `/list-your-venue`. The administrator signs in with an emailed one-time code, reviews the private application, and may convert it into an unpublished working draft. Owner self-service authentication is still planned. Calendar information over seven days old, missing dates and dates outside the supplied range appear unconfirmed. No live inventory synchronization is claimed.

The public root, planning guides, approved venue pages, robots and sitemap support search discovery in production. Search Console verification/submission and indexing are separate steps; rankings and indexing are not guaranteed. Staging and local environments emit noindex metadata and disallow crawling. Private workspaces and historical receipts still require sign-in and ownership/admin authorization. The default RITEVENUE_MODE is the public directory; do not set private_demo on a public deployment. The legacy regression tests use that value only inside their isolated mock environment before switching to the real public default for boundary tests.

Bengaluru venue booking prototype: 20 fictional venues, shared availability, two-hour holds, simulated advance payments, locked itemized quotes, owner drafts and private photo uploads, and admin review. Approved owner venues now appear alongside samples in the private catalog, with their supplied photos, prices and simulated booking calendar.

**Directory launch only:** no real reservations, payment collection, verified reviews or Google Places calls. Non-production deployments remain private and noindex.

## Booking packages

New bookings use a **5% advance**, with the remaining balance shown as payable directly to the venue owner. Payments are simulated.

- **Standard Marriage — 24 Hours:** Day 1 at 4 PM to Day 2 at 4 PM.
- **Full Day:** 8 AM–10 PM.
- **Half Day Morning:** 7 AM–2 PM.
- **Half Day Evening:** 4 PM–11 PM.

Each package supports 0–4 extra hours after its end time. Package rentals and the hourly rate are editable. Starter demo defaults use the full-day rental for 24 hours, half that rental for each half-day, and ₹2,000 per extra hour. All mandatory charges and sample tax remain itemized. Morning and evening bookings can share a date; extra hours may block the later package.

Access periods cannot overlap, including on adjacent dates. Previously held and confirmed quotes keep their original agreed terms.

## Owner submission to listing

1. A representative submits the private application at `/list-your-venue`.
2. The configured administrator opens `/admin`, verifies the submission, and either rejects it or creates a private working draft.
3. The administrator completes the draft, records authorization and owner-supplied photos, then submits it for review.
4. A review can request changes, reject the submission, approve it for the private demo, or publish it when explicit public-display consent and photos are present.
5. Saving an approved draft hides it until another review. Existing demo bookings and locked quotes remain saved.

Drafts and photographs remain private until the administrator explicitly approves an owner-authorized submission for public display. Approval does not enable payments.

## Catering pilot

- `/catering`: choose a venue, meal-service date and guest count; compare compatible menus and calculate/download an itemized estimate. Three clearly fictional caterers with six menus demonstrate the flow.
- `/owner`: set in-house-only, approved-supplier-only, outside-caterer or unconfirmed policies, plus venue catering fees and minimum food spend. Customers see the policy before venue checkout.
- `/caterer`: privately save menus, photos, service localities, capacity and stated available/unavailable dates, then submit for review.
- `/admin/catering`: administrator reviews submissions. Approval adds suppliers to the private catalog; saved edits withdraw them pending another review. Revision tokens prevent stale edits and reviews.

This stage supports discovery and estimates only. It does not reserve caterers, collect their advance, notify suppliers or change venue quotes. The venue's 5% advance does not apply to catering. Supplier contact details stay in the owner/admin workspace. Approved photos use the existing private image route.

## Source and hosting

This repository contains the RiteVenue application and its independent Cloudflare deployment configuration.

Imported Sites source commit: `dd74cfaf7b03e1c84bc2e78109110b328ee09743`.

GitHub stores the code. Pushing does not deploy staging or production; both deployments require manual GitHub Actions workflows. Database records, uploaded photographs, runtime secrets, build output and dependencies are not included.

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

Create an ignored `.dev.vars` file. Use a random value of at least 32 characters for the local authentication secret and a development-only six-digit OTP:

```dotenv
RITEVENUE_ADMIN_EMAIL=admin@example.test
RITEVENUE_AUTH_SECRET=replace-with-a-random-local-secret-of-at-least-32-characters
RITEVENUE_AUTH_DEV_OTP=123456
RITEVENUE_OTP_FROM_EMAIL=signin@ritevenue.in
```

Then start the application:

```sh
pnpm dev
```

Open http://localhost:5173 and use the configured development email and OTP at `/admin/sign-in`. The fixed development OTP is accepted only on loopback when the deployment is not marked as standalone Cloudflare. Local database records and uploaded files stay in the ignored `.wrangler` directory.

The local database configuration uses a placeholder ID for local emulation only. Do not deploy it or use it against a remote database. Production and staging use separate D1, R2, email and secret bindings.

## Checks

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

The tests exercise real handlers against SQLite with a D1 adapter and mocked object storage/email. They cover OTP/session security, hold contention, immutable quotes, account isolation, uploads, application conversion and moderation without external calls.

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

Actual payment processing requires approved venue inventory, provider integration with verified webhooks, booking agreements, cancellation/refund handling, production customer/owner authentication and operational testing. The current Site is a non-transactional public directory. Do not publish fictional inventory as real listings or reuse demo tax/price assumptions as a live quote policy.

## Public venue onboarding

`/list-your-venue` accepts a private application without sign-in. Public calls to POST `/api/venue-applications` validate input, require same-origin JSON, enforce a durable five-per-network-per-day limit, and deduplicate retries. The admin-only inbox displays up to 100 recent applications, supports documented rejection/reopening, and can create one private working draft from each application. Conversion does not confirm owner rights, upload photos or publish the venue. Independent owner authentication is still required before venue representatives can manage their own drafts.
