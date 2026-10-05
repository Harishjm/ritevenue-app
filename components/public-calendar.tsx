"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import { indiaToday } from "@/lib/venues";
import { shiftDate, validDate } from "@/lib/booking";
import { publicDateStatus, type Publication } from "@/lib/publication";
import {enquiryDisplayCode} from '@/lib/enquiry-code';
export default function PublicCalendar({
  slug,
  initialCalendar,
  initialUpdatedAt,
  source = "owner",
}: {
  slug: string;
  initialCalendar: Publication["calendar"];
  initialUpdatedAt: string;
  source?: Publication["source"];
}) {
  const enquiryTrigger=useRef<HTMLButtonElement|null>(null);
  const [month, setMonth] = useState(indiaToday().slice(0, 7)),
    [calendar, setCalendar] = useState(initialCalendar),
    [updated, setUpdated] = useState(initialUpdatedAt),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [enquiryDate, setEnquiryDate] = useState(""),
    [enquiryState, setEnquiryState] = useState<"idle" | "sending" | "sent">("idle"),
    [enquiryError, setEnquiryError] = useState(""),
    [enquiryReference, setEnquiryReference] = useState("");
  async function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setEnquiryState("sending");
    setEnquiryError("");
    try {
      const response = await fetch("/api/venue-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: crypto.randomUUID(),
          venueSlug: slug,
          eventDate: enquiryDate,
          name: String(fields.get("name") || ""),
          phone: String(fields.get("phone") || ""),
          email: String(fields.get("email") || ""),
          consent: fields.get("consent") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string; reference?: string };
      if (!response.ok) throw new Error(result.error || "Could not send your enquiry.");
      if (!result.reference) throw new Error("Could not confirm your enquiry. Please try again.");
      setEnquiryReference(result.reference);
      setEnquiryState("sent");
    } catch (e) {
      setEnquiryState("idle");
      setEnquiryError(e instanceof Error ? e.message : "Could not send your enquiry.");
    }
  }
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/public/calendar?venue=" + encodeURIComponent(slug),
        { cache: "no-store" },
      );
      const data = (await r.json()) as {
        calendar: Publication["calendar"];
        updatedAt: string | null;
        error?: string;
      };
      if (!r.ok) throw new Error(data.error || "Calendar unavailable");
      setCalendar(data.calendar);
      setUpdated(data.updatedAt || "");
    } catch (e) {
      setCalendar(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [slug]);
  const first = month + "-01",
    days = validDate(first)
      ? new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)),
          0,
        ).getDate()
      : 0,
    offset = validDate(first) ? new Date(first + "T00:00:00Z").getUTCDay() : 0;
  const reporter = source === "admin" ? "RiteVenue" : "Owner";
  const labels = {
    available: reporter + " reports available",
    unavailable: reporter + " reports unavailable",
    unconfirmed: "Not confirmed",
    past: "Past date",
  };
  return (
    <section className="public-calendar" id="availability">
      <p className="eyebrow">{reporter.toUpperCase()}-REPORTED AVAILABILITY</p>
      <h2>Plan around your date.</h2>
      <p>
        Dates are reported for planning only and are not live reservations.
        Confirm the exact time and availability directly with the venue before
        making arrangements.
      </p>
      <div className="public-calendar-controls">
        <label>
          Month{" "}
          <input
            type="month"
            value={month}
            min={indiaToday().slice(0, 7)}
            max={shiftDate(indiaToday(), 365).slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <button className="filter-button" disabled={busy} onClick={refresh}>
          {busy ? "Refreshing…" : "Refresh dates"}
        </button>
      </div>
      <div className="public-calendar-legend">
        <span className="available">Enquiry dates</span>
        <span className="unavailable">Reported unavailable</span>
        <span className="unconfirmed">Not confirmed</span>
      </div>
      <div
        className="public-calendar-grid"
        role="list"
        aria-label="Venue date status"
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <strong key={d}>{d}</strong>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span aria-hidden key={"blank" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = month + "-" + String(i + 1).padStart(2, "0"),
            status = publicDateStatus(calendar, date, updated);
          return <div role="listitem" key={date} className={status} aria-label={date + ": " + labels[status]}>{status === "available" ? <button type="button" className="calendar-enquiry" onClick={(event) => { enquiryTrigger.current=event.currentTarget; setEnquiryDate(date); setEnquiryState("idle"); setEnquiryError(""); }}><strong>{i + 1}</strong><small>Enquiry</small></button> : <><strong>{i + 1}</strong><small>{status === "unavailable" ? "Unavailable" : status === "past" ? "Past" : "Unknown"}</small></>}</div>;
        })}
      </div>
      <Dialog open={!!enquiryDate} onOpenChange={open=>{if(!open&&enquiryState!=='sending')setEnquiryDate('');}}>
        <DialogContent className="venue-enquiry-dialog" showCloseButton={enquiryState!=='sending'}
          onCloseAutoFocus={event=>{event.preventDefault();enquiryTrigger.current?.focus();}}
          onEscapeKeyDown={event=>{if(enquiryState==='sending')event.preventDefault();}}
          onInteractOutside={event=>{if(enquiryState==='sending')event.preventDefault();}}>
          <DialogTitle>{enquiryState==='sent'?'Enquiry sent':`Enquire about ${enquiryDate}`}</DialogTitle>
          <DialogDescription>{enquiryState==='sent'?'Your enquiry has been received. This does not reserve the venue or date.':'Share your contact details and we’ll confirm availability with you. This is an enquiry, not a booking.'}</DialogDescription>
          {enquiryState==='sent'?<div className="venue-enquiry-success" role="status"><p>We received your enquiry for {enquiryDate}. We’ll get back to you within 1–2 hours.</p><p>Your 4-digit confirmation code:<br/><strong className="enquiry-code">{enquiryDisplayCode(enquiryReference)}</strong></p><p>For follow-up, share this code with the name and phone number or email you used.</p><button type="button" className="filter-button" onClick={()=>setEnquiryDate('')}>Back to calendar</button></div>
          :<form className="venue-enquiry-form" onSubmit={submitEnquiry}>
            <fieldset disabled={enquiryState==='sending'}>
              <label>Name<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label>
              <label>Phone number <span className="muted">or email below</span><input name="phone" type="tel" minLength={8} maxLength={24} autoComplete="tel"/></label>
              <label>Email address <span className="muted">or phone above</span><input name="email" type="email" maxLength={254} autoComplete="email"/></label>
              <label className="venue-enquiry-consent"><input name="consent" type="checkbox" required/><span>I agree that RiteVenue may contact me about this venue enquiry.</span></label>
              {enquiryError&&<p className="error" role="alert">{enquiryError}</p>}
              <button className="primary" disabled={enquiryState==='sending'}>{enquiryState==='sending'?'Sending…':'Send enquiry'}</button>
              <button type="button" className="filter-button" onClick={()=>setEnquiryDate('')}>Cancel</button>
            </fieldset>
          </form>}
        </DialogContent>
      </Dialog>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted">
        {reporter} information last updated:{" "}
        {updated
          ? new Date(updated).toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
          : "Not provided"}
        . Dates outside the supplied range, or information over seven days old,
        show as unconfirmed. Bookings and payments are not enabled.
      </p>
    </section>
  );
}
