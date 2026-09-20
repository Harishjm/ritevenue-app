import ts from 'typescript';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';

const root=resolve('.sites-runtime/auth-tests');mkdirSync(root,{recursive:true});writeFileSync(resolve(root,'package.json'),'{"type":"commonjs"}');
for(const file of ['lib/auth-core.ts','lib/db.ts','lib/auth.ts']){
 let source=readFileSync(file,'utf8').replace("import {env} from 'cloudflare:workers';",'const env=globalThis.__testEnv;').replace("import {headers} from 'next/headers';",'async function headers(){return new Headers(globalThis.__testHeaders||{});}').replace("import {redirect} from 'next/navigation';",'function redirect(path){throw new Error("REDIRECT:"+path);}');
 const dest=resolve(root,file.replace(/\.ts$/,'.js'));mkdirSync(dirname(dest),{recursive:true});
 source=source.replace(/(['"])@\//g,(_,quote)=>quote+(relative(dirname(dest),root)||'.')+'/');
 writeFileSync(dest,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
}

const sql=new DatabaseSync(':memory:');for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
class Statement{constructor(text,args=[]){this.text=text;this.args=args;}bind(...args){return new Statement(this.text,args);}first(){return sql.prepare(this.text).all(...this.args)[0]||null;}all(){return {results:sql.prepare(this.text).all(...this.args)};}run(){const result=sql.prepare(this.text).run(...this.args);return {meta:{changes:Number(result.changes)}};}}
const emails=[];
globalThis.__testEnv={RITEVENUE_ADMIN_EMAIL:'admin@example.test',RITEVENUE_AUTH_SECRET:'test-only-secret-that-is-at-least-32-characters',RITEVENUE_OTP_FROM_EMAIL:'signin@example.test',RITEVENUE_DEPLOYMENT:'standalone_cloudflare_staging',DB:{prepare:text=>new Statement(text),batch:statements=>{sql.exec('BEGIN');try{const results=statements.map(statement=>statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}},AUTH_EMAIL:{send:async message=>{emails.push(message);return {messageId:'test'};}}};
const require=createRequire(resolve(root,'entry.js')),auth=require('./lib/auth.js'),core=require('./lib/auth-core.js');
const request=(cookie='')=>new Request('https://ritevenue.test/api/auth/test',{method:'POST',headers:{Origin:'https://ritevenue.test','cf-connecting-ip':'192.0.2.10',...(cookie?{Cookie:cookie}:{})}});

const ignored=await auth.requestAdminOtp(request(),'other@example.test');assert.match(ignored.challengeId,/^[0-9a-f-]{36}$/);assert.equal(emails.length,0);assert.equal(sql.prepare('SELECT count(*) n FROM auth_otp_challenges').get().n,0);
const issued=await auth.requestAdminOtp(request(),'ADMIN@example.test');assert.equal(emails.length,1);assert.equal(emails[0].to,'admin@example.test');
const code=emails[0].text.match(/\b\d{6}\b/)[0],stored=sql.prepare('SELECT code_hash,attempts FROM auth_otp_challenges WHERE id=?').get(issued.challengeId);assert.equal(stored.code_hash.length,64);assert.ok(!stored.code_hash.includes(code));
await assert.rejects(()=>auth.verifyAdminOtp(request(),issued.challengeId,code==='000000'?'000001':'000000'),error=>error.status===400);assert.equal(sql.prepare('SELECT attempts FROM auth_otp_challenges WHERE id=?').get(issued.challengeId).attempts,1);
const verified=await auth.verifyAdminOtp(request(),issued.challengeId,code);assert.equal(verified.user.role,'admin');assert.match(verified.cookie,/HttpOnly/);assert.match(verified.cookie,/Secure/);assert.ok(!verified.cookie.includes(code));
const cookie=verified.cookie.split(';')[0],user=await auth.getAuthenticatedUser(request(cookie));assert.equal(user.email,'admin@example.test');assert.equal(auth.isAdminUser(user),true);
assert.equal(await auth.getAuthenticatedUser(new Request('https://ritevenue.test',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'admin@example.test'}})),null);
await assert.rejects(()=>auth.verifyAdminOtp(request(),issued.challengeId,code),error=>error.status===400);
const cleared=await auth.signOut(request(cookie));assert.match(cleared,/Max-Age=0/);assert.equal(await auth.getAuthenticatedUser(request(cookie)),null);
assert.equal(core.safeReturnPath('https://attacker.test/admin'),'/admin');assert.equal(core.safeReturnPath('//attacker.test'),'/admin');assert.equal(core.safeReturnPath('/admin?tab=pending'),'/admin?tab=pending');
console.log('Passed independent admin auth: allowlisted email, no account disclosure, hashed OTP/session storage, attempt limits, single-use verification, secure cookie, forged-header rejection and logout.');
