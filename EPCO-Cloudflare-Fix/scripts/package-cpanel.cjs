const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const base=new URL(process.env.DEPLOY_SITE_URL||'https://epcoispl.com/');
if(!base.pathname.endsWith('/'))base.pathname+='/';
const releases=path.join(root,'releases');fs.mkdirSync(releases,{recursive:true});
// Create a unique staging directory; never clear the working website or prior releases.
const output=fs.mkdtempSync(path.join(releases,'cpanel-'));
const htmlFiles=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
const assets=new Set();
for(const file of htmlFiles){let html=fs.readFileSync(path.join(root,file),'utf8');
 html=html.replaceAll('https://www.epcoispl.com/in/',base.href);
 if(file==='contact.html')html=html.replace('action="api/enquiries"','action="api/enquiries.php"');
 if(file==='privacy.html')html=html.replace('through scheduled housekeeping while the service is running','through housekeeping when enquiries are processed or by a configured scheduled task');
 for(const match of html.matchAll(/assets\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp|svg|ico)/g))assets.add(match[0]);
 fs.writeFileSync(path.join(output,file),html);
}
for(const file of ['style.css','script.js','favicon.svg'])fs.copyFileSync(path.join(root,file),path.join(output,file));
fs.mkdirSync(path.join(output,'assets'));for(const asset of assets)fs.copyFileSync(path.join(root,asset),path.join(output,asset));
fs.writeFileSync(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${htmlFiles.sort().map(file=>`<url><loc>${new URL(file==='index.html'?'':file,base).href}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(output,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: ${base.pathname}api/\nSitemap: ${new URL('sitemap.xml',base).href}\n`);
fs.copyFileSync(path.join(root,'hosting/cpanel/.htaccess'),path.join(output,'.htaccess'));
const services=['General enquiry','Engineering','Procurement','Supply & Trading','Construction','Project Management','Turnkey Solutions','Energy & Sustainability','Integrated Facility Management','Careers',...JSON.parse(fs.readFileSync(path.join(root,'assets/services-catalog.json'),'utf8')).map(item=>item.title)];
const phpArray='['+services.map(s=>"'"+s.replaceAll('\\','\\\\').replaceAll("'","\\'")+"'").join(', ')+']';
fs.mkdirSync(path.join(output,'api'));fs.writeFileSync(path.join(output,'api/enquiries.php'),fs.readFileSync(path.join(root,'hosting/cpanel/enquiries.php'),'utf8').replace('__SERVICE_LIST__',phpArray));
const manifest={directory:output,site_url:base.href,pages:htmlFiles.length,assets:assets.size};
fs.writeFileSync(path.join(releases,'latest-cpanel.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest));
