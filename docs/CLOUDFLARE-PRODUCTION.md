# Cloudflare production deployment

Production deployment is intentionally manual and separate from staging.

## GitHub environment

Create a protected GitHub environment named `production` with these values:

- Secret `CLOUDFLARE_ACCOUNT_ID`
- Secret `CLOUDFLARE_API_TOKEN`
- Secret `CLOUDFLARE_PRODUCTION_D1_DATABASE_ID`
- Variable `CLOUDFLARE_PRODUCTION_R2_BUCKET=ritevenue-production-assets`

Configure required reviewers on the environment when supported by the repository plan.

## Deployment

Run the **Deploy Cloudflare production** workflow manually and enter the exact
confirmation `DEPLOY-PRODUCTION`. The workflow validates the application, applies
D1 migrations, and deploys `ritevenue-production` to workers.dev.

The generated configuration deliberately removes custom routes. It does not attach,
modify, or deploy to `ritevenue.in`. Connecting the public domain is a separate,
explicit go-live operation.
