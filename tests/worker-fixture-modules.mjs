import {resolve} from 'node:path';
import {readdirSync} from 'node:fs';

export function workerFixtureModules(){
 return [
  // Miniflare dispatchFetch preserves the requested URL but uses its transport Host.
  // Normalize that header in this test-only entry to match a real browser request.
  {type:'ESModule',path:resolve('dist/server/__test-entry.js'),contents:`import app from './index.js';export default {fetch(request,env,ctx){const headers=new Headers(request.headers);headers.set('host',new URL(request.url).host);return app.fetch(new Request(request,{headers}),env,ctx);}};`},
  ...readdirSync('dist/server',{recursive:true}).filter(file=>file.endsWith('.js')).map(file=>({type:'ESModule',path:resolve('dist/server',file)}))
 ];
}
