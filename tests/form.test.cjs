const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function setup(fetch){
 const button={disabled:false},form={dataset:{},attrs:{},values:{name:'Visitor',email:'visitor@example.com',phone:'',service:'Engineering',message:'Need project support',consent:'on',website:''},action:'http://localhost:3000/api/enquiries',reportValidity:()=>true,querySelector:()=>button,setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(k,v){this[k]=v;},reset(){this.resetCalled=true;}};
 const errorClasses=new Set(),status={textContent:'',classList:{add:k=>errorClasses.add(k),remove:k=>errorClasses.delete(k)}};
 const document={querySelector:s=>s==='#enquiry-form'?form:s==='#enquiry-status'?status:null,querySelectorAll:()=>[],addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','script.js'),'utf8'),{document,window:{matchMedia:()=>({addEventListener(){}})},location:{pathname:'/contact.html',search:''},URLSearchParams,Date,AbortSignal,FormData:class{constructor(f){this.f=f;}get(k){return this.f.values[k];}},fetch});
 return {form,status,button,errorClasses};
}
test('successful submission shows receipt and resets only after server confirmation',async()=>{
 let request;const s=setup(async(url,options)=>{request={url,options};return {ok:true,json:async()=>({ok:true,message:'Received.',reference:'test-reference'})};});
 await s.form.submit({preventDefault(){}});assert.equal(request.url,s.form.action);assert.equal(JSON.parse(request.options.body).consent,true);assert.equal(s.form.resetCalled,true);assert(s.status.textContent.includes('test-reference'));assert.equal(s.button.disabled,false);assert(!s.form.dataset.submitting);
});
test('server errors retain the form and display a recoverable error',async()=>{
 const s=setup(async()=>({ok:false,json:async()=>({error:'Please try later.'})}));await s.form.submit({preventDefault(){}});assert(!s.form.resetCalled);assert.equal(s.form.values.message,'Need project support');assert.equal(s.status.textContent,'Please try later.');assert(s.errorClasses.has('form-error'));assert.equal(s.button.disabled,false);
});
test('network failure never claims success or clears visitor details',async()=>{
 const s=setup(async()=>{throw new TypeError('Network unavailable');});await s.form.submit({preventDefault(){}});assert(!s.form.resetCalled);assert(s.status.textContent.includes('could not confirm receipt'));assert(s.status.textContent.includes('91674'));assert.equal(s.button.disabled,false);
});
