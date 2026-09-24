"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Save, Send, ShieldCheck, RefreshCw, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { venues, venueTypes, money } from "@/lib/venues";
import { defaultPricing, pricingSchema, type Pricing } from "@/lib/booking";
import CateringPolicyEditor from "@/components/catering-policy-editor";
import {
  policySchema,
  policyLabels,
  type CateringPolicy,
} from "@/lib/catering";
import { publicationSchema, type Publication } from "@/lib/publication";
import {
  packageAvailabilitySchema,
  type PackageAvailability,
} from "@/lib/owner-venue";
import {
  PublicationFields,
  PublishedCalendarEditor,
} from "@/components/publication-fields";
import VenuePhotoPicker, {
  MIN_LISTING_PHOTOS,
  MAX_LISTING_PHOTOS,
} from "@/components/venue-photo-picker";
import { optimizeVenuePhoto } from "@/lib/optimize-venue-photo";
import { demoApi } from "@/lib/demo-client";
type Draft = {
  publication: Publication;
  cateringPolicy: CateringPolicy;
  packageAvailability: PackageAvailability;
  id: string;
  name: string;
  locality: string;
  address: string;
  type: string;
  capacity: number;
  description: string;
  pricing: Pricing;
  images: string[];
  rightsConfirmed: boolean;
  submit: boolean;
};
const blank = (): Draft => ({
  publication: publicationSchema.parse({}),
  cateringPolicy: policySchema.parse({}),
  packageAvailability: packageAvailabilitySchema.parse({}),
  id: crypto.randomUUID(),
  name: "",
  locality: "",
  address: "",
  type: "Wedding hall",
  capacity: 200,
  description: "",
  pricing: pricingSchema.parse({
    rent: 10000000,
    ac: 0,
    generator: 0,
    parking: 0,
    cleaning: 0,
  }),
  images: [],
  rightsConfirmed: false,
  submit: false,
});
const labels: Record<keyof Pricing, string> = {
  rent: "Full Day rental",
  marriageRent: "24-hour Marriage rental",
  morningRent: "Half Day Morning rental",
  eveningRent: "Half Day Evening rental",
  extraHour: "Extra hour rate",
  ac: "Mandatory AC",
  generator: "Mandatory generator",
  parking: "Mandatory parking",
  cleaning: "Mandatory cleaning",
};
function toDisplayAmount(amount: number) {
  return amount > 0 ? amount / 100 : "";
}
function preserveUnavailablePrices(
  value: Pricing,
  availability: PackageAvailability,
) {
  const next = { ...value };
  for (const key of Object.keys(availability) as (keyof PackageAvailability)[])
    if (availability[key] !== "available" && next[key] < 10000)
      next[key] = 10000;
  return next;
}
function rentalSummary(
  status: PackageAvailability[keyof PackageAvailability],
  amount: number,
) {
  return status === "available"
    ? money(amount / 100)
    : status === "not_applicable"
      ? "Not applicable"
      : "Not available";
}
function PricingFields({
  value,
  onChange,
  availability,
  onAvailabilityChange,
}: {
  value: Pricing;
  onChange: (p: Pricing) => void;
  availability?: PackageAvailability;
  onAvailabilityChange?: (next: PackageAvailability) => void;
}) {
  return (
    <div className="pricing-fields">
      {(Object.keys(labels) as (keyof Pricing)[]).map((k) => {
        const isRental = [
          "rent",
          "marriageRent",
          "morningRent",
          "eveningRent",
        ].includes(k);
        const rental = isRental ? (k as keyof PackageAvailability) : null;
        const status = rental ? availability?.[rental] : "available";
        return (
          <div key={k} className="stack-form">
            <label>
              {labels[k]} (₹)
              {rental && availability && onAvailabilityChange && (
                <select
                  aria-label={`${labels[k]} availability`}
                  value={status}
                  onChange={(e) =>
                    onAvailabilityChange({
                      ...availability,
                      [rental]: e.target
                        .value as PackageAvailability[typeof rental],
                    })
                  }
                >
                  <option value="available">Available — enter rental</option>
                  <option value="not_applicable">
                    Not applicable — package not offered
                  </option>
                  <option value="not_available">
                    Not available — currently not offered
                  </option>
                </select>
              )}
              <input
                type="number"
                min={isRental ? 100 : 0}
                step="0.01"
                max={isRental ? 1000000 : 100000}
                required={status === "available" && isRental}
                disabled={status !== "available"}
                value={status === "available" ? toDisplayAmount(value[k]) : ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next = raw === "" ? 0 : Math.round(Number(raw) * 100);
                  onChange({ ...value, [k]: next });
                }}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
export default function OwnerWorkspace({
  admin = false,
  adminView = false,
}: {
  admin?: boolean;
  adminView?: boolean;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, Pricing>>({});
  const [selectedVenue, setSelectedVenue] = useState(venues[0].slug);
  const [pricing, setPricing] = useState(defaultPricing(venues[0]));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photoProgress, setPhotoProgress] = useState({
    completed: 0,
    total: 0,
  });
  const refresh = useCallback(
    async (preservePricing = false) => {
      const data = await demoApi(adminView ? "admin" : "drafts");
      setRows(
        data.drafts.map((r: any) => ({
          ...r,
          data: {
            ...r.data,
            publication: publicationSchema.parse(r.data.publication || {}),
            cateringPolicy: policySchema.parse(r.data.cateringPolicy || {}),
            pricing: pricingSchema.parse(r.data.pricing),
            packageAvailability: packageAvailabilitySchema.parse(
              r.data.packageAvailability || {},
            ),
          },
        })),
      );
      setBookings(data.bookings || []);
      if (data.pricing && !preservePricing) setPrices(data.pricing);
      setReady(true);
    },
    [adminView],
  );
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    if (prices[selectedVenue]) setPricing(prices[selectedVenue]);
  }, [prices, selectedVenue]);
  useEffect(() => {
    if (!adminView) return;
    const t = setInterval(() => refresh(true).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [admin, refresh]);
  async function save(submit: boolean) {
    if (!draft) return;
    if (submit && draft.images.length < MIN_LISTING_PHOTOS) {
      setError("Add at least two venue photos before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await demoApi("drafts", { ...draft, submit });
      setNotice(
        submit
          ? "Submitted for final review. Use the Final listing review section below to approve and publish."
          : "Draft saved privately. Select a publication route before final review.",
      );
      setDraft(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: File[]) {
    if (!files.length || !draft) return;
    if (files.length + draft.images.length > MAX_LISTING_PHOTOS) {
      setError(
        `Choose up to ${MAX_LISTING_PHOTOS} photos per venue. Remove a photo before adding more.`,
      );
      return;
    }
    const invalid = files.find(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 15 * 1024 * 1024 ||
        file.size === 0,
    );
    if (invalid) {
      setError(`Use a JPEG, PNG or WebP photo under 15 MB: ${invalid.name}`);
      return;
    }
    setBusy(true);
    setError("");
    setPhotoProgress({ completed: 0, total: files.length });
    try {
      for (const [index, file] of files.entries()) {
        const optimized = await optimizeVenuePhoto(file);
        const position = draft.images.length + index + 1;
        const response = await fetch("/api/demo/images", {
          method: "POST",
          headers: {
            "Content-Type": "image/webp",
            "X-Venue-Id": draft.id,
            "X-Venue-Name": draft.name,
            "X-Venue-Locality": draft.locality,
            "X-Venue-City": "Bengaluru",
            "X-Photo-Position": String(position),
          },
          body: optimized.blob,
        });
        const data = (await response.json()) as { id: string; error?: string };
        if (!response.ok)
          throw new Error(data.error || `Could not upload ${file.name}.`);
        setDraft((prev) =>
          prev ? { ...prev, images: [...prev.images, data.id] } : prev,
        );
        setPhotoProgress({ completed: index + 1, total: files.length });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function review(id: string, status: string) {
    setBusy(true);
    setError("");
    try {
      await demoApi("review", {
        id,
        status,
        note: notes[id] || "",
        expectedUpdatedAt: rows.find((r) => r.id === id)?.updated_at,
      });
      setNotice(
        status === "approved_public"
          ? "Published. The venue is now visible to public visitors."
          : status === "approved_for_demo"
            ? "Approved. This venue now appears in the private venue catalog with a demo booking calendar."
            : status === "rejected"
              ? "Rejected. The venue remains private and the owner may revise and resubmit it."
              : "Changes requested. The venue remains hidden from the catalog.",
      );
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function savePricing() {
    setBusy(true);
    setError("");
    try {
      await demoApi("pricing", { venueSlug: selectedVenue, pricing });
      setNotice(
        "Demo pricing updated for new checkouts. Existing held and confirmed quotes are unchanged.",
      );
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="workspace-actions">
        {!adminView && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setDraft(blank());
              setPhotoProgress({ completed: 0, total: 0 });
              setError("");
              setNotice("");
            }}
          >
            Add venue draft
          </button>
        )}
        <button
          className="filter-button"
          disabled={busy}
          onClick={() => refresh().catch((e) => setError(e.message))}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
        {admin && !adminView && (
          <Link href="/admin" className="filter-button">
            Admin review & booking monitor
          </Link>
        )}
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <Tabs defaultValue="listings">
        <TabsList>
          <TabsTrigger value="listings">
            {adminView ? "Review listings" : "My venue drafts"}
          </TabsTrigger>
          {admin && adminView && (
            <TabsTrigger value="pricing">Demo pricing</TabsTrigger>
          )}
          {admin && adminView && (
            <TabsTrigger value="bookings">Booking monitor</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="listings">
          {draft ? (
            <form
              className="owner-editor stack-form"
              onSubmit={(e) => {
                e.preventDefault();
                save(true);
              }}
            >
              <div className="section-title">
                <h2>
                  {rows.some((r) => r.id === draft.id)
                    ? "Edit venue draft"
                    : "New venue draft"}
                </h2>
                <button
                  type="button"
                  className="icon-button"
                  title="Close editor"
                  aria-label="Close editor"
                  disabled={busy}
                  onClick={() => setDraft(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Venue name
                  <input
                    required
                    maxLength={100}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Bengaluru locality
                  <input
                    required
                    maxLength={100}
                    value={draft.locality}
                    onChange={(e) =>
                      setDraft({ ...draft, locality: e.target.value })
                    }
                  />
                </label>
                <label>
                  Venue type
                  <select
                    value={draft.type}
                    onChange={(e) =>
                      setDraft({ ...draft, type: e.target.value })
                    }
                  >
                    {venueTypes.slice(1).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Maximum guests
                  <input
                    required
                    min="1"
                    max="50000"
                    type="number"
                    value={draft.capacity}
                    onChange={(e) =>
                      setDraft({ ...draft, capacity: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <label>
                Address
                <input
                  required
                  minLength={8}
                  maxLength={400}
                  value={draft.address}
                  onChange={(e) =>
                    setDraft({ ...draft, address: e.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  required
                  minLength={40}
                  maxLength={3000}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <h3>Package rentals & mandatory charges</h3>
              <PricingFields
                value={draft.pricing}
                onChange={(pricing) => setDraft({ ...draft, pricing })}
                availability={draft.packageAvailability}
                onAvailabilityChange={(packageAvailability) =>
                  setDraft({
                    ...draft,
                    packageAvailability,
                    pricing: preserveUnavailablePrices(
                      draft.pricing,
                      packageAvailability,
                    ),
                  })
                }
              />
              <p className="muted">
                For each package, enter its rental or mark it Not applicable /
                Not available. Only available packages show a public price. All
                mandatory charges apply once per booking; zero means included.
                Starter half-day rentals are half the full-day rental; review
                these demo prices before submitting.
              </p>
              <PublicationFields
                key={draft.id}
                value={draft.publication}
                admin={admin}
                onChange={(publication) => setDraft({ ...draft, publication })}
              />
              <CateringPolicyEditor
                value={draft.cateringPolicy}
                onChange={(cateringPolicy) =>
                  setDraft({ ...draft, cateringPolicy })
                }
              />
              <label className="addon-option">
                <Checkbox
                  checked={draft.rightsConfirmed}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, rightsConfirmed: v === true })
                  }
                />
                <span>
                  I am authorized to provide these details and images for
                  review. Public display requires the selected authorization
                  route above.
                </span>
              </label>
              <VenuePhotoPicker
                count={draft.images.length}
                busy={busy}
                disabled={!draft.rightsConfirmed}
                completed={photoProgress.completed}
                total={photoProgress.total}
                onFiles={(files) => void upload(files)}
              />
              <p className="muted">
                Add 2–15 photos. Photos remain private unless the selected
                publication route is confirmed and admin publishes the listing.
              </p>
              <div className="draft-photos">
                {draft.images.map((id) => (
                  <div key={id}>
                    <img
                      src={"/api/demo/image?id=" + id}
                      alt="Uploaded venue draft"
                      width="160"
                      height="120"
                    />
                    <button
                      type="button"
                      className="icon-button"
                      disabled={busy}
                      title="Remove from draft"
                      aria-label="Remove photo from draft"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          images: draft.images.filter((i) => i !== id),
                        })
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="workspace-actions">
                <button
                  type="button"
                  className="filter-button"
                  disabled={busy || !draft.rightsConfirmed}
                  onClick={() => save(false)}
                >
                  <Save size={17} />
                  Save draft
                </button>
                <button
                  className="primary"
                  disabled={busy || !draft.rightsConfirmed}
                >
                  <Send size={17} />
                  {busy ? "Working..." : "Submit for review"}
                </button>
              </div>
            </form>
          ) : null}
          {!ready ? (
            <p role="status">Loading workspace...</p>
          ) : !rows.length ? (
            <div className="empty-state">
              <h2>
                {adminView
                  ? "No venue drafts awaiting review."
                  : "Your venue starts with a private draft."}
              </h2>
              <p>
                Upload venue information and photos. Public display requires an
                authorization route and final admin approval.
              </p>
            </div>
          ) : (
            <div className="draft-list">
              {rows.map((row) => (
                <article className="draft-item" key={row.id}>
                  <div className="section-title">
                    <div>
                      <span className="tag">
                        {row.status.replaceAll("_", " ")}
                      </span>
                      <h2>{row.data.name}</h2>
                      <p>
                        {row.data.locality} · {row.data.type} ·{" "}
                        {row.data.capacity} guests
                      </p>
                    </div>
                    <button
                      className="filter-button"
                      disabled={busy}
                      onClick={() => {
                        setDraft(row.data);
                        setPhotoProgress({ completed: 0, total: 0 });
                        setError("");
                        setNotice(
                          ["approved_for_demo", "approved_public"].includes(
                            row.status,
                          )
                            ? "Saving changes will hide this listing until admin approves it again. Existing bookings and locked quotes stay saved."
                            : "",
                        );
                      }}
                    >
                      Edit draft
                    </button>
                  </div>
                  {row.status === "approved_public" && (
                    <a href={"/venues/owner-" + row.id} className="primary">
                      View public venue & calendar
                    </a>
                  )}
                  <p>
                    <strong>
                      {
                        policyLabels[
                          row.data.cateringPolicy.mode as CateringPolicy["mode"]
                        ]
                      }
                    </strong>{" "}
                    · Catering fee:{" "}
                    {money(row.data.cateringPolicy.venueFee / 100)} · Minimum
                    food spend:{" "}
                    {money(row.data.cateringPolicy.minimumFoodSpend / 100)}
                  </p>
                  <p>{row.data.cateringPolicy.notes}</p>
                  <p className="muted">
                    Linked supplier IDs:{" "}
                    {row.data.cateringPolicy.supplierIds.join(", ") || "None"}
                  </p>
                  <p>
                    Publication route:{" "}
                    <strong>
                      {row.data.publication.source === "admin"
                        ? "Admin direct (independent rights)"
                        : "Owner approved"}
                    </strong>{" "}
                    · Confirmation:{" "}
                    <strong>
                      {row.data.publication.consent
                        ? "Recorded"
                        : "Not recorded"}
                    </strong>
                    {row.data.publication.source === "admin" &&
                      row.data.publication.authorizationNote && (
                        <span className="muted">
                          {" "}
                          · Rights record:{" "}
                          {row.data.publication.authorizationNote}
                        </span>
                      )}
                  </p>
                  <p>
                    Reported availability:{" "}
                    {row.data.publication.calendar
                      ? row.data.publication.calendar.from +
                        " to " +
                        row.data.publication.calendar.to
                      : "Not supplied"}
                  </p>
                  <p>
                    Unavailable dates:{" "}
                    {row.data.publication.calendar?.unavailable.join(", ") ||
                      "None supplied"}
                  </p>
                  {!adminView &&
                    row.status === "approved_public" &&
                    row.data.publication.source === "owner" && (
                      <PublishedCalendarEditor
                        key={row.id + row.updated_at}
                        id={row.id}
                        initial={row.data.publication.calendar}
                        updatedAt={row.updated_at}
                        onSaved={() => refresh(true)}
                      />
                    )}
                  <p>{row.data.address}</p>
                  <p>{row.data.description}</p>
                  <p>
                    24-hour Marriage:{" "}
                    {rentalSummary(
                      row.data.packageAvailability.marriageRent,
                      row.data.pricing.marriageRent,
                    )}{" "}
                    · Full Day:{" "}
                    {rentalSummary(
                      row.data.packageAvailability.rent,
                      row.data.pricing.rent,
                    )}{" "}
                    · Morning:{" "}
                    {rentalSummary(
                      row.data.packageAvailability.morningRent,
                      row.data.pricing.morningRent,
                    )}{" "}
                    · Evening:{" "}
                    {rentalSummary(
                      row.data.packageAvailability.eveningRent,
                      row.data.pricing.eveningRent,
                    )}{" "}
                    · Extra hour: {money(row.data.pricing.extraHour / 100)} ·
                    AC: {money(row.data.pricing.ac / 100)} · Generator:{" "}
                    {money(row.data.pricing.generator / 100)} · Parking:{" "}
                    {money(row.data.pricing.parking / 100)} · Cleaning:{" "}
                    {money(row.data.pricing.cleaning / 100)}
                  </p>
                  <div className="draft-photos">
                    {row.data.images.map((id: string) => (
                      <a
                        href={"/api/demo/image?id=" + id}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={id}
                      >
                        <img
                          src={"/api/demo/image?id=" + id}
                          alt={"Private draft photo for " + row.data.name}
                          width="160"
                          height="120"
                        />
                      </a>
                    ))}
                  </div>
                  {row.review_note && (
                    <div className="notice">Review: {row.review_note}</div>
                  )}
                  {adminView && row.reviews?.length > 0 && (
                    <details>
                      <summary>Review history ({row.reviews.length})</summary>
                      {row.reviews.map(
                        (
                          event: {
                            decision: string;
                            note: string;
                            created_at: string;
                          },
                          index: number,
                        ) => (
                          <p className="muted" key={event.created_at + index}>
                            <strong>
                              {event.decision.replaceAll("_", " ")}
                            </strong>{" "}
                            · {new Date(event.created_at).toLocaleString()} ·{" "}
                            {event.note}
                          </p>
                        ),
                      )}
                    </details>
                  )}
                  {adminView && row.status === "pending_review" && (
                    <div className="stack-form">
                      <label>
                        Review note
                        <textarea
                          minLength={5}
                          maxLength={1000}
                          value={notes[row.id] || ""}
                          onChange={(e) =>
                            setNotes({ ...notes, [row.id]: e.target.value })
                          }
                        />
                      </label>
                      <div className="workspace-actions">
                        <button
                          className="primary"
                          disabled={busy || !row.data.publication.consent}
                          onClick={() => review(row.id, "approved_public")}
                        >
                          <ShieldCheck size={17} />
                          Approve & publish publicly
                        </button>
                        <button
                          className="filter-button"
                          disabled={busy}
                          onClick={() => review(row.id, "changes_requested")}
                        >
                          Request changes
                        </button>
                        <button
                          className="filter-button"
                          disabled={busy}
                          onClick={() => review(row.id, "rejected")}
                        >
                          Reject submission
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </TabsContent>
        {admin && adminView && (
          <TabsContent value="pricing">
            <div className="owner-editor stack-form">
              <h2>Manage sample venue pricing</h2>
              <p>
                Changes apply to new checkout holds. Saved quotes never change.
                This editor cannot override held or booked dates.
              </p>
              <label>
                Demo venue
                <select
                  value={selectedVenue}
                  onChange={(e) => setSelectedVenue(e.target.value)}
                >
                  {venues.map((v) => (
                    <option key={v.slug} value={v.slug}>
                      {v.name} · {v.area}
                    </option>
                  ))}
                </select>
              </label>
              <PricingFields value={pricing} onChange={setPricing} />
              <button
                className="primary"
                disabled={busy || !ready}
                onClick={savePricing}
              >
                <Save size={18} />
                Save demo pricing
              </button>
            </div>
          </TabsContent>
        )}
        {admin && adminView && (
          <TabsContent value="bookings">
            <div className="notice">
              Shared booking records refresh every 5 seconds. No owner calendar
              overrides or real payment collection.
            </div>
            {!bookings.length ? (
              <div className="empty-state">
                <h2>No demo bookings yet</h2>
                <Link href="/" className="primary">
                  Try the couple booking flow
                </Link>
              </div>
            ) : (
              <div className="booking-list">
                {bookings.map((b) => (
                  <Link
                    className="booking-list-item"
                    href={"/bookings/" + b.id}
                    key={b.id}
                  >
                    <div>
                      <span className="tag">Simulated · Price locked</span>
                      <h3>{b.quote.venueName}</h3>
                      <p>
                        {b.event_date} · {b.quote.guests} guests
                      </p>
                    </div>
                    <strong>{money(b.quote.total / 100)}</strong>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
