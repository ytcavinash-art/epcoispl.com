// Public website copy adapted from the user-supplied company profile.
// The original presentation must never be copied into the website or linked.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s,'utf8');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const shell=read('services.html');
const header=shell.match(/<header\b[\s\S]*?<\/header>/)[0],footer=shell.match(/<footer\b[\s\S]*?<\/footer>/)[0];
function page(file,title,description,main){write(file,`<!doctype html><html lang="en" id="top"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="style.css"><script defer src="script.js"></script><title>${esc(title)} | EPCO Integrated Solutions</title><meta name="description" content="${esc(description)}"></head><body>${header}<main>${main}</main>${footer}</body></html>\n`);}
const profiles=[
 {slug:'engineering',title:'Engineering',summary:'Scope definition, coordinated design and technical planning before mobilisation.',groups:[
 ['Design coordination','Architectural, structural and MEP interface coordination, with discipline clash resolution.'],
 ['BOQ & estimation','Measured quantities, rate build-ups and budget substantiation.'],
 ['Value engineering','Alternative solutions assessed against capital cost, constructability and operating cost.'],
 ['Methodology & sequencing','Method statements, temporary-works planning and site logistics.'],
 ['Scheduling & MIS','Baseline programmes, look-ahead planning and progress reporting.'],
 ['Technical submittals','Material approvals, shop drawings and consultant comment closure.']]},
 {slug:'procurement',title:'Procurement',summary:'Specification, vendor capability, commercial terms and delivery planning managed as one project function.',groups:[
 ['Vendor development','Supplier qualification, capacity assessment and performance-history review.'],
 ['RFQ & comparison','Like-for-like technical and commercial evaluation of vendor quotations.'],
 ['Negotiation','Price, payment terms, warranty and delivery commitments considered together.'],
 ['Bulk procurement','Volume aggregation across packages to support landed-cost control.'],
 ['Quality verification','Pre-dispatch checks, test certificates and site acceptance coordination.'],
 ['Logistics & tracking','Dispatch visibility and delivery sequencing against the mobilisation programme.']]},
 {slug:'construction',title:'Construction',summary:'Civil, structural and finishing packages delivered with site supervision and documented safety, quality, cost and schedule controls.',groups:[
 ['Earthwork & foundations','Excavation, shoring, piling interfaces, footings and raft foundations.'],
 ['RCC & structural works','Frames, slabs, cores and structural-steel packages.'],
 ['Masonry & finishes','Blockwork, plaster, flooring, cladding and joinery.'],
 ['Waterproofing','Basements, terraces and wet areas, with system and warranty terms defined in the agreed package.'],
 ['External development','Roads, drainage, boundary works, hardscape and utility interfaces.'],
 ['Renovation & turnkey works','Occupied-premises works, fit-outs and phased handover.']]},
 {slug:'supply-trading',title:'Supply & Trading',summary:'Sourcing across manufacturers, authorised distributors and specialist vendors for civil, MEP, finishing, safety and facility requirements.',groups:[
 ['Civil & structural materials','Cement, reinforcement steel, aggregates, blocks, structural sections and formwork systems; bulk or scheduled supply.'],
 ['MEP materials','Cables, switchgear, panels, pipes, valves, ducting, pumps, fittings and supports matched to project specifications.'],
 ['Finishes & hardware','Tiles, stone, paints, doors, glazing, architectural hardware and false-ceiling systems against approved samples.'],
 ['Construction chemicals','Waterproofing systems, admixtures, repair mortars, sealants and curing compounds from approved brands.'],
 ['Machinery & equipment','Batching, lifting, compaction, power-generation and specialist tooling requirements, on a supply or hire basis as agreed.'],
 ['Safety & site consumables','PPE, edge protection, signage, scaffolding, fire-safety items and recurring site consumables.']]},
 {slug:'project-management',title:'Project Management',summary:'Coordinated control of people, materials, vendors, milestones and commercial decisions from mobilisation through handover.',groups:[
 ['Planning & MIS','Baseline and look-ahead programmes, earned progress, variance analysis and daily progress logs.'],
 ['Commercial control','Budget-versus-commitment tracking, documented variations and cash-flow forecasts.'],
 ['Quality','Inspection plans, checklists, non-conformance closure and test records.'],
 ['Safety','Risk assessments, permit coordination, toolbox talks and incident reporting.'],
 ['Interface coordination','Consultant, authority, owner-team and contractor interfaces with defined escalation routes.'],
 ['Handover & defect closure','Snag closure, as-built records, warranties, O&M manuals and training, with defect-liability responsibilities defined in the package.']],extra:'Reporting can include daily progress logs, weekly programme reviews, monthly cost and MIS packs, quality/safety registers and milestone certification, on the cadence agreed with the owner.'},
 {slug:'turnkey-solutions',title:'Turnkey Solutions',summary:'Engineering, procurement, construction, commissioning and post-completion support within one coordinated delivery structure.',groups:[
 ['Concept & budget','Confirm the brief, feasibility, site constraints, scope and budget basis.'],
 ['Engineering','Coordinate design, quantities, specifications and execution methodology.'],
 ['Procurement','Align vendor awards, long-lead orders, logistics and mobilisation with the programme.'],
 ['Execution','Manage discipline interfaces, sequencing, supervision and project controls.'],
 ['Commissioning','Coordinate system testing, statutory approval liaison and snag closure within the agreed scope.'],
 ['Handover','Complete documentation, asset records, training, warranties and the transition to maintenance.']],extra:'A single contract, programme and escalation route can cover the agreed disciplines. This model supports time-bound developments, industrial facilities and fit-outs where the owner needs coordinated delivery.'},
 {slug:'energy-sustainability',title:'Energy & Sustainability',summary:'Energy and green building support informed by measured consumption, operating requirements and the expected payback of proposed improvements.',groups:[
 ['Energy studies','Baseline audits, load profiling and conservation measures assessed against payback.'],
 ['Green building support','Certification support, material selection and supporting documentation.'],
 ['Indoor air quality','Fresh-air rates, filtration and contaminant-control measures.'],
 ['Energy monitoring','Sub-metering, consumption attribution and utility reporting.'],
 ['Efficiency measures','Lighting, motor and pump retrofits, with review of control strategies.'],
 ['Energy storage','Selected applications for resilience and peak-load management, subject to project requirements.']],extra:'Recommendations are developed against the site baseline and agreed engineering scope. Certification decisions remain with the relevant assessing body.'}
];
for(const p of profiles){page(`${p.slug}.html`,p.title,p.summary,`<section class="page-banner catalog-banner"><div class="wrap"><nav class="catalog-breadcrumb" aria-label="Breadcrumb"><a href="services.html">Services</a><span aria-hidden="true">/</span><span>${esc(p.title)}</span></nav><div class="label">${p.slug==='energy-sustainability'?'SPECIALIST SUPPORT':'PROJECT DELIVERY'}</div><h1>${esc(p.title)}</h1><p>${esc(p.summary)}</p><a class="button" href="contact.html?service=${encodeURIComponent(p.title)}#enquiry">Discuss your requirements</a></div></section><section class="wrap catalog-section"><div class="label">OUR SCOPE</div><h2>${p.slug==='energy-sustainability'?'Efficiency across':'Support across'}<br><em>the agreed scope.</em></h2><div class="catalog-deliverables">${p.groups.map(([title,text])=>`<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div>${p.extra?`<p class="catalog-footnote">${esc(p.extra)}</p>`:''}<div class="catalog-actions"><a class="button" href="contact.html?service=${encodeURIComponent(p.title)}#enquiry">Request a tailored scope</a><a class="underlink" href="services.html">Explore all services</a></div></section><section class="catalog-band"><div class="wrap catalog-section"><div class="label">CONNECTED DELIVERY</div><h2>Continue through<br><em>the asset lifecycle.</em></h2><div class="catalog-related">${profiles.filter(o=>o.slug!==p.slug).map(o=>`<a href="${o.slug}.html">${esc(o.title)}</a>`).join('')}<a href="operations.html">Integrated Facility Management</a></div></div></section>`);}
const stages=[
 ['Requirement & feasibility','Confirm the brief, site constraints, options and initial cost basis.'],
 ['Engineering & budgeting','Coordinate the design, BOQ, value engineering and approved budget.'],
 ['Procurement & mobilisation','Plan awards, long-lead orders, site establishment and labour deployment.'],
 ['Construction & controls','Execute against the programme, quality plan and cost reports.'],
 ['Testing & commissioning','Coordinate system tests, approval liaison, snag closure and documentation.'],
 ['Handover & operations','Prepare asset records, training, warranty management and maintenance mobilisation.']
];
const reasons=[
 ['Single-window delivery','One accountable partner across the disciplines included in the contract.'],
 ['Quality & safety','Inspection and safety performance documented, reported and available for review.'],
 ['Commercial discipline','Substantiated budgets, recorded variations and cash forecasts.'],
 ['Lifecycle support','Project delivery connected with maintenance and ongoing facility operations.'],
 ['Responsive execution','Site decisions supported by clear responsibility and escalation routes.'],
 ['Client-focused coordination',"Reporting and review routines aligned with the owner's governance requirements."]
];
page('about.html','About EPCO','EPCO brings engineering, procurement, construction, operations and integrated facility management together across the project lifecycle.',`<section class="page-banner"><div class="wrap"><div class="label">ABOUT EPCO</div><h1>Integrated capability.<br><em>Single accountability.</em></h1><p>Engineering, Procurement, Construction and Operations, connected from the first requirement to everyday asset performance.</p></div></section><section class="intro wrap" id="about"><div><div class="label">WHO WE ARE</div><h2>One organisation.<br><em>A connected lifecycle.</em></h2></div><div class="intro-copy"><p class="lead">EPCO Integrated Solutions brings project delivery, maintenance and facility management within one coordinated delivery structure.</p><p>Our work connects engineering judgement, sourcing, site execution and long-term operations. Technical, commercial and operational decisions are planned together, with a clear programme and responsibility for the agreed scope.</p><p>We support owners managing cost, schedule and operating requirements across new projects and existing facilities.</p><a class="underlink" href="services.html">Explore our capabilities</a><a class="underlink team-link" href="team.html">Meet our team</a></div></section><section class="catalog-band"><div class="wrap catalog-section"><div class="label">WHAT EPCO STANDS FOR</div><h2>Four capabilities.<br><em>One project lifecycle.</em></h2><div class="delivery-grid">${[
 ['Engineering','Scope definition, design coordination, value engineering and execution methodology.','engineering.html'],
 ['Procurement','Specifications, vendor development, commercial evaluation and logistics.','procurement.html'],
 ['Construction','Civil, structural, finishing and building-system execution with project controls.','construction.html'],
 ['Operations','Maintenance, facility management and asset lifecycle planning.','operations.html']
].map(([title,text,url])=>`<article><h3>${title}</h3><p>${text}</p><a class="catalog-link" href="${url}">Explore ${title}</a></article>`).join('')}</div></div></section><section class="wrap catalog-section" id="delivery-model"><div class="label">OUR DELIVERY MODEL</div><h2>From requirement<br><em>to lifecycle support.</em></h2><p class="catalog-lead">Six stages align engineering decisions, procurement, execution and operating needs to the same brief.</p><div class="catalog-deliverables">${stages.map(([title,text],i)=>`<article><span class="catalog-number">STAGE ${String(i+1).padStart(2,'0')}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div></section><section class="catalog-band" id="approach"><div class="wrap catalog-section"><div class="label">WHY EPCO</div><h2>Clear coordination.<br><em>Accountable delivery.</em></h2><div class="catalog-deliverables">${reasons.map(([title,text])=>`<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div><div class="catalog-actions"><a class="button" href="contact.html">Discuss your project</a><a class="underlink" href="sectors.html">Industries we serve</a></div></div></section>`);

// Use the supplied office address separately from the existing registered office.
const office='<div class="profile-office"><small>OFFICE</small><p>A103 Bldg No1 5 41-P 4, Shastri Bunglow Andheri W, Andheri Railway Station, Mumbai, Mumbai- 400058, Maharashtra</p></div>';
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){let html=read(file);
 if(html.includes('class="contact-details"')&&!html.includes('class="profile-office"'))html=html.replace('<div class="contact-details">',`<div class="contact-details">${office}`);
 if(!html.includes('class="footer-office"'))html=html.replace('<h2>Contact</h2>','<h2>Contact</h2><div class="footer-office"><p><strong>Office</strong><br>A103 Bldg No1 5 41-P 4, Shastri Bunglow Andheri W, Andheri Railway Station, Mumbai, Mumbai- 400058, Maharashtra</p></div>');
 html=html.replace(/<footer\b[\s\S]*?<\/footer>/,part=>part.replace('<p>B/301, Sky Heights, Evershine City,','<p><strong>Registered office</strong><br>B/301, Sky Heights, Evershine City,'));
 if(file==='contact.html'){
   html=html.replace(/<section class="wrap profile-office-section catalog-section">[\s\S]*?<\/section>/g,'');
   const officeSection='<section class="wrap profile-office-section catalog-section"><div class="label">MUMBAI OFFICE</div><h2>Connect with <em>EPCO.</em></h2><p>A103 Bldg No1 5 41-P 4, Shastri Bunglow Andheri W, Andheri Railway Station, Mumbai, Mumbai- 400058, Maharashtra</p><a class="underlink" href="https://www.google.com/maps/search/?api=1&amp;query=A103%20Bldg%20No1%205%2041-P%204%2C%20Shastri%20Bunglow%20Andheri%20W%2C%20Andheri%20Railway%20Station%2C%20Mumbai%2C%20Mumbai-%20400058%2C%20Maharashtra" target="_blank" rel="noopener noreferrer">View Mumbai office on Google Maps</a></section>';
   html=html.replace('<section class="wrap location-section">',officeSection+'<section class="wrap location-section">');
 }
 write(file,html);
}
// Keep the homepage's existing visual design; make its introduction more specific.
let home=read('index.html');
home=home.replace('EPCO Integrated Solutions brings project delivery and lifecycle operations together. We coordinate disciplines, manage interfaces and maintain continuity from the first plan to the day-to-day performance of the finished asset.','EPCO Integrated Solutions brings Engineering, Procurement, Construction and Operations together, including maintenance and integrated facility management. Our delivery model connects scope definition, sourcing, site execution, commissioning and ongoing asset support under one line of accountability.');
write('index.html',home);
console.log('Updated About, seven delivery/specialist pages, homepage introduction and office details. No source presentation or download link was added.');
