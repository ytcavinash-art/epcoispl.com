const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const record={id:'12345678-1234-4234-8234-123456789abc',createdAt:'2026-11-14T10:00:00.000Z',name:'=Synthetic visitor',email:'test@example.com',phone:'+919000000000',service:'Engineering',message:'Synthetic test only',ipHash:'not-for-google'};
const env={GOOGLE_SHEETS_WEBHOOK_URL:'https://script.google.com/macros/s/test-deployment/exec',GOOGLE_SHEETS_WEBHOOK_SECRET:'a'.repeat(64)};
const integration=()=>import(pathToFileURL(path.join(__dirname,'../hosting/cloudflare/google-sheets.mjs')).href);
test('Sheets transport maps form fields, follows Google content redirects and omits IP data',async()=>{
 const {deliverToGoogleSheet}=await integration();let sent;
 assert.equal(await deliverToGoogleSheet(record,env,async(url,options)=>{sent={url,...options};return {ok:true,json:async()=>({ok:true,reference:record.id})};}),'synced');
 const payload=JSON.parse(sent.body);assert.equal(payload.message,record.message);assert.equal(payload.reference,record.id);assert.equal(payload.consent,true);assert.equal(payload.secret,env.GOOGLE_SHEETS_WEBHOOK_SECRET);assert(!('ipHash' in payload));assert.equal(sent.redirect,'follow');
});
test('Sheets transport does not send data without config or to an unapproved host',async()=>{
 const {deliverToGoogleSheet}=await integration();let calls=0;const send=async()=>{calls++;throw Error('must not send');};
 assert.equal(await deliverToGoogleSheet(record,{},send),'not-configured');
 for(const url of ['https://untrusted.example/exec','http://script.google.com/macros/s/id/exec','https://script.google.com/macros/s/id/dev','https://script.google.com/macros/s/id/exec?token=anything'])assert.equal(await deliverToGoogleSheet(record,{...env,GOOGLE_SHEETS_WEBHOOK_URL:url},send),'failed');
 assert.equal(calls,0);
});
test('Sheets transport rejects HTML, provider errors and mismatched references',async()=>{
 const {deliverToGoogleSheet}=await integration();for(const result of [{ok:false,json:async()=>({})},{ok:true,json:async()=>({ok:false})},{ok:true,json:async()=>({ok:true,reference:'wrong'})},{ok:true,json:async()=>{throw Error('HTML login page');}}])assert.equal(await deliverToGoogleSheet(record,env,async()=>result),'failed');
});
function scriptHarness(){
 const properties=new Map([['SHEET_ID','private-test-sheet'],['WEBHOOK_SECRET',env.GOOGLE_SHEETS_WEBHOOK_SECRET]]),rows=[];let lockCount=0,unlocks=0;
 const sheet={getLastRow:()=>rows.length,appendRow:row=>rows.push([...row]),setFrozenRows(){},setColumnWidth(){},getRange(row,column,count){const range={getValues:()=>rows.slice(row-1,row-1+count).map(r=>r.slice(column-1,column+7)),setNumberFormat:()=>range,setFontWeight:()=>range,setBackground:()=>range,setFontColor:()=>range,setWrap:()=>range,createTextFinder(value){const finder={matchEntireCell:()=>finder,findNext:()=>rows.slice(row-1,row-1+count).some(r=>r[column-1]===value)?{}:null};return finder;}};return range;}};
 const script=fs.readFileSync(path.join(__dirname,'../integrations/google-sheets/Code.gs'),'utf8');
 const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key),setProperty:(key,value)=>properties.set(key,value)})},SpreadsheetApp:{openById:id=>{assert.equal(id,'private-test-sheet');return {getSheetByName:()=>sheet,insertSheet:()=>sheet};},flush(){}},Utilities:{getUuid:()=> '12345678-1234-4234-8234-123456789abc',formatDate:(date,zone)=>{assert.equal(zone,'Asia/Kolkata');return '2026-11-14 15:30:00';}},LockService:{getScriptLock:()=>({tryLock:()=>{lockCount++;return true;},releaseLock:()=>{unlocks++;}})},ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({setMimeType:()=>text})},console:{error(){}}});
 vm.runInContext(script,context);return {context,rows,properties,locks:()=>({lockCount,unlocks}),post:body=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(body)}}))};
}
test('Apps Script adds exact headers, saves a safe row and deduplicates retry references',()=>{
 const h=scriptHarness();h.context.setupEnquirySheet();assert.equal(h.rows[0].length,8);
 const payload={...record,reference:record.id,consent:true,secret:env.GOOGLE_SHEETS_WEBHOOK_SECRET};assert.equal(h.post(payload).ok,true);assert.equal(h.rows.length,2);assert.equal(h.rows[1][2],"'=Synthetic visitor");assert.equal(h.rows[1][4],"'+919000000000");assert.equal(h.rows[1][6],record.message);assert.equal(h.rows[1][7],'Yes');assert.equal(h.post(payload).duplicate,true);assert.equal(h.rows.length,2);assert.deepEqual(h.locks(),{lockCount:2,unlocks:2});
});
test('Apps Script rejects unauthenticated and invalid requests without writing enquiry data',()=>{
 const h=scriptHarness();h.context.setupEnquirySheet();const payload={...record,reference:record.id,consent:true,secret:env.GOOGLE_SHEETS_WEBHOOK_SECRET};assert.equal(h.post({...payload,secret:'wrong'}).ok,false);assert.equal(h.post({...payload,consent:false}).ok,false);assert.equal(h.post({...payload,email:'invalid'}).ok,false);assert.equal(h.rows.length,1);
});
test('Apps Script setup preserves existing content when headers do not match',()=>{
 const h=scriptHarness();h.rows.push(['Existing data']);assert.throws(()=>h.context.setupEnquirySheet(),/different headers/);assert.equal(h.rows.length,1);assert.equal(h.rows[0][0],'Existing data');
});
