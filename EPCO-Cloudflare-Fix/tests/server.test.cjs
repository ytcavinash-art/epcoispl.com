const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createServer,validate}=require('../server.cjs');
const valid={name:'Website test',email:'test@example.com',phone:'',service:'Engineering',message:'Test enquiry: नमस्ते',consent:true,website:''};
async function setup(t,extra={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'epco-test-'));
 const server=createServer({dataDir:dir,env:{},...extra});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));const resolved=path.resolve(dir);assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('epco-test-'));await fs.rm(resolved,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(input=valid,headers={})=>fetch(base+'/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...headers},body:JSON.stringify(input)});
 return {base,post,dir};
}
test('validates required fields, service, consent and honeypot',()=>{
 assert(validate(valid).data);
 for(const change of [{email:'invalid'},{email:'a@b.com\r\nInjected: yes'},{consent:false},{service:'Unknown'},{message:''},{message:'x'.repeat(1201)},{website:'spam'}, {name:42}])assert(validate({...valid,...change}).error,JSON.stringify(change));
});
test('persists a real record and acknowledges only receipt',async t=>{
 const {post,dir}=await setup(t);const response=await post();assert.equal(response.status,201);const result=await response.json();assert(result.ok);assert.match(result.reference,/^[0-9a-f-]{36}$/);
 const record=JSON.parse(await fs.readFile(path.join(dir,result.reference+'.json'),'utf8'));assert.equal(record.email,valid.email);assert.equal(record.message,valid.message);assert.equal(record.notification,'not-configured');assert(!JSON.stringify(result).includes(valid.email));
});
test('rejects malformed data, cross-origin requests and non-JSON requests',async t=>{
 const {base,post,dir}=await setup(t);assert.equal((await post({...valid,consent:false})).status,400);assert.equal((await post(valid,{Origin:'https://untrusted.example'})).status,403);
 assert.equal((await fetch(base+'/api/enquiries',{method:'POST',body:'anything'})).status,415);
 assert.equal((await fetch(base+'/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:'{invalid'})).status,400);
 assert.equal((await fs.readdir(dir)).length,0);
});
test('returns a recoverable error when storage cannot save an enquiry',async t=>{
 const {dir}=await setup(t);const blocked=path.join(dir,'file-not-directory');await fs.writeFile(blocked,'test');const server=createServer({dataDir:blocked,env:{}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/enquiries`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(valid)});assert.equal(response.status,503);assert(!(await response.json()).ok);
});
test('notifies a configured provider using server-side credentials (mocked)',async t=>{
 let request;const {post,dir}=await setup(t,{env:{RESEND_API_KEY:'test-key',ENQUIRY_FROM:'EPCO <website@example.com>',ENQUIRY_TO:'office@example.com'},fetch:async(url,options)=>{request={url,...options};return {ok:true};}});
 const result=await (await post()).json();assert.equal(request.url,'https://api.resend.com/emails');const payload=JSON.parse(request.body);assert.deepEqual(payload.to,['office@example.com']);assert.equal(payload.reply_to,valid.email);assert.equal(request.headers.Authorization,'Bearer test-key');assert.equal(JSON.parse(await fs.readFile(path.join(dir,result.reference+'.json'))).notification,'sent');
});
test('notification failure preserves the enquiry and records failure',async t=>{
 const {post,dir}=await setup(t,{env:{RESEND_API_KEY:'test-key',ENQUIRY_FROM:'website@example.com'},fetch:async()=>({ok:false})});const response=await post();assert.equal(response.status,201);const result=await response.json();assert.equal(JSON.parse(await fs.readFile(path.join(dir,result.reference+'.json'))).notification,'failed');
});
test('rate limits repeated attempts',async t=>{
 const {post}=await setup(t);for(let i=0;i<5;i++)assert.equal((await post({...valid,email:'invalid'})).status,400);const response=await post();assert.equal(response.status,429);assert(response.headers.get('retry-after'));
});
test('serves pages but blocks source, configuration, data and traversal',async t=>{
 const {base}=await setup(t);for(const file of ['index.html','contact.html','favicon.svg','sitemap.xml','robots.txt','assets/engineering-bim-team-480.jpg'])assert.equal((await fetch(`${base}/${file}`)).status,200,file);
 for(const file of ['.env','server.cjs','README.md','WEBSITE-AUDIT.md','scripts/build-company.cjs','.data/enquiries/test.json','assets/../server.cjs','assets/%2e%2e%2fserver.cjs','assets/services-catalog.json'])assert.equal((await fetch(`${base}/${file}`)).status,404,file);
 const response=await fetch(base+'/contact.html');assert(response.headers.get('content-security-policy'));assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal((await fetch(base+'/api/enquiries')).status,405);
 const cached=await fetch(base+'/contact.html',{headers:{'If-None-Match':response.headers.get('etag')}});assert.equal(cached.status,304);
});
test('retention cleanup removes old enquiry records only',async t=>{
 const {post,dir}=await setup(t);const stale=path.join(dir,'11111111-1111-1111-1111-111111111111.json');await fs.writeFile(stale,'{}');const old=new Date(Date.now()-91*86400000);await fs.utimes(stale,old,old);await fs.writeFile(path.join(dir,'operator-note.txt'),'keep');assert.equal((await post()).status,201);await assert.rejects(fs.access(stale));assert.equal(await fs.readFile(path.join(dir,'operator-note.txt'),'utf8'),'keep');
});
