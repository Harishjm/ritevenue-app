# RiteVenue SEO and content plan

Prepared 6 October; updated 11 October 2026. Earlier implementation batches are committed, and the live Bangalore collection links to the Day 11 guide. The Day 13 section below is local and awaits deployment. No automatic publishing schedule has been activated.

## Resume checkpoint — 11 October 2026

- **12/30 complete (40%), 4 partial, 14 open.** This is implementation progress, not elapsed days, deployed pages or Google indexing.
- Day 13: the live Bangalore collection showed 11 published listings, including exactly two in Rajajinagar: The Pergola Venue and Chaitanya Convention Centre. A standalone Rajajinagar collection would be thin under our three-listing launch rule, so the existing city collection now has a conditional Rajajinagar visit-planning section. Its links and count use the current approved listing data, and the section appears only while at least two relevant venues are published. No additional indexable URL was created.
- Search Console's latest finalized window for `sc-domain:ritevenue.in` is **10 September–7 October 2026** (comparison: **13 August–9 September**), all countries and devices: **10 clicks, 41 impressions, 24.39% CTR, average position 23.37**. The prior window had zero clicks and impressions, so percentage growth and position change are not meaningful. Search Console reports an approximately three-day data delay. The Bangalore collection had **2 clicks and 9 impressions**; `wedding venues in bangalore` had **one impression** at average position 58. Those small counts do not establish a trend or justify many area pages. The returned high-confidence opportunity lists were empty.
- **Next: Day 15**, a guide explaining the scope of a whole-wedding budget. Keep Days 16–17 scenario worksheets separate until their assumptions can be researched. Days 1–3 still need venue/operator and Google canonical checks; Day 13 still needs deployment and a live link check.

## Resume checkpoint — 9 October 2026

- **11/30 complete (37%), 4 partial, 15 open.** These are completed implementation checkpoints, not elapsed days, deployments or Google-indexed pages.
- Day 11: added `/guides/simple-wedding-planning-bangalore`, with shared priorities, a keep/simplify/skip decision framework, coordination responsibilities, a hypothetical 100-guest example and a final scope checklist. No venue prices, savings or facilities are invented.
- The guide has a distinct scope from Day 10: deciding what the celebration includes, rather than planning a smaller event's layout. Existing rental and capacity guides retain their own subjects and URLs.
- Connected through the Bangalore collection and the existing automatic guide directory, related-guide navigation, canonical metadata, Article markup and sitemap. Editorial review date: 9 October 2026. Production deployment and indexing remain unverified.
- Validation: TypeScript, targeted lint, production build, prototype tests (including sitemap and staging checks), unique guide slugs, collection link and `git diff --check` passed. No production or Search Console changes were made.
- **Next: Day 13**, verify Rajajinagar inventory, then decide whether there is enough useful coverage for a comparison page or guide section. Day 12 is already complete; do not create another capacity article. Days 1–3 still require the outstanding fact/canonical checks.

### Search evidence and editorial brief

Read GSC SEO & Content Planner on 9 October for `sc-domain:ritevenue.in`, with `free_trial_full` access and no filters. The returned effective range is still **8 September–5 October 2026**, compared with **11 August–7 September 2026**: **8 clicks, 30 impressions, 26.67% CTR, average position 18.47**. The prior period has no clicks or impressions, so its position and percentage growth are not meaningful. The provider reports an approximately three-day finalization delay; this response adds no newer reporting days to the previous session's read.

No returned query establishes demand for a simple-wedding guide. Day 11 remains an **exploratory topic from the user-approved queue**, not a GSC-measured opportunity. The planning skill separates that editorial hypothesis from the small observed venue-name signals. Existing venue refresh priorities remain unchanged.

- Reader/intent: couples deciding which functions and services to include; informational intent is an editorial inference.
- Candidate query family: simple wedding planning in Bangalore; not observed in the returned GSC rows and not a search-volume claim.
- Action: add one distinct guide, preserving existing venue and guide URLs.
- Evidence: original decision framework and explicitly hypothetical example; no real venue, tariff, tradition-specific or legal claims requiring operator confirmation are introduced.
- Links/CTA: Bangalore venue collection, planning-guide directory and related guides supplied by the existing article template. No specific venue is labelled suitable without verification.
- Review owner: RiteVenue editorial / site owner. After deployment, check the URL and sitemap; review page/query impressions and clicks after approximately 28 and 56 days. Measure enquiries separately; GSC does not establish conversions.

### Day 11 release checklist

- [x] Guide and contextual Bangalore collection link implemented.
- [x] Tracker advanced without marking pending venue verification or deployment complete.
- [ ] Deploy through the normal release process.
- [ ] Confirm the live article, canonical and sitemap entry.
- [ ] Check URL Inspection; request indexing if eligible. This is not an indexing guarantee.

## Resume checkpoint — 8 October 2026

- **10/30 complete (33%), 4 partial, 16 open.** This counts implemented editorial work, not elapsed days, production releases or Google indexing.
- Day 10: added `/guides/intimate-wedding-venue-bangalore`, covering arrival, ceremony and dining routes, room changeovers, peak attendance, an itemized quote and a hypothetical 60-guest layout. It does not claim that a specific venue offers these facilities or prices.
- The new guide appears automatically in the guide index, related-guide links and sitemap. The Bangalore collection links to it directly. It remains to be deployed and checked on production.
- Next in the queue: Day 11, a simple-wedding decision guide. Days 1–2 still require operator-verified listing facts; Day 3 still needs Google's selected canonical and operator identity confirmation.

## Resume checkpoint — 7 October 2026

- **9/30 complete (30%), 4 partial, 17 open.** These are work checkpoints, not elapsed calendar days or indexed-page counts.
- Day 9: added `/guides/banquet-hall-lawn-or-resort`, comparing event layout, backup space, rooms, travel and quote scope. The 150-guest/40-stay example is explicitly hypothetical; no venue rates or facilities were invented. The existing guide directory, related-guide navigation and sitemap discover it automatically; the Bangalore hub also links to it.
- Day 12: expanded the existing capacity guide with seated versus floating definitions, operator-dependent interpretations, peak simultaneous attendance and dining questions. No competing new URL was created.
- Guide sitemap entries now use the manually maintained editorial date as `lastModified`. The dates currently represent substantial content changes; do not advance them merely for a review with no content change, a deployment or an automated run.
- Day 3 is now partial: the live Pergola `www` URL returned HTTP 200 with no redirect, title “The Pergola Venue Wedding Venue in Rajajinagar, Bangalore | RiteVenue”, H1 “The Pergola Venue”, and a canonical to the matching non-www URL. This checks the page's declared identity and canonical, not operator-confirmed facts or Google's chosen canonical. GSC Wizard inspection/audit returned `payment_required` because its trial/subscription is inactive. Use Search Console URL Inspection to finish that check; do not infer a Google canonical from the HTML tag.
- Validation: TypeScript, targeted lint, production build, existing prototype suite (including production sitemap/staging protection checks), and `git diff --check` passed. No production deployment, Search Console submission or automatic publication was performed in this batch.
- **Next work:** Day 10, intimate-wedding space and guest-flow guide; then Day 11, simple-wedding decisions. Days 1–2 await operator-verified venue facts. Day 29's downloadable worksheet and the editorial CMS/scheduler remain open work, not completed features.

### Fresh search evidence

GSC SEO & Content Planner read `sc-domain:ritevenue.in` on 7 October with `free_trial_full` access, all countries/devices and no filters. Effective range: **6 September–3 October 2026**; comparison: **9 August–5 September 2026**. Current totals: **4 clicks, 18 impressions, 22.22% CTR, average position 22.06**; comparison totals: zero clicks/impressions, so prior position is not meaningful. Finalized data has an approximately three-day delay and opportunity lists remain empty.

The additional venue-name rows include `pergola bangalore` (one impression, position 54) and `the ritvaan` (one impression, position 88); `nandi link grounds` now has three impressions at position 33.67. This is not sufficient evidence for a new keyword strategy, traffic forecast or CTR diagnosis. Preserve the original baseline below rather than confusing rolling periods with a controlled performance comparison. Day 9 is an exploratory customer-usefulness topic from the approved queue, not a measured search-volume opportunity. The GSC skill kept these recommendations separate from the observed venue-name signals; it did not publish or change account settings.

### Release checklist for this batch

- [x] Day 9 guide and Day 12 capacity update in source.
- [x] Guide directory, related links, Bangalore hub and sitemap connected.
- [ ] Deploy through the normal release process.
- [ ] Open the new guide on production and confirm its canonical URL and sitemap entry.
- [ ] Inspect the new guide in Search Console; request indexing if eligible. This does not guarantee indexing or ranking.
- [ ] Finish Pergola's Google-selected canonical check in Search Console.

## Implementation progress — 6 October 2026

The first batch covers the reusable site work behind Days 1–8 of the queue. A new Bangalore collection reads current approved venue listings and enters the sitemap only when at least three Bangalore/Bengaluru venues are published. Navigation, footer, venue details and the four existing guides now link the discovery and planning paths together. Each guide has new practical comparison questions, a visible editorial review date and Article structured data. The venue page template also directs visitors to relevant checklists.

At the end of the first batch, venue-specific facts for Lily Pond, Nandi Link Grounds and Pergola remained to be checked against their live records and operators before copy or prices were changed. Pergola's redirect and Google-selected canonical needed a live check. The admin article editor, content queue, AI-assisted drafts, scheduling, new guides and new locality/type/budget pages were not built. See the 7 October checkpoint above for subsequent progress.

Local verification for this batch: TypeScript check, production build and the prototype test suite passed. Targeted lint completed with no errors; it retains two existing warnings about unoptimized venue images. A post-deployment live audit returned HTTP 200, indexable, and self-canonical for the Bangalore collection; the live sitemap contained it. Search Console had not yet recorded a crawl of that new URL when inspected on 6 October.

## 1. Decision

Build a Bengaluru-first wedding discovery system with three connected layers: curated venue collection pages, detailed individual venue listings, and useful planning guides. Add an editorial workspace that supports manual writing/import, AI-assisted drafts, review, and scheduled publication.

The Agoda reference demonstrates destination navigation and a city guide library. Adapt those relationships to weddings; a large footer alone is not evidence of why another site ranks. Start with the locations and venue types RiteVenue can actually serve, then expand with inventory and search evidence.

Recommended operating cadence: prepare one draft or substantial refresh daily; initially publish three reviewed articles per week. Enable one approved publication daily when there is a reliable queue of at least seven distinct, verified pieces. Frequency is an operational choice, not a Google ranking requirement.

## 2. Verified baseline and limits

Both GSC Wizard and GSC SEO & Content Planner successfully read `sc-domain:ritevenue.in` with owner access. Content Planner initially returned authentication prompts, but the property and planning-data reads subsequently succeeded.

- Effective reporting range: 5 September–2 October 2026; comparison: 8 August–4 September 2026.
- All countries and devices; no optional segment or impression filter requested.
- 4 clicks, 14 impressions, 28.57% CTR, average position 15.36.
- Previous period: zero clicks and impressions. Its position value of zero does not represent an actual prior ranking, so position-change calculations are not meaningful.
- Wizard reports settled data through 3 October, but the returned performance range ends on 2 October. The figures above describe only that returned range.
- Content Planner access: `free_trial_full`, comparisons available; no trial dates returned. Wizard used the live GSC API.
- Four returned query rows cover only five impressions and no clicks. Query/page breakdowns need not reconcile with property totals; do not infer missing queries or add page impressions to the site total.
- The returned opportunity lists are empty. This very small sample does not support confident CTR diagnosis, keyword difficulty, traffic forecasts, market search volumes, or ranking deadlines.

Observed queries:

| Exact query | Clicks | Impressions | Average position | Appropriate action |
| --- | ---: | ---: | ---: | --- |
| lily pond bangalore | 0 | 1 | 46 | Improve the existing Lily Pond listing; do not create a competing venue-name blog |
| the lily pond | 0 | 1 | 43 | Cover natural name variations on that same listing |
| nandi link grounds | 0 | 2 | 34 | Improve the existing Nandi listing and useful links into it |
| venues online | 0 | 1 | 28 | Broad, weakly relevant signal; not a reason to commission an article |

Observed pages:

- `https://ritevenue.in/venues/the-lily-pond-balagere-bengaluru-7600zc87vqvvt1h5j648f60ct`: 1 click, 8 impressions, 12.5% CTR, position 14 across its reported queries.
- `https://ritevenue.in/venues/nandi-link-grounds-the-amara-nayanda-halli-bengaluru-13lptrhn8gxbwsgi2wqgo7ip8`: 0 clicks, 4 impressions, position 19.5.
- `https://www.ritevenue.in/venues/the-pergola-venue-rajajinagar-bengaluru-74uawvfqy83wa4m0avmrbxedf`: 2 clicks, 3 impressions, position 7. Maintain and verify; three impressions are not proof of a repeatable winning pattern.
- Both www and non-www homepage URLs appear in the historical report. Audit consolidation, but this alone does not prove the current redirect or canonical is broken.

Search Console read `https://ritevenue.in/sitemap.xml` on 4 October at 23:34 UTC with 19 submitted URLs, zero errors and zero warnings. Its returned `indexed: 0` field is not a reliable site-wide indexing count, particularly alongside actual search impressions. Use URL Inspection and Page Indexing for that question.

The initial code inspection found four guides in `lib/guides.ts`, generated guide/venue sitemap entries, venue metadata and related venue links. Guides remain code-managed, with no content editor or publication scheduler. The initial footer had no Planning guides link, and guide articles had no review date or Article JSON-LD; the first implementation batch addresses those presentation gaps.

Direct public HTTP checks were unavailable from the tools used. Live inventory count, current host redirects, rendered metadata and field performance have not been independently verified here. The earlier eight-venue count is historical, not a current audit result.

## 3. Page architecture and keyword ownership

Each search intent has one primary destination. Keywords below, apart from the exact GSC queries above, are editorial hypotheses to validate; they are not measured search-volume claims.

| Layer | Example target intent | Proposed URL or existing location | Publication condition |
| --- | --- | --- | --- |
| Brand/home | RiteVenue, wedding venue discovery | `/` | Brand introduction and navigation to collections |
| City collection | wedding venues in Bangalore | `/wedding-venues/bangalore` | Useful current inventory and original city guidance |
| Locality collection | wedding halls in Rajajinagar | `/wedding-venues/bangalore/areas/rajajinagar` | Enough distinct venues to make comparison useful |
| Venue type | wedding lawns in Bangalore | `/wedding-venues/bangalore/types/lawns` | Verified lawn classification and useful selection |
| Guest-count collection | wedding venues for 300 guests in Bangalore | `/wedding-venues/bangalore/guests/300` | Clear seated/floating layout and capacity interpretation |
| Venue-rental budget | venue rental under a stated budget | Curated budget collection, once prices are verified | Comparable rental duration, taxes and mandatory charges |
| Planning budget | how to plan a wedding within a chosen total budget | `/guides/<descriptive-slug>` | Explicit guest count, event scope and sourced assumptions |
| Individual venue | lily pond bangalore | Existing `/venues/<current-slug>` | Keep current URL and improve that listing |
| Wedding style/function | intimate wedding, reception, engagement, destination wedding | A guide first; a collection when inventory warrants it | Distinct practical need and verified venue suitability |

Use Bangalore in suitable search titles and mention Bengaluru naturally. Do not build duplicate Bangalore/Bengaluru pages. Preserve the current venue URLs and existing four guide URLs; descriptive slugs with stable identifiers do not require wholesale migration.

Start with one Bangalore hub and at most two or three useful subcollections. As an internal launch rule, aim for at least three genuinely relevant listings per collection plus original comparison guidance; this is a product-quality rule, not a Google minimum. A city/type with only one useful listing is usually better represented by that listing and a guide section until coverage grows. Do not manufacture rankings such as “Top 10” when there are fewer verified choices.

Mysore can follow when inventory supports useful comparisons. Coorg and other destinations remain research/onboarding opportunities until RiteVenue has relevant coverage. Do not generate the entire city × type × capacity × budget combination space. Ordinary filter combinations should stay user tools; only selected, substantive collections become indexable landing pages.

## 4. Content families

| Family | Initial topics | Customer decision supported |
| --- | --- | --- |
| Location | Bangalore venue guide; Rajajinagar, Whitefield and Balagere planning considerations | Where guests can reach and which real venues fit |
| Venue type | Banquet hall vs lawn vs resort; convention centre; hotel wedding | Space, weather backup, accommodation and service needs |
| Guest count | Intimate wedding; seating vs floating capacity; dining batches | Whether the actual layout works |
| Budget | Complete quote comparison; venue-only vs whole-wedding budget; per-plate totals | Comparable costs and clear inclusions |
| Style and function | Simple wedding, traditional celebration, reception, engagement, mehendi/sangeet | Event-specific layout and timing |
| Premium experience | Resort wedding, guest accommodation, multi-event planning | What added services and logistics are needed |
| Practical planning | Venue visits, deposits, overtime, catering questions, accessibility, rain backup | Questions to resolve before committing |

Use Budget-friendly, Mid-range, Premium and Luxury as descriptive browsing labels rather than “poor/rich.” Keep wedding size, spending and style separate: an intimate wedding may be premium; a traditional wedding may be modest or elaborate.

Exact budget scenarios such as ₹5 lakh, ₹10 lakh and ₹20 lakh can be researched as planning guides, but must not be presented as verified Bangalore package prices. Each requires guest count, number of events, date/season assumptions, venue rental, food, decor, accommodation, taxes, contingency and exclusions. Separate “venue rental under ₹X” from “entire wedding under ₹X.” Unknown prices stay price-on-request and must not qualify a venue for a budget collection. Free-text tariffs alone cannot reliably drive price filters; introduce reviewed structured price metadata if these collections are built.

Tradition-specific articles should be written or reviewed by someone familiar with the relevant customs, acknowledge variation among families, and avoid assuming that a venue permits a ritual, fire, menu or late event without confirmation.

## 5. First priorities and article briefs

1. **Refresh Lily Pond.** Evidence: two exact name queries at positions 43/46, each with one impression; its page has eight impressions. Commercial/navigational intent is an inference. Use the existing listing for venue identity, Balagere/Bangalore location, actual layout/capacity, access hours, current rental basis, catering, policies, photos and enquiry CTA. Link from the Bangalore hub and a relevant outdoor-venue guide. Do not invent price or availability. Review page/query impressions and clicks after 28 and 56 days.
2. **Refresh Nandi Link Grounds – The Amara.** Evidence: `nandi link grounds`, two impressions, position 34; its page has four impressions. Keep identity/name variations on the current page. Verify spaces, capacities, parking, rental scope and contact/enquiry flow. Link from the appropriate city/type guide. Use the same 28/56-day review windows.
3. **Verify the Pergola listing and canonical path.** Evidence: two clicks on three impressions under www. Preserve useful content; inspect current redirects and Google-selected canonical before deciding whether anything needs correction. Do not treat this tiny CTR sample as a title-writing experiment.
4. **Build the Bangalore collection.** Foundational recommendation supported by the product scope, not proven demand in these GSC rows. Own the city-level commercial intent, with genuine listings, filters, area/type navigation and concise comparison advice. Homepage should introduce RiteVenue rather than duplicate this collection word for word.
5. **Refresh the four existing guides.** These are a reusable code asset; no guide performance rows were returned, which does not establish that they are unindexed. Improve examples, relevant venue links, authorship and useful downloadable/checklist material before duplicating their subjects.

Every new brief should record: primary intent; candidate query family and whether it is GSC-observed or exploratory; intended reader; existing URL overlap; original evidence needed; outline; venue and guide links; CTA; fact-check owner; and review date. Assign one canonical article per intent.

## 6. First 30-day editorial queue

This is a queue of daily work items, not a requirement to publish 30 articles. Editorial lead is the owner unless otherwise assigned; a venue representative verifies venue-specific facts, and a developer owns technical pages. A blocked item stays a draft. Review published articles after approximately 28 and 56 days; inspect basic crawlability immediately after release.

Status as of 11 October 2026: **12 of 30 complete (40%)**, **4 partly complete**, **14 not started**. “Complete” means the planned page or guide update exists in the code; it does not mean it is deployed or Google has indexed it. A partial item does not count toward the 12.

| Day | Status | Work item | What is done / still needed |
| --- | --- | --- | --- |
| 1 | ◐ Partial | Lily Pond listing | Shared venue-to-guide links added; verify and refresh this venue's specific facts and copy |
| 2 | ◐ Partial | Nandi Link Grounds listing | Shared venue-to-guide links added; verify and refresh this venue's specific facts and copy |
| 3 | ◐ Partial | Pergola identity and canonical check | Live www page returns 200, no redirect, with non-www canonical and matching venue title/H1; Google-selected canonical and operator identity verification remain pending |
| 4 | ✅ Done | Bangalore venue collection | Live page built with approved listings, comparison guidance and conditional sitemap inclusion |
| 5 | ✅ Done | Bengaluru wedding venue checklist | Existing guide expanded with visit questions and internal links |
| 6 | ✅ Done | Compare an itemized rental quote | Existing guide expanded with a quote comparison worksheet |
| 7 | ✅ Done | Indoor or outdoor wedding venue | Existing guide expanded with a specific fallback comparison |
| 8 | ✅ Done | Guest count and venue capacity | Existing guide expanded with layout questions and a worked example |
| 9 | ✅ Done | Banquet hall, lawn or resort? | New comparison guide written, connected to Bangalore hub, guide directory and sitemap; local, pending deployment |
| 10 | ✅ Done | An intimate Bangalore wedding: space and guest-flow checklist | New guide and worked 60-guest layout added; linked from the Bangalore collection; local production check pending |
| 11 | ✅ Done | A simple wedding: decide what to keep, simplify or skip | New decision guide, hypothetical example and scope checklist; linked from Bangalore collection and existing guide/sitemap system; deployment pending |
| 12 | ✅ Done | Seating capacity versus floating capacity | Existing capacity guide now explains both interpretations of floating, peak attendance and a worked example; local, pending deployment |
| 13 | ✅ Done | Rajajinagar venue comparison and visit planning | Two live listings verified; conditional visit-planning section and direct listing links added to the Bangalore collection, locally pending deployment; no thin standalone area URL |
| 14 | ✅ Done | A 300-guest event: ceremony and dining layout questions | Worked example added to Day 8 guide |
| 15 | ☐ Open | What a whole-wedding budget includes | Write and review a new guide |
| 16 | ☐ Open | ₹5 lakh scenario worksheet | Research assumptions and add to Day 15 guide |
| 17 | ☐ Open | ₹10 lakh scenario worksheet | Research assumptions and add to Day 15 guide |
| 18 | ☐ Open | Premium wedding planning: what changes the budget? | Write distinct service/logistics guide if evidence supports it |
| 19 | ☐ Open | Per-plate catering: compare the complete food bill | Obtain real quote examples and write guide |
| 20 | ☐ Open | Outside caterers: questions to ask the venue | Verify permissions and write guide |
| 21 | ☐ Open | 24-hour rental versus a shorter event slot | Use real published slot examples in a new guide |
| 22 | ✅ Done | Outdoor celebrations: rain and indoor backup | Existing indoor/outdoor guide now asks for a full backup layout and terms |
| 23 | ☐ Open | Hotels, lawns and halls around Whitefield/Balagere | Research inventory before publishing a comparison |
| 24 | ☐ Open | Reception and engagement layouts | Write if this adds distinct advice |
| 25 | ☐ Open | Resort wedding versus city wedding | Write travel, rooms and event logistics comparison |
| 26 | ☐ Open | Mysore wedding planning | Research inventory and local facts first |
| 27 | ☐ Open | Questions about deposits, cancellation and overtime | Write practical guide using accurate contract examples |
| 28 | ☐ Open | Parking, access and guest transport | Write guide with verified examples |
| 29 | ◐ Partial | Venue visit worksheet | Visit checklist exists in Day 5 guide; make a reusable/downloadable worksheet |
| 30 | ☐ Open | Performance and content review | Review GSC and enquiry outcomes after the first content cycle |

This produces approximately 10–12 new substantive guides, four guide refreshes and a small number of collections/listing improvements, depending on available evidence. Scale after results and editorial capacity support it. Do not pad articles to a fixed word count.

## 7. Internal linking and footer design

- Add Planning guides to visible navigation and the footer.
- Organize footer links into Wedding locations, Venue types, Budget & planning, and Wedding guides. Start with roughly 12–20 useful links and a Browse all link; use accessible, compact groups on mobile.
- Publish only links to real, useful pages. No placeholder destinations or automatically enumerated filter combinations.
- Each guide should link to its relevant collection, a small number of genuinely suitable listings, complementary guides, and the appropriate enquiry form.
- Listings should link back to their city/type collection and useful planning articles. Collections should explain selection criteria and link directly to listings.
- Use natural link text. A contextual “compare outdoor venue layouts” link is useful; repeating the same exact keyword everywhere is unnecessary.

## 8. Admin content workflow and daily automation

Extend the existing Cloudflare Worker/D1/R2 application. Retain `/guides/<slug>` and migrate the four existing records without URL changes.

Proposed workflow: idea → brief → draft → needs review → approved → scheduled → published. A published article gets editable revisions, preview, rollback and an archive/unpublish action.

Admin tools:

- Create an article manually or paste/import Markdown/plain text; upload a licensed cover image.
- Generate a draft from an approved brief and a selected set of verified venue facts/sources.
- Edit sections, tables, FAQs, internal links, SEO title, description and image alt text.
- View preview and desktop/mobile presentation; compare revisions.
- Record author, reviewer, sources, price verification date, publication date and actual modification date.
- Schedule in Asia/Kolkata time; see the queue and failed jobs.

Suggested implementation records: articles, article revisions, briefs, source records, media references and generation/publication jobs. An article includes unique slug, title, excerpt, content blocks, intent/category, city/locality/type tags, associated venue IDs, source evidence, SEO fields, author/reviewer, status and timestamps. Keep editorial budget tags separate from verified listing prices.

Daily operating proposal:

1. At 09:00 IST, select one unused approved brief and produce a draft or revision. Use a bounded API budget and only approved source material.
2. Run checks for topic overlap, missing claims/sources, invalid links, invented prices, inappropriate venue matches, unsafe markup and image rights. Surface failures in admin.
3. The editor reviews and schedules the piece. An approved seven-day queue allows the team to review in batches.
4. At the chosen publication time, automatically release only the approved revision. If no approved article exists, skip the slot and show a dashboard notice.
5. On release, update sitemap inclusion and genuine last-modified time, refresh relevant collection/guide links and invalidate the affected cache.
6. Review GSC weekly and feed observed opportunities back into briefs. Update existing pages when the intent already has a good URL.

Manual publishing needs no AI connection. Automatic generation needs a server-side AI provider key and usage cap. A Cloudflare Cron Trigger/queue or another explicitly chosen scheduler can run this reliably. Store job keys so retries do not create duplicate posts, and make publication atomic to the approved revision. On editing a scheduled article, require approval of the changed revision. Log failures and retain drafts. Sanitize imported/generated content and keep drafts outside public routes/sitemaps.

The GSC plugins provide search evidence; they are not the website CMS or a daily blog publishing service. No scheduler has been enabled by this planning request.

## 9. Technical and trust work

- Verify HTTPS/www redirects, self-canonicals and internal links against `https://ritevenue.in`, the code's configured canonical origin. Check a homepage, a guide and an established venue URL.
- Keep existing successful URLs stable. Use permanent redirects only for an actual move or consolidation.
- Include only published canonical pages in the sitemap. Do not report a new modification date merely because a build or generation job ran.
- Add visible authorship, review/source dates, relevant About/editorial/contact information and accurate Article/Breadcrumb structured data. Structured data is not a ranking or rich-result guarantee. Do not invent ratings or mark up a published venue listing as a scheduled wedding event.
- Ensure server-rendered article/collection content, meaningful headings, useful image alt text, compressed responsive photos, explicit image dimensions, accessible controls and acceptable mobile performance.
- Define filter URL crawl/index behavior before adding many filters. Do not combine a robots crawl block with an expectation that Google will read a noindex on the blocked page.
- Verify Cloudflare permits legitimate Google crawling of public content and sitemap URLs while private owner/admin routes remain private.
- Add article → listing → enquiry attribution, counting successful enquiries rather than button clicks alone. GSC cannot report conversions. GSC Wizard currently returns no linked GA4 property; that does not establish whether any analytics code is installed elsewhere.
- Seek genuine links from participating venues' official sites and relevant local partners when they find RiteVenue useful. Do not buy links, copy competitors' articles, invent reviews or use synthetic images as evidence of real venue facilities.

## 10. Delivery sequence and measurement

| Period | Deliverables | Review |
| --- | --- | --- |
| Weeks 1–2 | Confirm technical baseline, improve observed venue pages, add guide navigation, create Bangalore collection and CMS foundation | Crawl/index status for priority URLs; successful enquiry tracking |
| Weeks 3–4 | Migrate four guides, publish first reviewed queue, add evidence-supported type/locality collections | URL indexing, new query discovery, article-to-venue navigation |
| Month 2 | Daily drafting, approved scheduled publishing, source/date upkeep and internal linking | Compare successive settled 28-day periods; separate RiteVenue-brand, venue-name and generic discovery intent |
| Month 3 | Refresh productive pages, consolidate overlapping topics, expand only where inventory and demand warrant | Qualified organic enquiries, useful indexed pages, non-brand clicks and staff content-maintenance cost |

Track Google clicks/impressions/CTR/position by page family and query intent, useful published vs indexed URLs, first crawl/index timing, listing visits from guides and qualified enquiry submissions. Use baseline absolute counts while volumes remain tiny. Do not use the current 28.57% CTR as a target or assume that publishing every day will yield a predictable number of enquiries.

For planning, weekly checks catch technical regressions; editorial performance reviews at 28 and 56 days guide changes. These are review windows, not promises of ranking improvement. The next query brief should be selected from fresh finalized GSC evidence whenever sufficient data exists.

## Sources and evidence

- Authorized GSC SEO & Content Planner planning-data read, 7 October 2026; live public Pergola HTTP headers and HTML title/H1/canonical read the same session. GSC Wizard audit and inspection were unavailable due to subscription status.
- [Google sitemap last-modified guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): reflect significant content updates rather than build dates.
- Authorized GSC Wizard reads: list_sites, get_site_summary, query_top_queries, query_top_pages and list_sitemaps, accessed 6 October 2026.
- Authorized GSC SEO & Content Planner: list_gsc_properties and get_gsc_seo_planning_data for RiteVenue, accessed 6 October 2026. Its planning method supplied the separation between observed page opportunities and exploratory topics.
- Local implementation reviewed: `lib/guides.ts`, `lib/venue-seo.ts`, `lib/launch.ts`, `app/guides/[slug]/page.tsx`, `app/sitemap.ts`, `app/robots.ts`, `components/header.tsx`, and `docs/ARCHITECTURE.md`.
- [Agoda Bengaluru guide hub](https://www.agoda.com/travel-guides/india/bengaluru/): an example of destination/category organization, not evidence of ranking causation.
- [Google guidance on AI-assisted content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content): useful automation is compatible with search; mass pages without added value can violate spam policy.
- [Canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- [Faceted navigation guidance](https://developers.google.com/crawling/docs/faceted-navigation).
- [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article).
