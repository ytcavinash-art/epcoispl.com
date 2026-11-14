// Backend-only integration: never put its shared secret in browser code.
export async function deliverToGoogleSheet(record,env,send=fetch){
 if(!env.GOOGLE_SHEETS_WEBHOOK_URL||!env.GOOGLE_SHEETS_WEBHOOK_SECRET)return 'not-configured';
 try{
  const url=new URL(env.GOOGLE_SHEETS_WEBHOOK_URL);
  if(url.origin!=='https://script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)||url.search||url.hash||url.username||url.password)return 'failed';
  if(env.GOOGLE_SHEETS_WEBHOOK_SECRET.length<32)return 'failed';
  const response=await send(url.href,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'follow',signal:AbortSignal.timeout(15000),body:JSON.stringify({secret:env.GOOGLE_SHEETS_WEBHOOK_SECRET,reference:record.id,createdAt:record.createdAt,name:record.name,email:record.email,phone:record.phone,service:record.service,message:record.message,consent:true})});
  if(!response.ok)return 'failed';
  const result=await response.json();
  return result.ok===true&&result.reference===record.id?'synced':'failed';
 }catch{return 'failed';}
}
export async function syncGoogleSheet(record,env,stub){
 const state=await deliverToGoogleSheet(record,env);
 if(state!=='not-configured')await stub.fetch('https://enquiries.internal/sheet-status',{method:'POST',body:JSON.stringify({id:record.id,state})});
}
