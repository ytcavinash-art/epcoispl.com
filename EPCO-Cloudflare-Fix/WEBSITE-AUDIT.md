# EPCO website audit

## Remediation update — 13 November 2026

The original findings below are retained as the audit record. Subsequent implementation addressed the listed issues:

- Direct enquiry submission now uses a Node endpoint and a private server-side register, with receipt references, server validation, rate limiting, a honeypot and visible error feedback. It no longer requires an email application.
- Optional Resend notifications are implemented. Credentials/verified sender are not configured; real inbox delivery remains unverified. Saved enquiries can be reviewed with `npm run enquiries`.
- Reported contrast pairs have been corrected, along with additional banner, menu-label and contact-heading colours. Targeted checks exceed the applicable text contrast thresholds; no full accessibility certification is claimed.
- Responsive engineering photos are 40,754 / 130,177 bytes (480 / 960 pixels); CEO photos are 24,494 / 96,812 bytes (420 / 840 pixels). Originals are preserved and are no longer used as page sources.
- Privacy and website terms now describe the implemented behaviour; editorial draft notices were removed. Blogs contain practical articles; Announcements records actual website updates; Careers has a dedicated expression-of-interest path without inventing vacancies.
- All 30 pages have canonical/social metadata and a favicon. A 30-page sitemap and robots sitemap reference are generated. The default public URL comes from the supplied profile and must match the deployment configuration.
- Skip links, keyboard dismissal/focus restoration and outside-focus handling were added. Global header-menu styling is scoped to avoid affecting article or breadcrumb navigation.
- The public server blocks source files, audit reports, environment configuration and private enquiry records. It supports compression, cache revalidation and response security headers.
- A repeatable build preserves these changes. Eighteen automated tests cover server persistence/errors, notification integration with a mocked provider, private-path blocking, retention, navigation/form behaviour, metadata, links and image sizes.

The localhost preview runs the new backend. Browser access remains unavailable, so mobile visual inspection, Lighthouse and real inbox delivery are not represented as passing. Production publication, final domain configuration and company approval of policy wording remain separate release tasks. Setup instructions are in `README.md`.

---

Date: 13 November 2026 (Asia/Calcutta)

Scope: current local website at http://localhost:3000, its 30 HTML pages, CSS, JavaScript, assets and content-generation scripts. This was a read-only website audit; no website content was changed.

## Assessment

The core pages and internal navigation references are intact. The site still needs enquiry-delivery, accessibility, image and publication-content improvements before a public launch. No Lighthouse score or mobile visual pass is claimed: the browser access host was unavailable.

Priorities below describe impact on this website, rather than a formal security or legal rating.

## Priority findings

### 1. High — Enquiries depend entirely on a configured email application

Evidence: `script.js` cancels the form submission and assigns a `mailto:` URL to `window.location.href`. `contact.html` explicitly says the visitor must send the message from their email app. There is no server submission, receipt confirmation, stored enquiry or alternative web submission path.

Impact: completing the form does not deliver an enquiry. Visitors without a configured mail handler may leave without contacting EPCO. This is a limitation of the current implementation, rather than a broken promised submission feature.

Action: add a properly configured enquiry endpoint or form service with validation, delivery/error feedback and abuse controls. Retain phone/email alternatives. Verify receipt in the intended inbox before treating it as live.

### 2. High — Some small text has insufficient contrast

Calculated from current CSS foreground/background colours:

| Example | Colour pair | Contrast |
| --- | --- | --- |
| Section labels on white | `#61858e` / `#ffffff` | 4.00:1 |
| Homepage service descriptions | `#758388` / `#f3f6f4` | 3.60:1 |
| Footer descriptions | `#6d8084` / `#f5f7f5` | 3.85:1 |

These examples use small text sizes and fall below the 4.5:1 minimum for normal text described in [W3C's contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). This is a targeted source-based calculation, not a complete accessibility certification.

Action: darken small-text colours while preserving the existing palette; recheck every text/background combination and focus state in the browser.

### 3. Medium — Two supplied PNG photographs are large for their display sizes

Evidence:

- `assets/engineering-bim-team.png`: 2,559,611 bytes, displayed as a small homepage service-card image.
- `assets/subramanian-sekar.png`: 2,582,843 bytes, displayed at up to 420 CSS pixels wide on desktop.
- Neither has responsive `srcset`/`sizes` variants.

Impact: unnecessary transfer and decoding work, particularly on mobile connections. The engineering photo dominates the homepage's approximately 3.27 MB of unique referenced image files if all its images are fetched; this is not a measurement of initial load or Core Web Vitals. Lazy loading is already present on homepage service images.

Action: create appropriately sized WebP/AVIF variants without altering the supplied photos, and serve responsive versions. Confirm quality and crop on mobile and desktop.

### 4. Medium — Publication content is unfinished

Evidence:

- `privacy.html` explicitly says it is not a complete privacy policy and requires an approved policy before launch.
- `terms.html` contains a draft-for-review notice and an instruction to approve final terms.
- `blogs.html` and `announcements.html` contain holding text rather than articles/announcements.
- `careers.html` offers a general contact path but no roles or dedicated application information.

Impact: the header presents several pages as destinations with very little content. Internal review notes are visible to visitors.

Action: obtain approved policy copy and replace visible editorial instructions. Publish actual content for the placeholder destinations, or make an intentional decision about their visibility. This audit does not assess legal sufficiency.

### 5. Medium — Search and sharing metadata are incomplete

Evidence: all 30 pages lack canonical tags and Open Graph metadata; no `sitemap.xml` or favicon is present. `robots.txt` allows crawling but provides no sitemap location. Organisation JSON-LD exists on the homepage; the other pages do not include structured data.

Impact: preferred URL signals and controlled social-sharing previews are absent. These omissions do not prove an indexing or ranking failure.

Action: once the production domain is confirmed, add page-specific canonicals, a sitemap and suitable social metadata/images. Add a favicon. Extend structured data only where it accurately describes visible content; it is not necessary to add schema to every page.

### 6. Medium — Keyboard navigation can be improved

Evidence: no page has a skip-to-content link. The repeated navigation includes a long Services dropdown. `script.js` handles Escape for submenus but does not close the main mobile menu or restore focus to its toggle.

Impact: keyboard users have more work reaching page content, and mobile-menu dismissal is less convenient.

Action: add a focus-visible skip link targeting the main content and improve mobile menu dismissal/focus behaviour. Existing main/nav landmarks and headings are useful; absence of a skip link alone is not claimed as a definitive WCAG failure. See [W3C bypass-block guidance](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html).

### 7. Low — Styling and content generation are becoming harder to maintain

Evidence: `style.css` contains repeated global `nav` media-query rules at 800, 1080 and 1200 pixels, plus later overrides. Breadcrumb navigation requires several `!important` declarations to override shared navigation styling. The content-generation scripts obtain their header/footer templates from an already-generated `services.html`.

Impact: future edits are more likely to have unintended effects or depend on the order in which scripts run. No specific responsive rendering failure is asserted without browser inspection.

Action: scope menu rules to the header, consolidate breakpoints, and use an explicit shared template/source for generated page shells.

### 8. Content confirmation — Homepage group affiliation

Evidence: the homepage displays “Delta Group Of Company”. This affiliation was not established in the company-profile text inspected during the preceding update.

Action: confirm the exact group name and affiliation before public launch. This audit does not conclude that the statement is incorrect.

## Checks that passed

- All 30 HTML pages returned HTTP 200 locally; a nonexistent page returned HTTP 404.
- 1,576 internal link/asset references resolved, including referenced section anchors.
- No duplicate IDs were found within individual pages.
- Each page has one H1; page titles are unique; all pages contain a meta description.
- All image elements have alt attributes. The quality of every alt description was not independently assessed.
- Browser JavaScript and both content-generation scripts passed Node syntax checks.
- The catalogue's 135 service activity entries and supporting resource lists are represented in their detail pages; service categories appear in navigation and enquiry options.
- The current Office address is the supplied Andheri address; Vasai is separately labelled Registered office.
- The CEO profile includes the supplied photograph, name and role. Leadership precedes the Working Together section.
- No PPTX file is present in the website tree and no presentation/document download link was found in the HTML.
- No numbered prefixes remain on the section-label elements previously requested for cleanup.
- No encoding corruption was detected in the HTML text scan.

## Verification limits

Browser access was unavailable. Desktop/mobile screenshots, overflow at specific widths, real keyboard/screen-reader interaction, browser console/network behaviour, Lighthouse, LCP/CLS/INP and real email delivery were not tested. External map destinations were not verified against a physical entrance.

The audit covers localhost, not a deployed production host. HTTPS configuration, caching/compression, security headers, production indexing, analytics and hosting behaviour remain unassessed. Responsive CSS exists, but it does not establish a successful mobile visual test.

## Suggested implementation order

1. Add reliable enquiry delivery and finalise publication copy.
2. Correct small-text contrast and improve keyboard access.
3. Optimise the two large photographs.
4. Add production-domain metadata and sitemap.
5. Complete browser-based desktop/mobile and end-to-end form checks before public launch.
