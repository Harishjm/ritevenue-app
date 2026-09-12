# RiteVenue owner demonstration

This is a private, responsive web prototype. It is not a production booking service and does not collect payments. The 20 sample venues are fictional, with illustrative stock photography and real Bengaluru locality labels. Approved owner submissions also appear in the private catalog with owner-provided details and photos. All booking inventory and payments remain simulated. No claim of being first in the market is made.

## Demonstration journeys

1. Couple: browse `/`, filter by locality/date/capacity/total budget/type, open a venue, choose full-day or extended access and venue-only extras, start a hold, and complete a simulated advance on a dedicated checkout page (or cancel and release the date). Confirmation lives at `/bookings/<id>` with a printable and JSON-downloadable immutable quote. `/bookings` lists the account's records.
2. Owner: `/owner` accepts private venue drafts, mandatory fee schedules and up to six uploaded images. Rights confirmation is required for draft submission. Save, edit and submit for admin review; later edits reset review status and hide the listing until approval. Approved drafts have a stable listing link and a simulated booking calendar. The configured administrator can also demonstrate pricing changes and see shared demo bookings from the owner view.
3. Admin: `/admin` requires the server-configured administrator email. Review submitted drafts, approve only for private demonstration or request changes, edit sample venue pricing and monitor simulated bookings. Approval adds the venue to the private searchable catalog. It does not publish the site publicly, claim ownership verification, enable real reservations or override booked dates.

## Data and invariants

- D1 owns `demo_slots`, with a unique `(venue_slug, event_date)` index. Checkout uses an atomic conditional upsert; it can acquire only an unused, released or expired-held slot.
- A hold lasts two hours. Availability queries treat expired holds as available immediately, and the next checkout can acquire them. No scheduled cleanup is needed for correctness. Expired rows may remain in the database.
- Venue pages load the first calendar snapshot on the server. Date links and a direct date field work through standard navigation; the full-day checkout uses native browser forms, including when JavaScript is unavailable. Package customization and live refresh use JavaScript.
- Calendar clients poll every three seconds; search-date filters poll every five seconds. This is near-real-time, not zero-latency streaming. The database decides at checkout even if a displayed calendar is stale.
- Server validation owns venue identity, dates, capacity, package, optional items and pricing. Prices use integer paise, an explicitly illustrative 18% tax and a 25% simulated advance. All mandatory charges and the remaining owner-direct balance are displayed.
- A hold saves its quote; confirmation atomically copies it into `demo_bookings` and marks the slot booked using D1 batch transaction semantics. The unique hold reference makes confirmation retries idempotent. There is no update API for confirmed quote JSON.
- Unauthenticated requests and cross-origin writes fail. Only a hold's account can release/confirm it. Other users see availability states, not user identifiers or quotes. Receipts are owner-account/admin-only.
- R2 holds private uploaded bytes; D1 stores image ownership and object keys. The uploader and administrator can read private draft photos. Other signed-in viewers may read a photo only while an approved draft from that same uploader references it. JPEG/PNG/WebP MIME and magic bytes are checked, maximum 4 MB/file, six photos per draft, 30 uploads per account. Full image decoding, metadata removal, virus scanning and self-service deletion are not implemented; do not use for production intake yet.
- Catalog reads combine 20 sample fixtures with rows whose status is `approved_for_demo`. Owner listings use stable `owner-<draft UUID>` URLs and their own submitted pricing. Drafts, pending reviews and requested changes are hidden. Saving edits immediately hides a previously approved row; approval republishes the same URL and retains its existing calendar.
- Approval includes the draft update timestamp, rejecting stale reviews. Owner-venue hold acquisition atomically rechecks the approved status and exact reviewed payload. Held/confirmed quotes stay immutable when a listing is edited or hidden. Existing holds can still be confirmed from their checkout page.
- The catalog refreshes every 10 seconds and on window focus. A newly loaded page sees approval immediately. Owner-supplied galleries are labeled separately from fictional samples; neither uses fabricated reviews. Admin approval is not ownership verification or a public launch.

## Retired functionality

Google import/lookup and old enquiry APIs return 410. The old discovery screen redirects to the demo home. Previously stored identifiers and legacy test requests are retained, not deleted. Legacy Google helper files are unused by active routes. No Google API requests or external outreach occur in the new flow.

## SEO separation

Four original planning articles use server-rendered content, unique titles/descriptions and navigable links. `sitemap.xml` contains editorial URLs only. All pages remain under private access, `noindex` metadata and a disallow-all robots file. Do not remove those protections from fictional listings. For a later public domain, update the sitemap origin and add canonical metadata for approved editorial and real venue pages; verify rendered content through Search Console. Do not add fabricated review or business structured data.

## Production gates

- Keep this on Sites only as a non-transactional demonstration. The current Sites documentation lists enabling financial transactions as unsupported. A real payment-enabled release requires a supported production host, a separate launch review and production authentication.
- Recommended future booking store: PostgreSQL with equivalent slot uniqueness and transactions. Keep internal booking IDs and immutable versioned quote snapshots. Add separate payment attempts/provider events rather than changing historical quote totals.
- Before live advance collection, choose a permitted payment provider and confirm the merchant-of-record and venue agreement model. Single-party collection is a business/compliance decision, not only an API option. Implement provider-created orders, verified webhook signatures, expected amount/currency/order checks, idempotency, reconciliation, timeout handling and late-success refund/escalation. Never confirm from a client success callback alone.
- Price-lock wording requires enforceable venue-approved inclusions, taxes, deposits, cancellation/rescheduling/refund terms, balance due dates and customer support. The prototype's quote is not legally binding.
- Global inventory must cover offline and other-channel sales through contractual allotment or synchronization. Removing owner calendar buttons does not prevent off-platform double bookings. Define maintenance blocks and audited exception procedures before onboarding actual inventory.
- No fake ratings: demo confirmations never become verified reviews. A real review workflow must be tied to eligible completed real bookings with moderation and anti-abuse controls.
- Add rate limits, retention/deletion, image security processing, monitoring, public identity/roles, accessibility/browser/mobile QA, backups and restoration tests before real customer use.

## Verification

`node tests/prototype.mjs` transpiles the real domain and route code into an isolated test harness, runs generated migrations against SQLite and exercises handlers with a D1-compatible adapter and mocked private object storage. It makes no external calls. It covers competing holds, expiry, quote integrity, idempotency, role/ownership isolation, origin checks, uploads and moderation. TypeScript and production builds are run separately. These tests do not replace hosted browser or payment-provider tests.
