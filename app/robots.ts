import type {MetadataRoute} from 'next';
import {SITE_ORIGIN,publicIndexingEnabled} from '@/lib/launch';
export default function robots():MetadataRoute.Robots{if(!publicIndexingEnabled())return {rules:{userAgent:'*',disallow:'/'} };return {rules:{userAgent:'*',allow:['/','/api/public/image'],disallow:['/api/','/admin','/owner','/caterer','/catering','/bookings','/checkout','/requests']},sitemap:SITE_ORIGIN+'/sitemap.xml'};}
