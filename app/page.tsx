import Explore from '@/components/explore';
import {catalogPricing} from '@/lib/demo-server';
export const dynamic='force-dynamic';
export default async function Home(){try{return <Explore initialPricing={await catalogPricing()}/>;}catch{return <main className="content-page"><h1>Venue catalog temporarily unavailable</h1><p>We could not load current demo pricing. Please refresh in a moment.</p></main>;}}
