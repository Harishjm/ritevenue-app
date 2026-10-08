# Venue owner workspace

## User flow

1. Start at `/list-your-venue`: enter the venue name, city and locality, then continue with Google. These three fields are temporarily retained in that tab's session storage during sign-in; the entry page first redirects to the configured OAuth host so apex/www do not lose the saved details.
2. `/owner` shows venues assigned to the signed-in Google account. Start an incomplete draft; edits autosave to D1. A separate Save draft button retries a failed save. Stale edits are never silently overwritten.
3. Complete three steps: venue/contact basics, photos/details, preview/permission. Standard rental fields and custom pasted details are supported, with optional catering and calendar information. For a standard package offered without a quoted amount, select **Available — price on request** and set its actual start/end times; choose **Next day** for overnight slots. Unknown rentals stay blank/null, not zero. The same values appear in preview, admin review and the approved owner listing. Changing back to **Available — enter rental** requires entering an amount before submission.
4. Upload 2–15 photos for submission, choose the cover, and retry individual failed uploads. Drafts can have fewer photos. Source images are optimized in the browser to metadata-free static WebP, with automatic JPEG fallback for browsers without WebP encoding, at most 1600px and 350KB. Originals up to 15MB are accepted by the picker. Upload validation, storage and private/public responses preserve the actual output format; existing WebP photos are unchanged.
5. Submit for review. That exact revision is locked. Withdraw the submission to edit it again.
6. Admin opens **Owner submissions & access** from `/admin`, opens the venue, and approves, requests changes, or rejects it with feedback. Feedback and review history appear in the owner's workspace. The owner edits the same venue and resubmits—no duplicate application is needed.

No notification email or WhatsApp message is sent automatically. Initially, staff should check the inbox and manually share the `/owner` link when requesting changes.

## Working copies versus published listings

`venue_workspaces` is the editable working copy. `venue_revisions` contains immutable submissions. `owner_drafts` remains the existing public projection to preserve venue IDs, links and public image behavior.

Saving changes, requesting corrections, rejection, and resubmission leave the previous approved public snapshot visible. Only an approval updates that snapshot. Admin has an explicit **Unpublish listing** button. Assigned owners have **Withdraw public-display permission**, which immediately removes new public access and clears the working-copy permission; it does not delete historical records or cached copies outside RiteVenue.

Publication, status changes, revision checks, and review events use a single D1 batch transaction. Optimistic revisions prevent another tab or a stale admin review from overwriting newer work. Contact name and phone remain private and are excluded from the public projection.

## Existing venues and owner assignment

Existing admin **Edit draft** links open the new workspace. On first open, the legacy record is imported without changing its public projection, venue ID, photo IDs, or URLs. Once imported, legacy draft/review/calendar/photo-metadata endpoints reject conflicting edits; use the new workspace.

For an anonymous application, admin first uses the existing conversion to create a private draft. In the new workspace, **Assign an owner** records the intended Google account email and how staff verified that person manages the venue. The seven-day invitation appears only to that verified signed-in email. Share `/owner` manually; the URL alone grants no access. Accepting the invitation adds venue membership rather than transferring the original public-image ownership. An email typed into an anonymous application never grants access automatically.

Owner identity is keyed by Google's immutable `sub`, not a mutable email. Admin remains restricted to the configured administrator account and its existing subject binding. A membership may represent a venue manager; sign-in alone does not verify legal ownership.

## Storage and security

- Migration `0013_owner_portal.sql` adds account, membership, workspace, immutable revision, review-event, invitation, and photo-reservation tables, plus an audience column for OAuth flows.
- Existing `DB` and private `BUCKET` bindings are reused. There are no new secret names or email-provider requirements.
- `/api/owner` and `/api/owner/photos` require a real session. Every venue/photo request checks membership or admin permission. Mutation requests require the same Origin.
- Draft responses and private photos are `private, no-store`. Public photos still check the approved snapshot; uploading does not make an image public.
- Upload retries reserve a stable photo ID but use a fresh R2 object key per attempt. Only one attempt finalizes the ID, so a retry cannot overwrite an already published image. Losing attempts are removed. A process crash can leave an unreferenced attempt object; cleanup must be reviewed and must retain all submitted/public references. No automatic deletion job is added.
- Per-account limits bound draft creation, mutations and upload attempts. Each venue currently permits 150 lifetime reserved photos; the active submission limit is 15. Contact support for reviewed cleanup if this lifetime cap is reached.
- Google tokens are not persisted; the existing hashed-session, PKCE, nonce, signature/claim verification and HttpOnly cookie mechanisms are reused. The OAuth audience is stored server-side, not trusted from callback query parameters or UI cookies.

## Before enabling for real owners

Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, then `node tests/auth-worker.mjs`. Apply migration 0013 through an explicitly approved deployment. Keep staging and production credentials and storage separate.

Use the existing Google OAuth client and callback for the matching environment. Check the Google project's audience/access settings: real owner accounts must be allowed to sign in, not only the administrator. Verify a real second Google account on staging, saving/resuming, private photos, feedback/resubmission, existing-venue assignment, and publication/withdrawal. Synthetic integration tests do not prove the external Google configuration.

No remote migration, secret change, staging deployment or production deployment is implied by this implementation. Production still requires the user's **Go Live** approval.

## Deferred

Automated notifications, email OTP, delegated team-role management, self-service permanent deletion, invitation/member revocation UI, and automated retention/orphan cleanup remain follow-up work. Administrators should review erroneous assignments before any operational membership change. Online booking and payments remain disabled.
