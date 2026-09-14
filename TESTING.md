# Validation status

## Optional catering in checkout — pending verification

Prepared add/remove/skip flow inside venue checkout, with a catering-estimate snapshot in the existing held quote. Added regression checks for owned active holds, stale edits, unchanged venue pricing/advance, meal dates across overnight access, copying the selection into confirmation, expired/confirmed hold rejection and venue-only checkout.

**Not run:** TypeScript, SQLite handler suite, production build and browser checks. The development environment was unavailable for this change. Keep it on a draft branch until those checks pass; this entry does not claim deployment.


## Catering pilot — 14 September 2026

Passed: TypeScript and SQLite-backed handler tests covering venue-policy compatibility, supplier locality/date/capacity, minimum billable guests and food spend, optional/mandatory totals, tax rounding, rejected client totals, same-origin checks, private supplier contacts and photos, draft ownership, stale revisions, admin-only approval, catalog publication and withdrawal after edits. The full existing venue booking regression suite also passes. Browser interaction/mobile rendering remains unverified; no real supplier availability, reservation or payment is tested. Production build is a separate release gate.

## Five-percent advance and overnight access

The handler suite covers 5% advance rounding, exact 4 PM–4 PM next-day timestamps, four distinct package rentals, two non-overlapping half-day bookings on one date, and extra-hour overlap blocking in either acquisition order, competing holds across dates, package-specific calendar states, search availability, month-boundary overlaps, expired holds and original hours/25% amounts on legacy quotes. The existing booking and owner-publication tests are retained. Browser QA remains unverified.

## Approved owner listings — 12 September 2026

The SQLite-backed handler suite passes approval-to-catalog publication, owner pricing/photo mapping, hidden pending drafts, other-account photo access only while approved, simulated owner-venue holds and confirmation, removal after editing, stale review rejection, atomic approval rechecks, unchanged historical quotes, and republication without duplicates or calendar loss. TypeScript and production build are required separately. Browser interaction remains unverified; no live data is modified by the tests.

## Confirmation navigation repair — 12 September 2026

Replaced the completed-checkout redirect with a stable already-confirmed page to prevent a browser Back redirect loop. Receipt navigation, booking list links and global header/footer navigation now use native anchors. Confirmation pages provide explicit home and bookings links above and below the quote. TypeScript and production build are the validation gates; hosted browser interaction remains unverified.

## Calendar and checkout repair — 12 September 2026

The previous repair was not yet deployed. Availability is now initialized on the server, with native date navigation and a dedicated checkout page. Tests cover URL-encoded hold creation, confirmation, repeat submission returning the same booking, invalid input, and the existing booking/role/storage invariants. Browser and compiled-Worker runtime execution remain unverified: the earlier local network attempt was rejected by automatic approval review (network approval cancelled).

## Current: self-serve owner demo

Use `node tests/prototype.mjs` for the current workflow. It passed the generated SQLite migrations, all 20 fixture checks, input/origin validation, competing holds, expiration/reclaim, confirmation idempotency, immutable saved pricing, cross-account isolation, administrator checks, private image routing and draft moderation. D1 and R2 are represented by an SQLite adapter and an in-memory object-storage mock. No real payment or external request is made. Browser/visual/mobile QA remains unverified in this environment. The sections below describe superseded preview flows.

Passed: TypeScript no-emit compilation; production build; 21 domain validation/search/origin checks; clean SQLite schema creation; duplicate request key persistence check.

Unverified: compiled-Worker HTTP smoke checks. Local network execution was blocked by environment approval cancellation. tests/http-smoke.py is retained for a permitted local environment. Browser/mobile interaction QA and WebMCP runtime validation were not performed.

No live payment, external venue availability or notification integrations exist in this preview. No public-launch readiness is claimed.

## Google integration — 11 September 2026

Passed: TypeScript compilation, production build, ID-only catalog validation, deduplication, import schema rejection, payload limits, credential-free output, fresh photo references, photo/source attribution mapping, missing-photo/error behavior, migration execution, user-scoped lookup queries and atomic daily quota. Provider responses were mocked.

Not yet tested: a real Google key, real catalog import through hosted sign-in, live Google fetches, browser layout and interactions. Integration source is prepared; live data requires secure runtime configuration and an exported catalog.

## Lookup failure diagnostics

The user reported live Google lookup failures after configuring the key. The original handler discarded the provider error, so its cause is not yet known. Added fixed, credential-free error messages for Google ErrorInfo reasons and HTTP status fallbacks, timeout and connection failure; logs contain only diagnostic code and HTTP status. Mocked checks cover restrictions, disabled API, billing, quota, unknown reasons, timeout and prevention of secret/raw-message disclosure. A signed-in live retry is needed to identify the actual cause.

## Confirmed runtime fix

Production logs showed that the Workers runtime rejects `redirect: error` before sending a request. Replaced it with `manual` and explicitly reject 3xx responses without following Location, preventing credential forwarding. Regression checks simulate the unsupported option and confirm redirects are not followed. Live success still requires a signed-in retry after deployment.
