'use client';

import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {budgetOptions,foodOptions,helpOptions,plannerOptions,enquiryStatuses,planningToday,type EnquiryRow,type EnquiryStatus,type EnquiryEvent} from '@/lib/wedding-enquiries';

async function api<T>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch('/api/wedding-enquiries'+path,{...options,cache:'no-store'});
 const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'The enquiry could not be loaded.');return result as T;
}
function dateTime(value:string){return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value));}

function EnquiryCard({row,onChanged}:{row:EnquiryRow;onChanged:()=>void}){
 const [status,setStatus]=useState<EnquiryStatus>(row.status),[coordinator,setCoordinator]=useState(row.coordinator),[followUpOn,setFollowUpOn]=useState(row.followUpOn),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState<EnquiryEvent[]|null>(null),[historyBusy,setHistoryBusy]=useState(false);
 async function save(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{await api('',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.id,expectedRevision:row.revision,status,coordinator,followUpOn,note})});onChanged();}catch(e){setError(e instanceof Error?e.message:'Could not save the update.');}finally{setBusy(false);}}
 async function loadHistory(){setHistoryBusy(true);setError('');try{setHistory((await api<{events:EnquiryEvent[]}>('?id='+row.id)).events);}catch(e){setError(e instanceof Error?e.message:'Could not load history.');}finally{setHistoryBusy(false);}}
 const data=row.data;
 return <article className="enquiry-card">
  <span className="tag">{enquiryStatuses[row.status]}</span><h2>{data.name}</h2><p className="muted">Received {dateTime(row.createdAt)} IST · Reference {row.id}</p>
  <div className="enquiry-contact"><a href={'tel:'+data.phone}>{data.phone}</a>{data.email&&<a href={'mailto:'+data.email}>{data.email}</a>}<strong>Prefers {data.contactMethod==='whatsapp'?'WhatsApp':'a phone call'}</strong></div>
  <dl className="enquiry-facts">
   <div><dt>Location</dt><dd>{data.location}</dd></div><div><dt>Wedding date</dt><dd>{data.datePreference==='exact'?data.eventDate:data.datePreference==='month'?data.eventMonth+' (approximate month)':'Flexible / not decided'}</dd></div>
   <div><dt>Guests & food</dt><dd>{data.guests.toLocaleString('en-IN')} guests · {foodOptions[data.food]}</dd></div><div><dt>Assistance</dt><dd>{helpOptions[data.help]} · Planner: {plannerOptions[data.planner]}</dd></div>
   <div><dt>Budget</dt><dd>{budgetOptions[data.budget]} · {data.budgetScope==='venue'?'Venue only':'Whole wedding'}</dd></div><div><dt>Coordinator & follow-up</dt><dd>{row.coordinator||'Unassigned'} · {row.followUpOn||'Not scheduled'}{row.followUpOn&&row.followUpOn<planningToday()&&!['booked','closed'].includes(row.status)?' (overdue)':''}</dd></div>
  </dl>
  {data.notes&&<><h3>Couple’s requirements</h3><p className="enquiry-note">{data.notes}</p></>}
  <p className="muted">Enquiry contact consent recorded at submission ({row.consentVersion}). Promotional consent not collected.</p>
  {(data.source||data.medium||data.campaign)&&<p className="muted">Campaign: {data.source||'—'} / {data.medium||'—'} / {data.campaign||'—'} (visitor supplied)</p>}
  <form className="enquiry-controls" onSubmit={save}>
   <label>Enquiry stage<select value={status} disabled={busy} onChange={e=>setStatus(e.target.value as EnquiryStatus)}>{Object.entries(enquiryStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label>Assigned coordinator<input value={coordinator} maxLength={100} disabled={busy} onChange={e=>setCoordinator(e.target.value)} placeholder="Team member’s name"/></label>
   <label>Next follow-up date<input type="date" value={followUpOn} disabled={busy} onChange={e=>setFollowUpOn(e.target.value)}/></label>
   <label className="wedding-wide">Internal follow-up note<textarea value={note} minLength={5} maxLength={2000} required disabled={busy} onChange={e=>setNote(e.target.value)} placeholder="What was discussed, or why this enquiry is changing stage"/></label>
   <p className="muted wedding-wide">“Booked” records an arrangement your team has confirmed separately. It does not reserve venue inventory or collect payment.</p>
   <button className="primary" disabled={busy}>{busy?'Saving…':'Save follow-up'}</button>
  </form>
  {error&&<p className="error" role="alert">{error}</p>}
  <button className="text-button" disabled={historyBusy} onClick={()=>history?setHistory(null):void loadHistory()}>{historyBusy?'Loading history…':history?'Hide history':'View follow-up history'}</button>
  {history&&(history.length?<><p className="muted">Most recent 100 updates · Times shown in IST</p><ol className="enquiry-history">{history.map(event=><li key={event.id}><strong>{enquiryStatuses[event.status]}</strong> · {dateTime(event.created_at)}<p className="enquiry-note">{event.note}</p><p className="muted">Coordinator: {event.coordinator||'Unassigned'} · Follow-up: {event.follow_up_on||'Not scheduled'}</p></li>)}</ol></>:<p className="muted">No follow-ups recorded yet.</p>)}
 </article>;
}

export default function WeddingEnquiryInbox(){
 const [filter,setFilter]=useState(''),[page,setPage]=useState(1),[refresh,setRefresh]=useState(0);
 const [state,setState]=useState<{rows:EnquiryRow[];hasMore:boolean;loadedKey:string;error:string}>({rows:[],hasMore:false,loadedKey:'',error:''});
 const key=`${filter}:${page}:${refresh}`,loading=state.loadedKey!==key;
 const reload=useCallback(()=>setRefresh(value=>value+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  api<{enquiries:EnquiryRow[];hasMore:boolean}>(`?status=${encodeURIComponent(filter)}&page=${page}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setState({rows:result.enquiries,hasMore:result.hasMore,loadedKey:key,error:''});}).catch(error=>{if(!controller.signal.aborted)setState({rows:[],hasMore:false,loadedKey:key,error:error instanceof Error?error.message:'Could not load enquiries.'});});
  return ()=>controller.abort();
 },[filter,page,key]);
 return <section aria-label="Wedding enquiries">
  <div className="enquiry-filter"><label>Filter by stage<select value={filter} onChange={event=>{setFilter(event.target.value);setPage(1);}}><option value="">All enquiries</option>{Object.entries(enquiryStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="filter-button" onClick={reload} disabled={loading}>Refresh inbox</button></div>
  {loading?<p role="status">Loading enquiries…</p>:state.error?<p className="error" role="alert">{state.error}</p>:<><p className="muted">Page {page} · {state.rows.length} enquiries shown · Newest first</p><div className="enquiry-list">{state.rows.length?state.rows.map(row=><EnquiryCard key={row.id+row.revision} row={row} onChanged={reload}/>):<div className="public-empty"><h2>No enquiries {filter?'at this stage':'yet'}.</h2><p>{filter?'Choose another stage or view all enquiries.':'Wedding assistance requests will appear here when couples submit the form.'}</p></div>}</div></>}
  <div className="enquiry-pagination"><button className="filter-button" disabled={loading||page===1} onClick={()=>setPage(value=>value-1)}>Previous page</button><span>Page {page}</span><button className="filter-button" disabled={loading||!state.hasMore} onClick={()=>setPage(value=>value+1)}>Next page</button></div>
 </section>;
}
