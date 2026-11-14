const HEADERS = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
const SERVICES = new Set(['General enquiry','Engineering','Procurement','Supply & Trading','Construction','Project Management','Turnkey Solutions','Energy & Sustainability','Integrated Facility Management','Careers','Mechanical & HVAC','Electrical & Power Systems','ELV & Building Automation','Plumbing, PHE & Water Management','Fire Protection & Life Safety','Lifts & Vertical Transportation','Workplace & Facility Support','Maintenance, Assets & Technical Support']);
const json=(status,data,headers={})=>new Response(JSON.stringify(data),{status,headers:{...HEADERS,...headers}});
export function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const data={};
 for(const [key,limit]of Object.entries({name:100,email:120,phone:30,service:100,message:1200})){
  if(typeof input[key]!=='string')return null;data[key]=input[key].trim();
  if(data[key].length>limit||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(data[key]))return null;
 }
 if(!data.name||!data.message||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||!SERVICES.has(data.service)||input.consent!==true||input.website)return null;
 return data;
}
async function readBody(request){
 const reader=request.body?.getReader();if(!reader)return '';
 const decoder=new TextDecoder();let bytes=0,text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16384){await reader.cancel();return null;}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
async function notification(record,env,stub){
 let state='not-configured';
 if(env.RESEND_API_KEY&&env.ENQUIRY_FROM){
  try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':record.id},body:JSON.stringify({from:env.ENQUIRY_FROM,to:[env.ENQUIRY_TO||'epcoispl@gmail.com'],reply_to:record.email,subject:`EPCO enquiry: ${record.service}`,text:`Reference: ${record.id}\nName: ${record.name}\nEmail: ${record.email}\nPhone: ${record.phone||'Not supplied'}\nService: ${record.service}\n\n${record.message}`}),signal:AbortSignal.timeout(10000)});state=response.ok?'sent':'failed';}catch{state='failed';}
 }
 await stub.fetch('https://enquiries.internal/notification',{method:'POST',body:JSON.stringify({id:record.id,state})});
}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(url.pathname!=='/api/enquiries')return json(404,{error:'Not found.'});
  if(request.method!=='POST')return json(405,{error:'Use the enquiry form to submit a request.'},{Allow:'POST'});
  if(request.headers.get('sec-fetch-site')==='cross-site')return json(403,{error:'Submit the form from the EPCO website.'});
  const origin=request.headers.get('origin');if(origin){try{if(new URL(origin).origin!==url.origin)return json(403,{error:'Submit the form from the EPCO website.'});}catch{return json(403,{error:'Invalid request origin.'});}}
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json(415,{error:'Please submit the website form.'});
  try{
   const body=await readBody(request);if(body===null)return json(413,{error:'The enquiry is too large.'});
   let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Invalid enquiry. Please reload and try again.'});}
   const data=validate(input);if(!data)return json(400,{error:'Please check the required fields and privacy acknowledgement.'});
   if(!env.ENQUIRIES)return json(503,{error:'Enquiry storage is not configured. Please call +91 91674 85843.'});
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(request.headers.get('CF-Connecting-IP')||'local'));
   const ipHash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
   const id=crypto.randomUUID(),stub=env.ENQUIRIES.get(env.ENQUIRIES.idFromName('epco-enquiry-register'));
   const record={id,...data,ipHash};
   const saved=await stub.fetch('https://enquiries.internal/submit',{method:'POST',body:JSON.stringify(record)});
   if(!saved.ok)return new Response(saved.body,{status:saved.status,headers:{...HEADERS,...(saved.status===429?{'Retry-After':'900'}:{})}});
   // Keep the receipt fast. Provider errors cannot discard the saved enquiry.
   ctx.waitUntil(notification(record,env,stub).catch(()=>console.error('Enquiry saved; notification update failed.')));
   return json(201,{ok:true,reference:id,message:'Your enquiry has been received. Please keep this reference for follow-up.'});
  }catch{return json(503,{error:'We could not save your enquiry right now. Please try again or call +91 91674 85843.'});}
 }
};
export class EnquiryRegister {
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;this.sql=ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS enquiries (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, service TEXT NOT NULL, message TEXT NOT NULL, notification TEXT NOT NULL)');
  this.sql.exec('CREATE INDEX IF NOT EXISTS enquiries_created ON enquiries(created_at)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS request_limits (ip_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL)');
 }
 async fetch(request){
  const url=new URL(request.url);if(request.method!=='POST')return json(405,{error:'Method not allowed.'});
  const input=await request.json();
  if(url.pathname==='/notification'){
   if(!['sent','failed','not-configured'].includes(input.state))return json(400,{error:'Invalid status.'});
   this.sql.exec('UPDATE enquiries SET notification = ? WHERE id = ?',input.state,input.id);return json(200,{ok:true});
  }
  if(url.pathname!=='/submit')return json(404,{error:'Not found.'});
  const data=validate({...input,consent:true,website:''});
  if(!data||!/^[a-f0-9-]{36}$/.test(input.id)||!/^[a-f0-9]{64}$/.test(input.ipHash))return json(400,{error:'Invalid enquiry.'});
  const now=Date.now(),days=Number(this.env.ENQUIRY_RETENTION_DAYS||90);
  if(!Number.isFinite(days)||days<1)return json(503,{error:'Invalid storage configuration.'});
  const accepted=this.ctx.storage.transactionSync(()=>{
   this.sql.exec('DELETE FROM request_limits WHERE reset_at <= ?',now);
   this.sql.exec('DELETE FROM enquiries WHERE created_at < ?',now-days*86400000);
   const rate=this.sql.exec('SELECT attempts FROM request_limits WHERE ip_hash = ?',input.ipHash).toArray()[0];
   if(rate&&rate.attempts>=5)return false;
   this.sql.exec('INSERT INTO request_limits (ip_hash, attempts, reset_at) VALUES (?, 1, ?) ON CONFLICT(ip_hash) DO UPDATE SET attempts = attempts + 1',input.ipHash,now+900000);
   this.sql.exec('INSERT INTO enquiries (id, created_at, name, email, phone, service, message, notification) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',input.id,now,data.name,data.email,data.phone,data.service,data.message,this.env.RESEND_API_KEY&&this.env.ENQUIRY_FROM?'pending':'not-configured');
   return true;
  });
  if(!accepted)return json(429,{error:'Too many attempts. Please try again in 15 minutes or call EPCO.'});
  if(!await this.ctx.storage.getAlarm())await this.ctx.storage.setAlarm(now+3600000);
  return json(201,{ok:true});
 }
 async alarm(){
  const days=Number(this.env.ENQUIRY_RETENTION_DAYS||90);if(!Number.isFinite(days)||days<1)throw new Error('Invalid retention setting.');
  this.sql.exec('DELETE FROM enquiries WHERE created_at < ?',Date.now()-days*86400000);
  this.sql.exec('DELETE FROM request_limits WHERE reset_at <= ?',Date.now());
  const {count}=this.sql.exec('SELECT COUNT(*) AS count FROM enquiries').one();
  if(count>0)await this.ctx.storage.setAlarm(Date.now()+3600000);
 }
}
