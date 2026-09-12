import {notFound} from 'next/navigation';
import {z} from 'zod';
import {ShieldCheck} from 'lucide-react';
import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {db} from '@/lib/db';
import {isAdmin} from '@/lib/demo-server';
import {money} from '@/lib/venues';
import type {Quote} from '@/lib/booking';
import QuoteBreakdown from '@/components/quote-breakdown';
import ReceiptActions from '@/components/receipt-actions';
export const dynamic='force-dynamic';
export const metadata={title:'Demo booking confirmation',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();return <Receipt id={id}/>;}
async function Receipt({id}:{id:string}){const user=await requireChatGPTUser('/bookings/'+id);const row=await db().prepare('SELECT * FROM demo_bookings WHERE id=?').bind(id).first<{user_id:string;quote_json:string;created_at:string}>();if(!row||(row.user_id!==user.userId&&!isAdmin(user)))notFound();const q:Quote=JSON.parse(row.quote_json);return <main className="content-page narrow receipt"><nav className="receipt-navigation" aria-label="Booking navigation"><a href="/" className="filter-button">← Back to venues</a><a href="/bookings" className="filter-button">My bookings</a></nav><p className="eyebrow">SIMULATED BOOKING CONFIRMATION</p><div className="receipt-lock"><ShieldCheck size={38}/><div><h1>Price locked.</h1><p>Demo date confirmed. No money collected.</p></div></div><div className="receipt-reference">Reference: {id}<br/>Confirmed: {new Date(row.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</div><h2>{q.venueName}</h2><p>{q.locality}, Bengaluru · Fictional venue</p><dl className="receipt-facts"><div><dt>Event date</dt><dd>{q.date}</dd></div><div><dt>Venue access</dt><dd>{q.packageName} · {q.hours} IST</dd></div><div><dt>Guests</dt><dd>{q.guests}</dd></div></dl><QuoteBreakdown quote={q}/><div className="notice"><strong>Remaining balance: {money(q.balance/100)}</strong><br/>In the proposed live workflow, this is paid directly to the venue owner outside RiteVenue. No balance collection is offered here.</div><p className="muted">{q.terms}</p><ReceiptActions id={id} quote={q}/><nav className="receipt-navigation" aria-label="Continue browsing"><a href="/" className="primary">Return to home</a><a href="/bookings" className="filter-button">My bookings</a></nav></main>;}
