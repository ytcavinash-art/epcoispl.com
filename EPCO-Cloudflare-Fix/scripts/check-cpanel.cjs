const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),net=require('node:net');
const root=path.resolve(__dirname,'..');
(async()=>{
 const php=process.argv[2];if(!php)throw new Error('Pass the path to a PHP 8.1+ executable.');
 const {directory}=JSON.parse(await fs.readFile(path.join(root,'releases/latest-cpanel.json'),'utf8'));
 const privateDir=await fs.mkdtemp(path.join(os.tmpdir(),'epco-php-test-'));
 const socket=net.createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 const child=spawn(php,['-n','-S',`127.0.0.1:${port}`,'-t',directory],{env:{...process.env,ENQUIRY_DATA_DIR:privateDir,RESEND_API_KEY:'',ENQUIRY_FROM:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let startup='';child.stderr.on('data',b=>startup+=b.toString());
 try{
  const base=`http://127.0.0.1:${port}`;let ready=false;
  for(let i=0;i<60;i++){try{const r=await fetch(base+'/api/enquiries.php');if(r.status===405){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  assert(ready,`PHP server unavailable: ${startup}`);
  const valid={name:'Synthetic deployment test',email:'test@example.com',phone:'',service:'Engineering',message:'Test enquiry: नमस्ते',consent:true,website:''};
  const post=(body,origin=base)=>fetch(base+'/api/enquiries.php',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
  assert.equal((await post({...valid,consent:false})).status,400);
  assert.equal((await post(valid,'https://untrusted.example')).status,403);
  assert.equal((await post({...valid,website:'bot'})).status,400);
  const response=await post(valid);assert.equal(response.status,201);const result=await response.json();assert(result.ok);assert.match(result.reference,/^[0-9a-f-]{36}$/);
  const record=JSON.parse(await fs.readFile(path.join(privateDir,result.reference+'.json'),'utf8'));assert.equal(record.message,valid.message);assert.equal(record.notification,'not-configured');
  const stale=path.join(privateDir,'11111111-1111-1111-1111-111111111111.json');await fs.writeFile(stale,'{}');const old=new Date(Date.now()-91*86400000);await fs.utimes(stale,old,old);assert.equal((await post(valid)).status,201);await assert.rejects(fs.access(stale));
  let limited=false;for(let i=0;i<12;i++){if((await post({...valid,email:'invalid'})).status===429){limited=true;break;}}assert(limited);
  const files=await fs.readdir(privateDir);assert.equal(files.filter(f=>/^[a-f0-9-]{36}\.json$/.test(f)).length,2);
  console.log('PHP integration passed: method validation, consent/honeypot rejection, cross-origin blocking, UTF-8 persistence, receipt reference, retention cleanup and rate limiting. Tests used temporary synthetic data; no email was sent.');
 }finally{
  const stopped=new Promise(resolve=>child.once('exit',resolve));child.kill();await stopped;
  const resolved=path.resolve(privateDir);assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('epco-php-test-'));await fs.rm(resolved,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
