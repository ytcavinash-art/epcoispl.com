const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
async function harness(){
 const {DatabaseSync}=require('node:sqlite');
 const module=await import(pathToFileURL(path.join(__dirname,'../hosting/cloudflare/worker.mjs')).href);
 const db=new DatabaseSync(':memory:');let alarm=null;
 const sql={exec(query,...args){const statement=db.prepare(query);let rows=[];if(/^\s*(SELECT|PRAGMA)/i.test(query))rows=statement.all(...args);else statement.run(...args);return {toArray:()=>rows,one:()=>{assert.equal(rows.length,1);return rows[0];}};}};
 const storage={sql,transactionSync(callback){db.exec('BEGIN');try{const result=callback();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}},getAlarm:async()=>alarm,setAlarm:async value=>{alarm=value;}};
 const object=new module.EnquiryRegister({storage},{ENQUIRY_RETENTION_DAYS:'90'});
 const jobs=[];const env={ENQUIRIES:{idFromName:()=> 'private',get:()=>({fetch:(url,init)=>object.fetch(new Request(url,init))})},ASSETS:{fetch:async()=>new Response('Static page')}};
 const valid={name:'Synthetic Worker test',email:'test@example.com',phone:'',service:'Engineering',message:'Test: नमस्ते',consent:true,website:''};
 const send=(data=valid,headers={})=>module.default.fetch(new Request('https://epcoispl.com/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://epcoispl.com','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify(data)}),env,{waitUntil:job=>jobs.push(job)});
 return {module,db,object,storage,env,valid,send,jobs};
}
test('Worker stores UTF-8 enquiries privately and only acknowledges after save',async()=>{
 const h=await harness();try{const response=await h.send();assert.equal(response.status,201);const result=await response.json();assert(result.ok);assert.match(result.reference,/^[a-f0-9-]{36}$/);await Promise.all(h.jobs);const rows=h.db.prepare('SELECT * FROM enquiries').all();assert.equal(rows.length,1);assert.equal(rows[0].message,h.valid.message);assert.equal(rows[0].notification,'not-configured');assert(!JSON.stringify(result).includes(h.valid.email));assert(await h.storage.getAlarm());}finally{h.db.close();}
});
test('Worker rejects invalid forms, bots and cross-origin submissions',async()=>{
 const h=await harness();try{assert.equal((await h.send({...h.valid,consent:false})).status,400);assert.equal((await h.send({...h.valid,website:'bot'})).status,400);assert.equal((await h.send(h.valid,{Origin:'https://untrusted.example'})).status,403);assert.equal((await h.send({...h.valid,message:'x'.repeat(17000)})).status,413);assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM enquiries').get().n,0);}finally{h.db.close();}
});
test('Worker enforces per-visitor request limits without blocking other visitors',async()=>{
 const h=await harness();try{for(let i=0;i<5;i++)assert.equal((await h.send()).status,201);const blocked=await h.send();assert.equal(blocked.status,429);assert.equal(blocked.headers.get('retry-after'),'900');assert.equal((await h.send(h.valid,{'CF-Connecting-IP':'192.0.2.2'})).status,201);await Promise.all(h.jobs);}finally{h.db.close();}
});
test('Worker retention alarms delete expired enquiries and reschedule retained records',async()=>{
 const h=await harness();try{await h.send();await Promise.all(h.jobs);h.db.prepare('INSERT INTO enquiries VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('old-record',Date.now()-91*86400000,'Test','old@example.com','','Engineering','Old test','not-configured');await h.object.alarm();assert.equal(h.db.prepare('SELECT COUNT(*) AS n FROM enquiries').get().n,1);assert(await h.storage.getAlarm());}finally{h.db.close();}
});
test('Worker has no public record-list endpoint and fails honestly without storage',async()=>{
 const h=await harness();try{assert.equal((await h.module.default.fetch(new Request('https://epcoispl.com/api/enquiries'),h.env,{})).status,405);assert.equal((await h.module.default.fetch(new Request('https://epcoispl.com/api/admin/enquiries'),h.env,{})).status,404);delete h.env.ENQUIRIES;const response=await h.send();assert.equal(response.status,503);assert(!(await response.json()).ok);assert.equal(await (await h.module.default.fetch(new Request('https://epcoispl.com/'),h.env,{})).text(),'Static page');}finally{h.db.close();}
});
test('Cloudflare build stages only public files and root-domain metadata',()=>{
 const root=path.resolve(__dirname,'..'),publicDir=path.join(root,'public-cloudflare');if(!fs.existsSync(publicDir))return;
 const pages=fs.readdirSync(publicDir).filter(f=>f.endsWith('.html'));assert.equal(pages.length,30);
 for(const file of pages){const html=fs.readFileSync(path.join(publicDir,file),'utf8');assert(!html.includes('https://www.epcoispl.com/in/'));for(const [,value]of html.matchAll(/(?:href|src|action)="([^"]+)"/g)){if(/^(https?:|mailto:|tel:)/.test(value)||value==='api/enquiries')continue;const target=value.split('#')[0].split('?')[0]||file;assert(fs.existsSync(path.join(publicDir,target)),file+': '+value);}}
 for(const file of ['.env','.data','server.cjs','hosting','scripts','tests','releases'])assert(!fs.existsSync(path.join(publicDir,file)),file);
});
test('Worker maps the domain root to index.html while retaining explicit HTML URLs',async()=>{
 const h=await harness();try{let requested;h.env.ASSETS.fetch=async request=>{requested=new URL(request.url).pathname;return new Response('Home');};await h.module.default.fetch(new Request('https://epcoispl.com/'),h.env,{});assert.equal(requested,'/index.html');await h.module.default.fetch(new Request('https://epcoispl.com/team.html'),h.env,{});assert.equal(requested,'/team.html');}finally{h.db.close();}
});
