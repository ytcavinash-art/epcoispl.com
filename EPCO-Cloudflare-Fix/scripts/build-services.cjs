// Regenerates the static service pages from the approved DOCX-derived catalogue.
// Source: 20261026-TPL -MEPF Scope-R2.docx. Site-specific staffing/DLP figures
// are deliberately not presented as general service commitments.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, body) => fs.writeFileSync(path.join(root, file), body, 'utf8');
const catalog = JSON.parse(read('assets/services-catalog.json'));
const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const source = read('services.html');
const header = source.match(/<header\b[\s\S]*?<\/header>/)[0];
const footer = source.match(/<footer\b[\s\S]*?<\/footer>/)[0];
const contact = source.match(/<section class="contact"[\s\S]*?<\/section>/)?.[0] || '';
const link = item => `${item.slug}.html`;
const cta = item => `contact.html?service=${encodeURIComponent(item.title)}#enquiry`;
function page(file, title, description, main) {
  write(file, `<!doctype html>
<html lang="en" id="top"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="style.css"><script defer src="script.js"></script><title>${esc(title)} | EPCO Integrated Solutions</title><meta name="description" content="${esc(description)}"></head><body>${header}<main>${main}</main>${footer}</body></html>\n`);
}
function cards(compact = false) {
  return `<div class="catalog-grid${compact ? ' catalog-grid-compact' : ''}">${catalog.map((item, i) => `<article class="catalog-card"><span class="catalog-number">${String(i+1).padStart(2,'0')}</span><h3><a href="${link(item)}">${esc(item.title)}</a></h3><p>${esc(item.summary)}</p><a class="catalog-link" href="${link(item)}">View service details<span class="sr-only">: ${esc(item.title)}</span></a></article>`).join('')}</div>`;
}
const boundary = `<aside class="scope-boundary"><h2>A scope built around your facility.</h2><p>Routine operation, inspection, preventive and corrective maintenance, and breakdown attendance are defined against your installed assets and facility boundary. Manpower, tools, routine consumables, testing, service hours and response times are confirmed in the contract.</p><p>Major capital replacements, upgrades, system modifications, statutory fees, OEM specialist services and major spares are separately agreed. Pump, STP, lift and solar maintenance may carry additional charges based on the approved scope and actual requirements.</p><a class="underlink" href="contact.html#enquiry">Discuss your facility scope</a></aside>`;
const delivery = `<section class="wrap catalog-section" id="project-delivery"><div class="label">PROJECT DELIVERY & SPECIALIST SUPPORT</div><h2>Support across the <em>asset lifecycle.</em></h2><p class="catalog-lead">Our technical facility services connect with EPCO's wider engineering, sourcing and project delivery capabilities.</p><div class="delivery-grid">${[
  ['engineering.html','Engineering','Design coordination, technical planning and building-system interfaces.'],
  ['procurement.html','Procurement','Sourcing coordination, materials, spares and vendor management.'],
  ['construction.html','Construction','Coordinated installation, project execution and handover.'],
  ['supply-trading.html','Supply & Trading','Civil, MEP, finishing, safety and facility materials, with supply or hire as agreed.'],
  ['project-management.html','Project Management','Programme, commercial controls, quality, safety and handover reporting.'],
  ['turnkey-solutions.html','Turnkey Solutions','Engineering through commissioning and handover under one coordinated scope.'],
  ['energy-sustainability.html','Energy & Sustainability','Energy studies, metering, efficiency improvements and green building support.'],
  ['operations.html','Integrated Facility Management','Daily operations, planned maintenance, people, records and reporting.']
].map(([url,title,text])=>`<article><h3><a href="${url}">${title}</a></h3><p>${text}</p><a class="catalog-link" href="${url}">Explore ${title}</a></article>`).join('')}</div></section>`;

page('services.html', 'Project Delivery & Facility Management Services', 'Explore EPCO engineering, procurement, construction, MEPF, energy, workplace and facility management services.', `
<section class="page-banner catalog-banner"><div class="wrap"><div class="label">EPCO SERVICES</div><h1>Project delivery.<br><em>Lifecycle support.</em></h1><p>Engineering, procurement and construction connected with building services, operations, maintenance and integrated facility management.</p><div class="catalog-actions"><a class="button" href="#service-categories">Explore building services</a><a class="underlink" href="#project-delivery">Explore project delivery</a><a class="underlink" href="operations.html">Integrated Facility Management</a></div></div></section>
<section class="wrap catalog-section" id="service-categories"><div class="catalog-heading"><div><div class="label">BUILDING & FACILITY SERVICES</div><h2>Find the expertise<br><em>your facility needs.</em></h2></div><p>Eight service areas covering system delivery, operation, maintenance and workplace support, with detailed activities and supporting resources.</p></div>${cards()}<p class="catalog-footnote">Service coverage is tailored to the site's systems, asset list and agreed contract.</p></section>
<section class="catalog-band"><div class="wrap catalog-section"><div class="label">HOW WE DELIVER</div><h2>Planned. Responsive.<br><em>Accountable.</em></h2><div class="delivery-grid"><article><h3>Operate & inspect</h3><p>Equipment rounds, readings, alarms and daily checks across your building systems.</p></article><article><h3>Maintain & restore</h3><p>Scheduled servicing, corrective repairs and breakdown attendance under agreed SLAs.</p></article><article><h3>Measure & improve</h3><p>Asset records, utility tracking, compliance coordination and monthly performance reports.</p></article></div><a class="underlink" href="maintenance-asset-management.html">Explore our maintenance framework</a></div></section>
${delivery}<section class="wrap catalog-section catalog-boundary-section">${boundary}</section>${contact}`);

for (const item of catalog) {
  const toc = item.groups.map((group,i)=>`<a href="#scope-${i+1}">${esc(group.title)}</a>`).join('');
  page(link(item), item.title, item.summary, `
<section class="page-banner catalog-banner"><div class="wrap"><nav class="catalog-breadcrumb" aria-label="Breadcrumb"><a href="services.html">Services</a><span aria-hidden="true">/</span><span>${esc(item.short)}</span></nav><div class="label">TECHNICAL & FACILITY SERVICES</div><h1>${esc(item.title)}</h1><p>${esc(item.summary)}</p><a class="button" href="${cta(item)}">Discuss this service</a></div></section>
<div class="wrap catalog-detail-layout"><aside class="catalog-sidebar"><p class="label">ON THIS PAGE</p><nav aria-label="Service sections">${toc}<a href="#resources">${item.slug === 'maintenance-asset-management' ? 'Reports & deliverables' : 'Equipment, tools & support'}</a></nav><a class="catalog-back" href="services.html#service-categories">View all service categories</a></aside><div class="catalog-detail-content">${item.groups.map((group,i)=>`<section class="catalog-scope" id="scope-${i+1}"><span class="catalog-number">${String(i+1).padStart(2,'0')}</span><h2>${esc(group.title)}</h2><ul>${group.items.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></section>`).join('')}
<section class="catalog-resources" id="resources"><div class="label">${item.slug === 'maintenance-asset-management' ? 'MEASURABLE DELIVERY' : 'SUPPORTING RESOURCES'}</div><h2>${item.slug === 'maintenance-asset-management' ? 'Reports & deliverables' : 'Equipment, tools & support'}</h2><p>${item.slug === 'maintenance-asset-management' ? 'The reporting framework is agreed for your facility and may include:' : 'Equipment covered and resources planned for the agreed work may include:'}</p><ul>${item.resources.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></section>
<aside class="catalog-note"><h3>Scope & service coordination</h3><p>${esc(item.note)}</p><p>Supply of materials, tools, spares and specialist services is confirmed in the contract. Equipment listed here describes service coverage and planned resources.</p></aside><div class="catalog-actions"><a class="button" href="${cta(item)}">Request a tailored scope</a><a class="underlink" href="operations.html">Our FM delivery approach</a></div></div></div>
<section class="catalog-band"><div class="wrap catalog-section"><div class="label">CONNECTED EXPERTISE</div><h2>Explore related <em>services.</em></h2><div class="catalog-related">${catalog.filter(other=>other.slug!==item.slug).map(other=>`<a href="${link(other)}">${esc(other.title)}</a>`).join('')}</div></div></section>`);
}

const maintenance = catalog.find(item=>item.slug === 'maintenance-asset-management');
page('operations.html', 'Integrated Facility Management', 'EPCO integrated facility management: MEPF operations, planned maintenance, helpdesk, workplace support, utilities, asset records and reporting.', `
<section class="page-banner catalog-banner"><div class="wrap"><div class="label">OPERATIONS & FACILITY MANAGEMENT</div><h1>One team.<br><em>Everyday reliability.</em></h1><p>Connected management of building systems, workplace services and maintenance, shaped around your facility's assets and operating needs.</p><a class="button" href="contact.html?service=Integrated%20Facility%20Management#enquiry">Plan your facility services</a></div></section>
<section class="wrap catalog-section"><div class="catalog-heading"><div><div class="label">INTEGRATED COVERAGE</div><h2>Technical depth.<br><em>Coordinated delivery.</em></h2></div><p>From HVAC and power to workplace support, each discipline connects through shared maintenance planning, helpdesk and reporting.</p></div>${cards(true)}</section>
<section class="catalog-band"><div class="wrap catalog-section"><div class="label">THE OPERATING FRAMEWORK</div><h2>Clear responsibilities.<br><em>Visible performance.</em></h2><div class="delivery-grid">${maintenance.groups.map(group=>`<article><h3>${esc(group.title)}</h3><ul>${group.items.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></article>`).join('')}</div></div></section>
<section class="wrap catalog-section"><div class="label">REPORTS & RECORDS</div><h2>Know your assets.<br><em>Track the work.</em></h2><div class="catalog-deliverables">${maintenance.resources.map(text=>{const [title,...body]=text.split(':');return `<article><h3>${esc(title)}</h3><p>${esc(body.join(':').trim())}</p></article>`}).join('')}</div></section>
<section class="catalog-band"><div class="wrap catalog-section"><div class="label">SITE-SPECIFIC DELIVERY</div><h2>The right team<br><em>for your facility.</em></h2><div class="delivery-grid"><article><h3>Leadership & discipline leads</h3><p>Facility and operations management, supported by HVAC, electrical/ELV, plumbing/PHE and fire-safety leads as needed.</p></article><article><h3>Supervision & support</h3><p>Helpdesk/CMMS, EHS, energy monitoring, MIS and administration coordinate work orders, service records and safe execution.</p></article><article><h3>On-site technical teams</h3><p>HVAC operators, electricians, plumbers, STP operators, fire technicians, ELV/BMS technicians and stores support, deployed through the agreed staffing model.</p></article></div><p class="catalog-footnote">In-house and specialist-partner responsibilities, shifts and round-the-clock coverage are agreed for each site. Headcount, DLP responsibilities and response targets are project-specific.</p></div></section>
<section class="wrap catalog-section">${boundary}</section>${contact}`);

// Add a visible route from the homepage while retaining its existing project-delivery section.
let home = read('index.html').replace(/<section class="home-technical-services"[\s\S]*?<\/section>/g, '');
home = home.replace('<section class="contact"', `<section class="home-technical-services"><div class="wrap catalog-section"><div class="catalog-heading"><div><div class="label">MEPF & FACILITY MANAGEMENT</div><h2>Specialist services.<br><em>One connected team.</em></h2></div><p>Explore our detailed technical and workplace service coverage, organised by building system.</p></div>${cards(true)}<a class="underlink" href="services.html">Explore all EPCO services</a></div></section><section class="contact"`);
write('index.html', home);

// Preserve the reference header; expand only its Services dropdown on every page.
const menu = `<div class="nav-dropdown nav-services-dropdown" id="services-menu"><a href="services.html">All services</a><a href="operations.html">Integrated Facility Management</a><span class="nav-menu-label">Technical & workplace services</span>${catalog.map(item=>`<a href="${link(item)}">${esc(item.title)}</a>`).join('')}<a href="energy-sustainability.html">Energy &amp; Sustainability</a><span class="nav-menu-label">Project delivery</span><a href="engineering.html">Engineering</a><a href="procurement.html">Procurement</a><a href="supply-trading.html">Supply &amp; Trading</a><a href="construction.html">Construction</a><a href="project-management.html">Project Management</a><a href="turnkey-solutions.html">Turnkey Solutions</a></div>`;
for (const file of fs.readdirSync(root).filter(file=>file.endsWith('.html'))) {
  let html = read(file).replace(/<div class="nav-dropdown(?: nav-services-dropdown)?" id="services-menu">[\s\S]*?<\/div>/, menu);
  if(file === 'contact.html') {
    const options = ['General enquiry','Engineering','Procurement','Supply & Trading','Construction','Project Management','Turnkey Solutions','Energy & Sustainability','Integrated Facility Management',...catalog.map(item=>item.title)];
    html = html.replace(/<select id="enquiry-service" name="service">[\s\S]*?<\/select>/, `<select id="enquiry-service" name="service">${options.map(option=>`<option value="${esc(option)}">${esc(option)}</option>`).join('')}</select>`);
  }
  write(file, html);
}
console.log(`Generated ${catalog.length} service detail pages, Services and Operations hubs; updated homepage, menus and enquiry options.`);
