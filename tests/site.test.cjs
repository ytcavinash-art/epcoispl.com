const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('every local page has complete metadata, accessible entry and valid links',()=>{
 const files=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
 assert.equal(files.length,30);
 for(const file of files){const html=read(file);assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,file);for(const token of ['rel="canonical"','property="og:title"','property="og:description"','property="og:image"','name="twitter:card"','href="favicon.svg"','class="skip-link"','id="main-content"'])assert(html.includes(token),`${file}: ${token}`);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,`${file}: duplicate IDs`);
 for(const [,value] of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(/^(https?:|mailto:|tel:|data:)/.test(value)||value==='api/enquiries')continue;const [pathname,hash]=value.split('#'),target=pathname.split('?')[0]||file;assert(fs.existsSync(path.join(root,target)),`${file}: ${value}`);if(hash&&target.endsWith('.html'))assert(read(target).includes(`id="${hash}"`),`${file}: ${value}`);}
 assert(!/href="[^"]*\.pptx|<div class="label(?: light)?">\d+\s*\//i.test(html),file);
 }
 assert.equal((read('sitemap.xml').match(/<loc>/g)||[]).length,30);
});
test('form and editorial content match the implemented server workflow',()=>{
 const contact=read('contact.html');assert.equal((contact.match(/name="consent"/g)||[]).length,1);assert.equal((contact.match(/name="website"/g)||[]).length,1);assert.equal((contact.match(/id="enquiry-status"/g)||[]).length,1);assert.equal((contact.match(/<noscript>/g)||[]).length,1);assert(contact.includes('action="api/enquiries"'));assert(!contact.includes('Prepare enquiry email'));assert(read('script.js').includes('fetch(form.action'));
 for(const file of ['privacy.html','terms.html','blogs.html','announcements.html'])assert(!/draft|published here soon|not a complete privacy|should obtain review/i.test(read(file)),file);
 assert(read('blogs.html').includes('id="project-brief"'));assert(read('announcements.html').includes('datetime="2026-11-13"'));
 assert(read('team.html').indexOf('class="team-profiles"')<read('team.html').indexOf('class="wrap team-intro"'));
});
test('responsive photos are small and originals are no longer page sources',()=>{
 for(const [file,stem]of [['index.html','engineering-bim-team'],['team.html','subramanian-sekar']]){const h=read(file);assert(!h.includes(`src="assets/${stem}.png"`));assert(h.includes(`srcset="assets/${stem}-`));}
 for(const name of ['engineering-bim-team-480.jpg','engineering-bim-team-960.jpg','subramanian-sekar-420.jpg','subramanian-sekar-840.jpg'])assert(fs.statSync(path.join(root,'assets',name)).size<160000,name);
});
test('reported small-text contrast pairs exceed 4.5:1 after correction',()=>{
 const luminance=hex=>{const rgb=hex.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 for(const [fg,bg]of [['456b75','ffffff'],['53676f','f3f6f4'],['53676f','f5f7f5'],['33565c','b8cfd0'],['92501f','ffffff']]){const a=luminance(fg),b=luminance(bg);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${fg}/${bg}`);}
});
