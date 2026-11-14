const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output=path.join(root,'public-cloudflare');
const base=new URL(process.env.DEPLOY_SITE_URL||process.env.SITE_URL||'https://epcoispl.com/');if(!base.pathname.endsWith('/'))base.pathname+='/';
if(base.pathname!=='/')throw new Error('Cloudflare package expects a domain root URL, for example https://epcoispl.com/.');
if(!/^https?:$/.test(base.protocol))throw new Error('Invalid website URL.');
// Build into a clean public-only staging folder. Originals and private files stay outside it.
if(fs.existsSync(output)){const resolved=fs.realpathSync(output);if(resolved!==path.resolve(root,'public-cloudflare')||!resolved.startsWith(root+path.sep))throw new Error('Unsafe output path.');fs.rmSync(resolved,{recursive:true});}
fs.mkdirSync(path.join(output,'assets'),{recursive:true});
const pages=fs.readdirSync(root).filter(file=>file.endsWith('.html'));const assets=new Set();
for(const file of pages){let html=fs.readFileSync(path.join(root,file),'utf8').replaceAll('https://www.epcoispl.com/in/',base.href);
 if(file==='privacy.html')html=html.replace('a private server-side enquiry register','a private Cloudflare Durable Object enquiry register');
 html=html.replace('action="api/enquiries.php"','action="api/enquiries"');
 fs.writeFileSync(path.join(output,file),html);
 for(const match of html.matchAll(/assets\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp|svg|ico)/g))assets.add(match[0]);
}
for(const asset of assets)fs.copyFileSync(path.join(root,asset),path.join(output,asset));
for(const file of ['style.css','script.js','favicon.svg'])fs.copyFileSync(path.join(root,file),path.join(output,file));
const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').replaceAll('https://www.epcoispl.com/in/',base.href);fs.writeFileSync(path.join(output,'sitemap.xml'),xml);
fs.writeFileSync(path.join(output,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${new URL('sitemap.xml',base).href}\n`);
fs.writeFileSync(path.join(output,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'\n`);
console.log(`Cloudflare public assets prepared: ${pages.length} pages, ${assets.size} images, domain ${base.href}. Private data and source documents excluded.`);
