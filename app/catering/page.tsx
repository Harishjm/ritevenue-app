import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {cateringCatalog} from '@/lib/catering-server';
import {indiaToday} from '@/lib/venues';
import {dateSchema} from '@/lib/booking';
import CateringExplorer from '@/components/catering-explorer';
export const dynamic='force-dynamic';
export const metadata={title:'Compare catering packages | Private pilot',robots:{index:false,follow:false}};
export default async function Catering({searchParams}:{searchParams:Promise<{venue?:string;date?:string;guests?:string}>}){const s=await searchParams;return <Protected search={s}/>;}
async function Protected({search}:{search:{venue?:string;date?:string;guests?:string}}){await requireChatGPTUser('/catering');try{const catalog=await cateringCatalog();const date=dateSchema.safeParse(search.date);return <main className="content-page"><CateringExplorer initialCatalog={catalog} initialVenue={catalog.venues.some(v=>v.slug===search.venue)?search.venue!:''} initialDate={date.success?date.data:indiaToday()} initialGuests={Math.max(1,Math.min(2000,Math.floor(Number(search.guests)||100)))} today={indiaToday()}/></main>;}catch{return <main className="content-page"><h1>Catering is temporarily unavailable</h1><p>Please refresh to try again.</p><a href="/" className="primary">Back to venues</a></main>;}}
