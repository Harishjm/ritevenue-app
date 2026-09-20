# Cloudflare production deployment

Production deployment is intentionally manual and separate from staging.

## GitHub environment

Create a protected GitHub environment named `production` with these values:

- Secret `CLOUDFLARE_ACCOUNT_ID`
- Secret `CLOUDFLARE_API_TOKEN`
- Secret `CLOUDFLARE_PRODUCTION_D1_DATABASE_ID`
- Secret `RITEVENUE_ADMIN_EMAIL`
- Variable `CLOUDFLARE_PRODUCTION_R2_BUCKET=ritevenue-production-assets`
- Variable `RITEVENUE_OTP_FROM_EMAIL`

Set `RITEVENUE_AUTH_SECRET` directly as a secret on `ritevenue-production`; do not reuse the staging value. Configure the `AUTH_EMAIL` binding only after Email Sending is onboarded. Preserve all Hostinger root mail records. Email Routing is outside this deployment and must remain disabled unless a separate mail-migration decision is approved.

Configure required reviewers on the environment when supported by the repository plan.

## Deployment

Run the **Deploy Cloudflare production** workflow manually and enter the exact
confirmation `DEPLOY-PRODUCTION`. The workflow validates the application, applies
D1 migrations, and deploys `ritevenue-production`.

The production configuration attaches these Cloudflare Worker Custom Domains:

- `ritevenue.in`
- `www.ritevenue.in`

Cloudflare must have an active `ritevenue.in` zone, and neither hostname may have
a conflicting CNAME record. Staging remains isolated on its `workers.dev` URL and
never receives the production custom domains.
