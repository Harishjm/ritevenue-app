# RiteVenue independent Cloudflare staging

This is a preparation path for an independently owned Cloudflare account. It does not change `ritevenue.in`, copy production records, or deploy production.

## Current boundary

The public directory and administrator workspace run as a standalone Cloudflare Worker. Administrator authentication uses a single-use email code, D1-backed challenges and sessions, and an HTTP-only session cookie. Owner self-service authentication is not enabled yet.

## One-time Cloudflare setup

Complete these steps in a Cloudflare account owned by Harish:

1. Create a D1 database named `ritevenue-staging`.
2. Create a private R2 bucket with a unique name such as `ritevenue-staging-assets`.
3. Copy the D1 database ID from the Cloudflare dashboard.
4. Create a custom API token scoped to this Cloudflare account. It needs the minimum permissions required to deploy Workers and manage the staging D1 database. Add R2 write permission only when CI must manage R2 resources.
5. In GitHub, create an environment named `staging`. Add required reviewers if the GitHub plan supports them.
6. Add these environment secrets:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_STAGING_D1_DATABASE_ID`
   - `RITEVENUE_ADMIN_EMAIL`
7. Add environment variables `CLOUDFLARE_STAGING_R2_BUCKET` and `RITEVENUE_OTP_FROM_EMAIL`.
8. Set the Worker secret `RITEVENUE_AUTH_SECRET` to an independently generated value of at least 32 characters. Staging and production must use different values.
9. Onboard only **Email Sending** for the selected sender domain and bind it as `AUTH_EMAIL`. Review every DNS change before approval. Do not enable Email Routing and do not replace, delete or proxy Hostinger MX, SPF, DKIM, DMARC, autoconfig or autodiscover records. Cloudflare Email Sending uses bounce records on its own subdomain, but its proposed DMARC change must still be compared with the existing record.

Do not put tokens, account IDs, database IDs, or production data in committed files.

## First staging deployment

After this branch is merged, open GitHub Actions and run **Deploy Cloudflare staging**. Enter `DEPLOY-STAGING`. The workflow validates the application, builds it, applies committed migrations to the staging database, and deploys the staging Worker.

The workflow is manual. A push to `main` runs validation but does not deploy.

## Authentication expectation

Test `/admin/sign-in`, resend throttling, invalid and expired codes, logout, and direct access to admin APIs. Only the configured address can receive a working challenge. A signed-in session also carries an explicit administrator role; email verification alone does not grant access to other addresses. `/owner` remains an administrator-operated workspace until owner authentication and ownership migration are implemented.

## Database migration and backup

Committed files under `drizzle/` are the database migration history. The staging workflow applies them using Wrangler before deploying.

Before any future production cutover:

1. Stop writes or enter a documented maintenance window.
2. Export the source D1 database to a timestamped SQL file using the hosting provider's supported export facility.
3. Inventory all R2 objects and copy them to a bucket owned by Harish. Verify object counts, keys, sizes, and representative checksums.
4. Import the SQL export into the new D1 database.
5. Verify row counts per table and exercise public image reads.
6. Keep the old deployment read-only until the rollback window closes.

Backups contain private owner and customer information. Store them encrypted, restrict access, and never upload them as public GitHub artifacts.

## Rollback

For an application-only staging failure, use Cloudflare Workers deployment rollback or redeploy the last known-good Git commit. Database migrations are not automatically reversed.

For a schema/data failure, stop writes, preserve the failed database for investigation, restore the pre-migration export to a replacement D1 database, update the staging binding, and redeploy the last known-good application revision.

Production rollback must be rehearsed in staging before DNS is changed.

## Production gate

The production workflow exists but must not be run until:

- administrator OTP has passed staging tests;
- staging tests pass;
- D1 and R2 migration rehearsal succeeds;
- backups and rollback are verified;
- monitoring and error reporting are configured;
- Harish explicitly authorizes the production cutover with **Go Live**.
