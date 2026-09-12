# Private Google venue discovery integration

Status: prepared for testing. No real IDs or Google credentials are included.

## Operator flow

1. Run discover_venue_ids.py for a Bengaluru locality.
2. Configure GOOGLE_MAPS_API_KEY as a server-side secret in the deployed runtime, with Places API (New) enabled and appropriate API restrictions, billing and quotas. The discovery script runs on your machine; configuring its environment does not configure the hosted website. Never use a NEXT_PUBLIC key or paste a key into the import file.
3. Open /real-venues and import compliant_venues_catalog.json.
4. Click Load real venue details. Six catalog records are resolved per page; each can make one Details and one Photo request. No provider requests occur on import or status checks.

## Persistence

D1 venue_references stores only exempt place IDs plus app-owned fields. Imported records are scoped to the authenticated Sites user. Duplicate place IDs preserve existing records; conflicting UUIDs produce a recoverable error. Imports validate all fields before writes, reject Google metadata and owner claims/prices, and process up to 500 rows in bounded batches. A failed later batch may leave earlier rows imported; reruns are safe.

lookup_usage stores only user/day counters. The preview atomically reserves up to 120 provider requests per UTC day per signed-in account. Failed requests and missing photos can consume reserved units. This is a conservative application guard, not a substitute for project-wide Google quotas/budget monitoring. Public release needs stronger authorization, global spend controls and abuse testing.

## Runtime content

Provider responses use fetch cache:no-store, API responses use private,no-store, and no Google display data is persisted to D1, application logs, localStorage, assets or framework image optimization. Photos use fresh photo references and temporary provider image URLs, with photographer attribution and an individual photo source link. Missing source links cause photos to be omitted. Browser/Google image delivery follows provider response caching; this is not an absolute promise that browsers never cache bytes.

We request only name, address, Maps link, business status, photos and provider attribution. Ratings, phone and website fields are excluded initially to avoid an unnecessary higher-tier field mask. No prices, capacities, partnership badges or book buttons are invented for discovered venues. Existing test booking APIs reject real venue IDs because they only accept the explicit sample catalog.

## Publication scope

This is a private integration test, not an indexed public directory. Identifier storage does not by itself establish that a marketplace/directory use satisfies Google's agreement. Review the complete intended use and required attribution before public release; rely on independently authorized owner data for the durable SEO catalog.

## Official references

- https://developers.google.com/maps/documentation/places/web-service/place-details
- https://developers.google.com/maps/documentation/places/web-service/place-photos
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://cloud.google.com/maps-platform/terms
