"use client";
import {Download,Printer} from 'lucide-react';
import type {Quote} from '@/lib/booking';
export default function ReceiptActions({id,quote}:{id:string;quote:Quote}){function download(){const url=URL.createObjectURL(new Blob([JSON.stringify({bookingId:id,status:'demo_confirmed',quote},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='RiteVenue-demo-quote-'+id.slice(0,8)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}return <div className="receipt-actions"><button className="primary" onClick={()=>window.print()}><Printer size={18}/>Print / Save PDF</button><button className="filter-button" onClick={download}><Download size={18}/>Download quote JSON</button></div>;}
