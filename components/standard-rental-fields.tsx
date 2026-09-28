"use client";
import type {Pricing} from '@/lib/booking';
import type {ListingPricing,PackageAvailability,PackageTimings} from '@/lib/standard-rentals';
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
function toDisplayAmount(amount: number | null) {
  return amount !== null && amount > 0 ? amount / 100 : "";
}
export default function PricingFields<T extends ListingPricing>({
  value,
  onChange,
  availability,
  onAvailabilityChange,
  timings,
  onTimingsChange,
}: {
  value: T;
  onChange: (p: T) => void;
  availability?: PackageAvailability;
  onAvailabilityChange?: (next: PackageAvailability) => void;
  timings?: PackageTimings;
  onTimingsChange?: (next: PackageTimings) => void;
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
        const status = rental ? availability?.[rental]??'available' : "available";
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
                  <option value="price_on_request">Available — price on request</option>
                  <option value="not_applicable">
                    Not applicable — package not offered
                  </option>
                  <option value="not_available">
                    Not available — currently not offered
                  </option>
                </select>
              )}
              {status !== 'price_on_request' && <input
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
              />}
            </label>
            {status==='price_on_request'&&<p className="muted">No rental amount needed. Guests will see “Price on request” and can send an enquiry.</p>}
            {rental&&timings&&onTimingsChange&&(status==='available'||status==='price_on_request')&&<div className="package-slot-fields">
              <label>Start time<input type="time" aria-label={`${labels[k]} start time`} value={timings[rental].start} required onChange={e=>{if(e.target.value)onTimingsChange({...timings,[rental]:{...timings[rental],start:e.target.value}});}}/></label>
              <label>End time<input type="time" aria-label={`${labels[k]} end time`} value={timings[rental].end} required onChange={e=>{if(e.target.value)onTimingsChange({...timings,[rental]:{...timings[rental],end:e.target.value}});}}/></label>
              <label>Ends on<select aria-label={`${labels[k]} end day`} value={timings[rental].nextDay?'next':'same'} onChange={e=>onTimingsChange({...timings,[rental]:{...timings[rental],nextDay:e.target.value==='next'}})}><option value="same">Same day</option><option value="next">Next day</option></select></label>
            </div>}
          </div>
        );
      })}
    </div>
  );
}
