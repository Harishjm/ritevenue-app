import type {MetadataRoute} from 'next';
import {guides} from '@/lib/guides';
import {publicVenues} from '@/lib/public-venues';
import {SITE_ORIGIN} from '@/lib/launch';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const venues=await publicVenues();return [{url:SITE_ORIGIN},{url:SITE_ORIGIN+'/guides'},{url:SITE_ORIGIN+'/how-it-works'},{url:SITE_ORIGIN+'/list-your-venue'},...guides.map(g=>({url:SITE_ORIGIN+'/guides/'+g.slug})),...venues.map(v=>({url:SITE_ORIGIN+'/venues/'+v.slug,lastModified:v.updatedAt}))];}
