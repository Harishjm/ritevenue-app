# RiteVenue — directory launch and prototype history

## Current public launch

The public deployment now serves the real-owner directory described in README.md. All transactional actions are disabled by default. Only owner_drafts rows with approved_public status AND explicit publication consent are exposed, using an allowlisted projection that excludes owner IDs, review notes and private contacts. Image access checks status, consent, same uploader ownership and listing reference on every request. Legacy request receipts return not found; prior booking receipts remain account/admin protected. Public status never migrates automatically from approved_for_demo.

Owner calendar declarations are stored in reviewed draft JSON. Their freshness timestamp is assigned server-side when the owner supplies or updates the calendar; admin approval does not refresh it. Calendar-only writes require owner identity, expected update time and exact prior payload, and cannot change listing details. Updating the listing returns it to a private review state. Public publish reviews atomically recheck the reviewed JSON, including consent. There is no schema migration or destructive data conversion.

Robots and sitemaps expose public editorial and public-approved venue URLs. Authentication is still enforced in every protected route/API, independently of robots. Default public mode disables holds, confirmation, release and catering estimates/attachment, including native form aliases. Public access is enabled only after this source is deployed successfully. Search Console verification and indexing are not performed by the application.

The sections below record the earlier private demonstration; those booking features are retained in source and tests, not enabled on the public directory.


This is a private, responsive web prototype. It is not a production booking service and does not collect payments. The 20 sample venues are fictional, with illustrative stock photography and real Bengaluru locality labels. Approved owner submissions also appear in the private catalog with owner-provided details and photos. All booking inventory and payments remain simulated. No claim of being first in the market is made.

## Demonstration journeys

1. Couple: browse `/`, filter by locality/date/capacity/total budget/type, open a venue, choose a 24-hour marriage, full-day, morning or evening package with optional extra hours and venue-only extras, start a hold, and complete a simulated advance on a dedicated checkout page (or cancel and release the date). Confirmation lives at `/bookings/<id>` with a printable and JSON-downloadable immutable quote. `/bookings` lists the account's records.
2. Owner: `/owner` accepts private venue drafts, mandatory fee schedules and up to six uploaded images. Rights confirmation is required for draft submission. Save, edit and submit for admin review; later edits reset review status and hide the listing until approval. Approved drafts have a stable listing link and a simulated booking calendar. The configured administrator can also demonstrate pricing changes and see shared demo bookings from the owner view.
3. Admin: `/admin` requires the server-configured administrator email. Review submitted drafts, approve only for private demonstration or request changes, edit sample venue pricing and monitor simulated bookings. Approval adds the venue to the private searchable catalog. It does not publish the site publicly, claim ownership verification, enable real reservations or override booked dates.

## Data and invariants

- D1 owns `demo_slots`, with a unique hold ID and a lookup index on `(venue_slug, event_date)`. Multiple non-overlapping access periods can share a start date. An atomic conditional insert rejects any overlap with an active held or booked period; release and confirmation address the unique hold ID.
- Standard Marriage / 24 Hours runs from Day 1 at 4 PM to Day 2 at 4 PM. Full Day is 8 AM–10 PM, Morning Half Day is 7 AM–2 PM, and Evening Half Day is 4 PM–11 PM. Each supports 0–4 extra hours after checkout, extending the persisted end timestamp and the overlap check. New quotes persist the 5% advance, selected hours, hourly rate and complete access window. Old quotes keep original hours and amounts.
- Package rental prices and the hourly extension rate are editable. Existing pricing records receive starter demo defaults: marriage rent equals full-day rent, half-day rents are half of full-day (minimum ₹100), and extra hours cost ₹2,000/hour. Mandatory charges apply once per booking and illustrative tax applies to the full subtotal. These defaults need owner review for a real product.
- Atomic hold acquisition rejects overlapping periods on the same or adjacent dates. Back-to-back access is allowed when one period ends exactly as another starts; no cleanup buffer is currently enforced. Calendars use the selected package and extra hours; catalog search uses the 24-hour marriage package without extra hours.
- A hold lasts two hours. Availability queries treat expired holds as available immediately, and the next checkout can acquire them. No scheduled cleanup is needed for correctness. Expired rows may remain in the database.
- Venue pages load the first calendar snapshot on the server. Date links and a direct date field work through standard navigation; the full-day checkout uses native browser forms, including when JavaScript is unavailable. Package customization and live refresh use JavaScript.
- Calendar clients poll every three seconds; search-date filters poll every five seconds. This is near-real-time, not zero-latency streaming. The database decides at checkout even if a displayed calendar is stale.
- Server validation owns venue identity, dates, capacity, package, optional items and pricing. Prices use integer paise, an explicitly illustrative 18% tax and a 5% simulated advance. All mandatory charges and the remaining owner-direct balance are displayed.
- A hold saves its quote; confirmation atomically copies it into `demo_bookings` and marks the slot booked using D1 batch transaction semantics. The unique hold reference makes confirmation retries idempotent. There is no update API for confirmed quote JSON.
- Unauthenticated requests and cross-origin writes fail. Only a hold's account can release/confirm it. Other users see availability states, not user identifiers or quotes. Receipts are owner-account/admin-only.
- R2 holds private uploaded bytes; D1 stores image ownership and object keys. The uploader and administrator can read private draft photos. Other signed-in viewers may read a photo only while an approved draft from that same uploader references it. JPEG/PNG/WebP MIME and magic bytes are checked, maximum 4 MB/file, six photos per draft, 30 uploads per account. Full image decoding, metadata removal, virus scanning and self-service deletion are not implemented; do not use for production intake yet.
- Catalog reads combine 20 sample fixtures with rows whose status is `approved_for_demo`. Owner listings use stable `owner-<draft UUID>` URLs and their own submitted pricing. Drafts, pending reviews and requested changes are hidden. Saving edits immediately hides a previously approved row; approval republishes the same URL and retains its existing calendar.
- Approval includes the draft update timestamp, rejecting stale reviews. Owner-venue hold acquisition atomically rechecks the approved status and exact reviewed payload. Held/confirmed quotes stay immutable when a listing is edited or hidden. Existing holds can still be confirmed from their checkout page.
- The catalog refreshes every 10 seconds and on window focus. A newly loaded page sees approval immediately. Owner-supplied galleries are labeled separately from fictional samples; neither uses fabricated reviews. Admin approval is not ownership verification or a public launch.

## Catering discovery pilot

Three fictional suppliers/six menus cover vegetarian and mixed menus, buffet/banana-leaf service, supplier-locality/date/capacity matching and venue permission rules. Images use an explicitly illustrative existing dining photo. Owner venues without an entered policy default to unconfirmed and match no caterers. Hotels and halls have labeled fictional sample restrictions.

`/caterer` stores validated private supplier drafts in `catering_drafts`. Contacts are omitted from discovery. R2 images reuse the upload limits and ownership checks above. `/admin/catering` approves pending rows for private discovery. Saves reset approval; random UUID revisions provide optimistic concurrency for saves and reviews. Approved supplier images are readable by signed-in viewers only while referenced by an approved listing from the uploader. Approval does not verify food licensing or commercial readiness.

`POST /api/catering/estimate` accepts selection identifiers only and reloads the current approved catalog, prices and policy. It checks date, locality, supplier/venue capacity and permission before calculating. Amounts use integer paise. Billable guests are the higher of expected guests and package minimum; minimum food spend is topped up separately, then mandatory staff/equipment/transport/venue fees and optional per-billable-guest extras are added. The supplier-entered tax rate is applied to this entire subtotal as an explicit prototype assumption (sample menus use illustrative 5%). Platform fee is zero. Future production tax treatment may need separate line-specific rules.

The estimate is for one meal service and excludes venue rent, future extra guests and changes. It includes a final guest-count deadline, extra-guest rate and cancellation/change terms. JSON download is an estimate, not a stored order or locked price. Stated availability has no hold/reservation semantics; a date match is not a confirmed capacity promise. Refreshing/recalculating rechecks supplier data, while an already downloaded estimate may become stale. No catering payment, 5% advance, supplier notification or reservation endpoint is enabled. Existing venue booking tables/quotes are unchanged.

Migration `0004_many_maria_hill.sql` adds only the supplier-draft table and indexes. Venue catering policy stays in the existing validated owner-draft JSON with backward-compatible defaults. Suppliers need administrator review before discovery, plus venue permission when a whitelist applies. Dates are reviewed with the supplier draft; no real-time supplier inventory is claimed.

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

## Optional catering within venue checkout

After selecting a venue and creating its timed hold, checkout offers Choose catering or Skip catering. The inline menu picker fixes the venue and guest count to the hold, and permits a meal date within the venue's access dates (including the second day of a marriage package). Exact meal times remain unconfirmed. Adding saves a server-recalculated estimate; checkout then shows the saved full breakdown. Customers can replace or remove it before confirmation.

The optional cateringEstimate and cateringRevision fields live alongside existing venue fields in quote_json. They are planning preferences only: venue total, advance, balance and access times never change. Attachment writes require an owned, unexpired held row, a matching client revision, and an atomic comparison of the old quote payload. Released/expired/confirmed holds reject changes. Normal confirmation copies the whole current snapshot into the existing booking record. Receipt and its JSON/PDF include the estimate separately from the locked venue price. Historical venue-only quotes remain valid.

No new database migration, supplier reservation, catering advance, event planner or supplier notification is introduced. Supplier approval and venue rules are rechecked when attaching; a saved estimate is not a guarantee of later availability or pricing. TypeScript, the SQLite handler regression suite and production build passed on 15 September 2026. Browser interaction remains unverified.
