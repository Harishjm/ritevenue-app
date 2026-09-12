import type {MetadataRoute} from 'next';
import {guides} from '@/lib/guides';
// Only original editorial pages belong in the eventual public sitemap.
// The entire owner-demo Site remains private and noindex until a separate launch.
export default function sitemap():MetadataRoute.Sitemap{const base='https://ritevenue-karnataka.gentle-orbit-8189.chatgpt.site';return [{url:base+'/guides'},...guides.map(g=>({url:base+'/guides/'+g.slug}))];}
