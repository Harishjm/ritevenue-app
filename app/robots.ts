import type {MetadataRoute} from 'next';
import {SITE_ORIGIN} from '@/lib/launch';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:['/','/api/public/image'],disallow:['/api/','/admin','/owner','/caterer','/catering','/bookings','/checkout','/requests','/signin-with-chatgpt','/signout-with-chatgpt','/callback']},sitemap:SITE_ORIGIN+'/sitemap.xml'};}
