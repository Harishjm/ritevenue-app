# Validation status

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
