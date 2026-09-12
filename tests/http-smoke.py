import urllib.request,urllib.error,json,uuid,time,subprocess,tempfile
from pathlib import Path
base='http://127.0.0.1:8791'
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def req(path,payload=None,origin=None):
 data=None if payload is None else json.dumps(payload).encode();r=urllib.request.Request(base+path,data=data,headers={'Content-Type':'application/json',**({'Origin':origin} if origin else {})})
 try:
  with opener.open(r,timeout=20) as res:return res.status,res.read().decode()
 except urllib.error.HTTPError as e:return e.code,e.read().decode()
# Local smoke database only; apply schema when it has not yet been created.
migration=subprocess.run(['node','--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--file','drizzle/0000_safe_yellow_claw.sql'],capture_output=True,text=True,timeout=45)
if migration.returncode and 'already exists' not in migration.stdout+ migration.stderr:raise RuntimeError(migration.stdout+ migration.stderr)
with tempfile.TemporaryFile(mode='w+') as logs:
 server=subprocess.Popen(['node','--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','8791','--inspector-port','0'],stdout=logs,stderr=logs)
 try:
  for i in range(40):
   try:req('/');break
   except (urllib.error.URLError,ConnectionError):time.sleep(.5)
  else:logs.seek(0);raise RuntimeError(logs.read()[-2500:])
  for p,expected in [('/',200),('/venues/the-jacaranda-lawn',200),('/list-your-venue',200),('/how-it-works',200),('/privacy',200),('/venues/missing',404),('/robots.txt',200)]:
   status,body=req(p);assert status==expected,(p,status,body[:300]);print(p,status)
   if p=='/':assert 'The Jacaranda Lawn' in body and 'noindex' in body
   if p=='/robots.txt':assert 'Disallow: /' in body
  v={'requestKey':str(uuid.uuid4()),'venueSlug':'the-jacaranda-lawn','date':'2030-01-01','guests':100,'occasion':'Wedding','name':'HTTP Test','email':'test@example.com','notes':'','consent':True,'website':''}
  status,body=req('/api/requests',v);assert status==201,(status,body);id=json.loads(body)['id'];print('Request created',status)
  status,body=req('/api/requests',v);assert status==201 and json.loads(body)['id']==id;print('Duplicate submission returns same receipt')
  status,body=req('/requests/'+id);assert status==200 and '2030-01-01' in body and 'test@example.com' not in body;print('Persistent receipt renders without contact details')
  for patch in [{'guests':99999},{'date':'2020-01-01'},{'consent':False}]:
   status,body=req('/api/requests',{**v,**patch});assert status==400,(status,body)
  status,body=req('/api/requests',v,'https://untrusted.example');assert status==403
  owner={'requestKey':str(uuid.uuid4()),'venueName':'Test Hall','city':'Bengaluru','contactName':'Test Owner','email':'owner@example.com','capacity':300,'consent':True,'website':''}
  status,body=req('/api/venue-applications',owner);assert status==201,(status,body);print('Owner application saved',status)
  print('HTTP route, SEO, persistence, idempotency, privacy and validation smoke checks passed.')
 finally:
  server.terminate()
  try:server.wait(timeout=5)
  except subprocess.TimeoutExpired:server.kill()
