'use client';
import {useState} from 'react';
import type {Quote} from '@/lib/booking';
import {savedWindow} from '@/lib/booking';
import {indiaToday} from '@/lib/venues';
import {cateringApi} from '@/lib/catering-client';
import type {CateringCatalog} from '@/lib/catering-server';
import CateringExplorer from '@/components/catering-explorer';
import CateringSummary from '@/components/catering-summary';
export default function CheckoutCatering({holdId,quote}:{holdId:string;quote:Quote}){
 const [open,setOpen]=useState(false),[catalog,setCatalog]=useState<CateringCatalog|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const revision=quote.cateringRevision||null;
 async function show(){setOpen(true);setBusy(true);setError('');try{setCatalog(await cateringApi<CateringCatalog>('catalog'));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function proceed(){setOpen(false);document.getElementById('venue-confirmation')?.scrollIntoView({behavior:'smooth'});}
 async function remove(){setBusy(true);setError('');try{await cateringApi('attach',{holdId,expectedRevision:revision,selection:null});window.location.assign('/checkout/'+holdId+'#venue-confirmation');}catch(e){setError((e as Error).message);setBusy(false);}}
 return <section aria-labelledby="optional-catering-heading" className="owner-editor"><p className="eyebrow">OPTIONAL · FOOD FOR YOUR EVENT</p><h2 id="optional-catering-heading">Would you like to add catering?</h2><p>Choose a compatible menu for this venue, or continue with your venue booking alone.</p>{quote.cateringEstimate&&<CateringSummary estimate={quote.cateringEstimate}/>}<div className="workspace-actions"><button type="button" className="primary" disabled={busy} onClick={show}>{quote.cateringEstimate?'Change catering menu':'Choose catering'}</button>{quote.cateringEstimate?<><button type="button" className="filter-button" disabled={busy} onClick={remove}>Remove catering & continue</button><button type="button" className="filter-button" disabled={busy} onClick={proceed}>Keep selection & continue</button></>:<button type="button" className="filter-button" disabled={busy} onClick={proceed}>Skip catering · Continue with venue</button>}</div>{busy&&<p role="status">Loading…</p>}{error&&<div className="error" role="alert">{error}</div>}{open&&catalog&&<CateringExplorer initialCatalog={catalog} initialVenue={quote.venueSlug} initialDate={quote.cateringEstimate?.date||quote.date} initialGuests={quote.guests} today={indiaToday()} booking={{holdId,revision,startsOn:quote.date,endsOn:savedWindow(quote,quote.date).endsAt.slice(0,10)}}/>}<p className="muted">Your existing venue hold keeps its expiry time. Adding catering saves an estimate only; the venue advance stays unchanged.</p></section>;
}
