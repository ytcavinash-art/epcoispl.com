const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){
 const handlers={},events={};let focused;
 function element(){const attrs={},classes=new Set();return {attrs,events:{},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),toggle(v,on){if(on)classes.add(v);else classes.delete(v);}},setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],addEventListener(k,v){this.events[k]=v;},focus(){focused=this;},querySelectorAll:()=>[]};}
 const menu=element(),nav=element(),toggle=element();toggle.parentElement=element();toggle.parentElement.contains=target=>target===toggle;menu.setAttribute('aria-expanded','false');toggle.setAttribute('aria-expanded','false');
 const document={querySelector:s=>s==='.menu'?menu:s==='#nav'?nav:null,querySelectorAll:()=>[toggle],addEventListener:(k,v)=>handlers[k]=v};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','script.js'),'utf8'),{document,window:{matchMedia:()=>({addEventListener:(k,v)=>events[k]=v})},location:{pathname:'/team.html',search:''},URLSearchParams,Date});
 return {menu,nav,toggle,handlers,events,focused:()=>focused};
}
test('Escape closes dropdown first, then mobile menu and restores focus',()=>{
 const s=setup();s.menu.events.click();assert(s.nav.classList.contains('open'));s.toggle.events.click();assert(s.toggle.parentElement.classList.contains('is-open'));
 s.handlers.keydown({key:'Escape',preventDefault(){}});assert(!s.toggle.parentElement.classList.contains('is-open'));assert(s.nav.classList.contains('open'));assert.equal(s.focused(),s.toggle);
 s.handlers.keydown({key:'Escape',preventDefault(){}});assert(!s.nav.classList.contains('open'));assert.equal(s.menu.getAttribute('aria-expanded'),'false');assert.equal(s.focused(),s.menu);
});
test('outside interaction and viewport changes close navigation',()=>{
 const s=setup();s.menu.events.click();s.handlers.click({target:{closest:()=>null}});assert(!s.nav.classList.contains('open'));
 s.menu.events.click();s.events.change();assert(!s.nav.classList.contains('open'));
 s.menu.events.click();s.handlers.focusin({target:{closest:()=>null}});assert(!s.nav.classList.contains('open'));
});
