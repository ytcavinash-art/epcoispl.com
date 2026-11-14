const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = __dirname;
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const SERVICES = new Set(['General enquiry','Engineering','Procurement','Supply & Trading','Construction','Project Management','Turnkey Solutions','Energy & Sustainability','Integrated Facility Management','Careers',...require('./assets/services-catalog.json').map(item=>item.title)]);
const HEADERS = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"};
function validate(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) return {error:'Please complete the enquiry form.'};
  const limits={name:100,email:120,phone:30,service:100,message:1200};const data={};
  for(const [key,max] of Object.entries(limits)){
    if(typeof input[key]!=='string') return {error:'Please complete all required fields.'};
    data[key]=input[key].trim();
    if(data[key].length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(data[key]))return {error:'Please check the length and content of your enquiry.'};
  }
  if(!data.name || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||/[\r\n]/.test(data.email)||!SERVICES.has(data.service)||input.consent!==true||input.website) return {error:'Please check your name, email, service, message and privacy acknowledgement.'};
  return {data};
}
function createServer(options={}) {
  const env=options.env || process.env;
  const dataDir=path.resolve(ROOT,options.dataDir || env.ENQUIRY_DATA_DIR || '.data/enquiries');
  const retention=Number(env.ENQUIRY_RETENTION_DAYS||90);
  if(!Number.isFinite(retention)||retention<1)throw new Error('ENQUIRY_RETENTION_DAYS must be at least 1.');
  const limits=new Map();let lastCleanup=0;let cleanupPromise;
  const send=(res,status,data,extra={})=>{res.writeHead(status,{...HEADERS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(data));};
  async function cleanup(){
    if(Date.now()-lastCleanup<3600000)return cleanupPromise;
    lastCleanup=Date.now();cleanupPromise=(async()=>{await fs.mkdir(dataDir,{recursive:true,mode:0o700});for(const entry of await fs.readdir(dataDir)){if(!/^[0-9a-f-]+\.json$/.test(entry))continue;const filename=path.join(dataDir,entry);const stat=await fs.stat(filename);if(stat.mtimeMs<Date.now()-retention*86400000)await fs.unlink(filename);}})();return cleanupPromise;
  }
  async function notify(record){
    if(!env.RESEND_API_KEY||!env.ENQUIRY_FROM)return 'not-configured';
    const response=await (options.fetch || fetch)('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':record.id},body:JSON.stringify({from:env.ENQUIRY_FROM,to:[env.ENQUIRY_TO||'epcoispl@gmail.com'],reply_to:record.email,subject:`EPCO enquiry: ${record.service}`,text:`Reference: ${record.id}\nName: ${record.name}\nEmail: ${record.email}\nPhone: ${record.phone||'Not supplied'}\nService: ${record.service}\n\n${record.message}`}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Notification provider rejected the request.');
    return 'sent';
  }
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');let pathname;
      try{pathname=decodeURIComponent(url.pathname);}catch{return send(res,400,{error:'Invalid URL.'});}
      const base=new URL(env.SITE_URL||'https://www.epcoispl.com/in/').pathname.replace(/\/$/,'');
      if(base&&pathname===base){res.writeHead(308,{...HEADERS,Location:base+'/'+url.search});return res.end();}
      if(base && (pathname===base||pathname.startsWith(base+'/')))pathname=pathname.slice(base.length)||'/';
      if(pathname==='/api/enquiries'){
        if(req.method!=='POST')return send(res,405,{error:'Use POST to submit an enquiry.'},{Allow:'POST'});
        const origin=req.headers.origin;
        if(origin){let allowed=false;try{allowed=new URL(origin).host===req.headers.host || new URL(origin).origin===new URL(env.SITE_URL||'https://www.epcoispl.com/in/').origin;}catch{}if(!allowed)return send(res,403,{error:'Please submit the form from the EPCO website.'});}
        if(req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'Cross-site submissions are not accepted.'});
        if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,415,{error:'Please submit the website form.'});
        const now=Date.now();for(const [key,value] of limits)if(value.reset<=now)limits.delete(key);
        const ip=env.TRUST_PROXY==='true' ? String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim() : req.socket.remoteAddress;
        const bucket=limits.get(ip)||{count:0,reset:now+900000};
        if(bucket.count>=5)return send(res,429,{error:'Too many attempts. Please try again in 15 minutes or call EPCO.'},{'Retry-After':String(Math.ceil((bucket.reset-now)/1000))});
        bucket.count++;limits.set(ip,bucket);
        const chunks=[];let bytes=0;
        for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)return send(res,413,{error:'The enquiry is too large.'});chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,{error:'Invalid enquiry. Please reload the page and try again.'});}
        const result=validate(input);if(result.error)return send(res,400,{error:result.error});
        await cleanup();
        const record={id:crypto.randomUUID(),createdAt:new Date().toISOString(),...result.data,privacyAcknowledged:true,notification:'pending'};
        const filename=path.join(dataDir,`${record.id}.json`);
        // Persist before acknowledging receipt; never expose the storage directory over HTTP.
        await fs.writeFile(filename,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
        try{record.notification=await notify(record);}catch{record.notification='failed';}
        try{await fs.writeFile(filename+'.tmp',JSON.stringify(record,null,2)+'\n',{mode:0o600});await fs.rename(filename+'.tmp',filename);}catch{console.error('Enquiry saved; notification status update failed.');}
        return send(res,201,{ok:true,reference:record.id,message:'Your enquiry has been received. Please keep this reference for follow-up.'});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'},{Allow:'GET, HEAD'});
      const relative=pathname==='/'?'index.html':pathname.slice(1);
      const ext=path.extname(relative).toLowerCase();
      const allowed=/^[a-z0-9-]+\.html$/.test(relative)||['style.css','script.js','favicon.svg','robots.txt','sitemap.xml'].includes(relative)||(/^assets\/[a-zA-Z0-9._/-]+$/.test(relative)&&['.jpg','.jpeg','.png','.webp','.svg','.ico'].includes(ext));
      if(!allowed||relative.split('/').some(p=>p==='..'||p.startsWith('.')))return send(res,404,{error:'Page not found.'});
      const filename=path.resolve(ROOT,relative);if(!filename.startsWith(ROOT+path.sep))return send(res,404,{error:'Page not found.'});
      const data=await fs.readFile(filename);
      const etag='"'+crypto.createHash('sha256').update(data).digest('hex').slice(0,24)+'"';
      const headers={...HEADERS,'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600',ETag:etag};
      if(req.headers['if-none-match']===etag){res.writeHead(304,headers);return res.end();}
      const accepts=req.headers['accept-encoding']||'';
      let output=data;
      if(data.length>1024&&['.html','.css','.js','.xml','.svg'].includes(ext)&&/\bgzip\b/.test(accepts)){output=require('node:zlib').gzipSync(data);headers['Content-Encoding']='gzip';headers.Vary='Accept-Encoding';}
      res.writeHead(200,{...headers,'Content-Length':output.length});res.end(req.method==='HEAD'?undefined:output);
    }catch(error){if(error.code==='ENOENT')return send(res,404,{error:'Page not found.'});console.error('Request could not be completed.');if(!res.headersSent)send(res,503,{error:'We could not save your enquiry right now. Please try again or call +91 91674 85843.'});else res.end();}
  });
  const cleanupTimer=setInterval(()=>{cleanup().catch(()=>console.error('Enquiry retention cleanup failed.'));},3600000);cleanupTimer.unref();
  server.on('close',()=>clearInterval(cleanupTimer));server.requestTimeout=20000;server.headersTimeout=15000;
  return server;
}
if(require.main===module){const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000);createServer().listen(port,host,()=>console.log(`EPCO website: http://${host==='127.0.0.1'?'localhost':host}:${port}`));}
module.exports={createServer,validate};
