# Google administrator sign-in

Phase 1 uses **Continue with Google** for the single configured administrator. Customers can browse and submit enquiries without an account. Owner/customer self-service authentication is not enabled by this change. Email OTP is deferred to Phase 2: its implementation and tables are retained, but the public request/verification endpoints return 404 and deployment does not configure an email binding.

## Google Cloud setup

1. In a RiteVenue-owned Google Cloud project, configure Google Auth Platform branding and audience. Use RiteVenue as the app name and the published homepage/privacy URLs. Choose External if the admin is a consumer Gmail account. If the app is in Testing, add the administrator as a test user.
2. Create a **Web application** OAuth client. Use separate clients for production and staging/development. Only `openid email` scopes are requested; no Gmail, Drive, Contacts or offline access is requested.
3. Register exactly the corresponding Authorized redirect URI:
   - Production: `https://www.ritevenue.in/api/auth/google-callback`
   - Staging: `https://ritevenue-staging.ritevenue.workers.dev/api/auth/google-callback`
   - Local development: `http://localhost:5173/api/auth/google-callback`
4. Put the client ID in the matching GitHub environment variable `RITEVENUE_GOOGLE_CLIENT_ID`. Store the client secret directly in that environment's Cloudflare Worker as **secret** `RITEVENUE_GOOGLE_CLIENT_SECRET`. Do not paste secrets into chat, logs, source files or GitHub artifacts.
5. Set GitHub environment secret `RITEVENUE_ADMIN_EMAIL` to the exact Google account email to allow. Keep the existing Worker secret `RITEVENUE_AUTH_SECRET` (at least 32 random characters, distinct per environment). No Cloudflare Email Sending onboarding or paid email plan is required for this authentication implementation.

The deployment generator sets `RITEVENUE_GOOGLE_REDIRECT_URI` and the client ID as Worker variables. The client secret is never included in generated configuration. Setting GitHub values alone does not update an already deployed Worker. Follow the existing staging approval and production **Go Live** gates.

## Flow and security

The same-origin POST at `/api/auth/google-start` creates a ten-minute D1 flow with hashed state and browser-cookie token. It redirects to Google's authorization-code flow with PKCE and nonce. Sign-in started on an alternate production hostname first returns to the configured canonical sign-in host, ensuring its host-only cookie reaches the callback.

The callback atomically consumes the browser-bound state before exchanging the code server-side. JOSE verifies Google's RS256 signature using Google's public keys, issuer, audience, issued time and expiry; the application checks nonce, authorized party, verified email and the exact administrator allowlist. Google tokens are never sent to the browser or stored. Only a hashed RiteVenue session token is stored, with a 12-hour HttpOnly, SameSite=Lax, Secure cookie on HTTPS. Logout revokes the D1 session.

The first successful login binds the allowed email to Google's immutable subject in `auth_google_identities`, preventing a different Google account from later claiming the same address. Existing administrator user IDs are retained to preserve ownership. A deliberate Google-account replacement needs a reviewed identity-binding change, not an automatic relink. Changing the configured admin email is also an ownership migration decision.

Migration `0010_violet_tarantula.sql` adds the flow and identity tables. Apply migrations only through the approved deployment workflow. Existing OTP sessions may continue until expiry/logout; this change prevents issuing new sessions through OTP endpoints.

## Verification before launch

Run `pnpm test`, `pnpm exec tsc --noEmit` and `pnpm build`. Tests mock Google's transport and public-key source but verify genuinely signed JWTs with the real verification library. They cover invalid signatures/claims, wrong accounts, state/cookie mismatch, replay, concurrent callbacks, PKCE, provider errors, safe return URLs, throttling, session logout and disabled OTP routes.

After Google configuration and an authorized staging deployment, manually verify a complete real Google login, refusal of a second unapproved account, cancellation, sign-out, private enquiry access and host redirect. Mocked tests cannot prove the Cloud account configuration is correct. Do not log authorization codes, cookies, client secrets or tokens during troubleshooting.

Reference: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).
