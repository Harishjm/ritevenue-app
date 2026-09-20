import {env} from 'cloudflare:workers';
// Public directory is the safe default. Only isolated legacy tests opt into private_demo.
export function isPublicDirectory(){return (env as unknown as {RITEVENUE_MODE?:string}).RITEVENUE_MODE!=='private_demo';}
export function publicIndexingEnabled(){return (env as unknown as {RITEVENUE_DEPLOYMENT?:string}).RITEVENUE_DEPLOYMENT==='standalone_cloudflare_production';}
export const SITE_ORIGIN='https://ritevenue.in';
