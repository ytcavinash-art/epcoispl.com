# Cloudflare Worker deployment

The screenshot shows Worker `epcoispl-com`, GitHub repository `ytcavinash-art/epcoispl.com`, no build command and deploy command `npx wrangler deploy`. The detailed error is below the visible screenshot, so the exact remote error remains unconfirmed.

The inspected local project had no Wrangler configuration or Worker entry point. Its existing Node/PHP server code cannot be used directly as a Cloudflare Worker. The new setup preserves those variants and adds a Worker-compatible website and private enquiry register.

## Cloudflare settings

Under **Workers & Pages → epcoispl-com → Settings → Build**, use:

| Setting | Value |
| --- | --- |
| Root directory | `/` |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |

The root `wrangler.jsonc` also declares the build command, so CLI deployment prepares assets automatically. The build may run twice when both the dashboard and Wrangler invoke it; it is idempotent. Keep the configured Worker name `epcoispl-com` matched to the dashboard project.

Commit the updated website source, `package.json`, dependency lockfile, `wrangler.jsonc`, `hosting/cloudflare/worker.mjs` and `scripts/package-cloudflare.cjs` to the connected GitHub repository. Generated `public-cloudflare/`, `.wrangler/`, `.data/`, `.env`, dependency folders and release ZIPs are excluded from source control.

Do not retry an unchanged commit expecting local fixes to appear remotely.

References: [static assets](https://developers.cloudflare.com/workers/static-assets/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## Clean public URLs

The homepage is served at `/` and pages such as About and Team at `/about` and `/team`. Cloudflare redirects the corresponding `.html` URLs and trailing-slash variants to their clean forms. Production navigation, canonical URLs and the sitemap use these clean paths. The source files remain `about.html`, `team.html`, etc.; do not rename or delete them to change the public URL. The local Node preview continues to accept the original source filenames.

## Enquiries

Optional private Google Sheets delivery is documented in `GOOGLE-SHEETS-SETUP.md`. It stays disabled until the deployed Apps Script URL and shared secret are configured; an ordinary spreadsheet link alone does not enable it.

API requests use the Worker; the 30 pages are served from a public-only asset directory. No source scripts, private records, credentials or source presentations are static assets.

The SQLite-backed Durable Object `EnquiryRegister` stores the private register. The configuration includes its binding and initial class migration, so no manually created database ID is required. Storage/use is governed by the Cloudflare account's plan and limits. Review records through **Cloudflare → Durable Objects → EnquiryRegister → Data Studio**, table `enquiries`. No public record-list API is exposed.

Forms save enquiries and return a reference without an email provider. Optional notifications require server-side secrets `RESEND_API_KEY` and `ENQUIRY_FROM` (a verified sender); `ENQUIRY_TO` defaults to epcoispl@gmail.com. Configure these in Worker Variables and Secrets, never GitHub or browser code. Provider failures do not discard saved enquiries; the private record's `notification` column tracks status. Provider acceptance does not prove inbox delivery.

Default retention is 90 days, with cleanup on requests and hourly Durable Object alarms while records remain. Hashed-IP request limits expire after 15 minutes. The public privacy notice identifies the Cloudflare storage variant.

## Verify

```text
npm install
npm run build:cloudflare
npx wrangler deploy --dry-run
npx wrangler dev --local
```

A dry run bundles without publishing. Local testing must use synthetic data and no production notification secrets.

After a successful production build, open the Worker URL and inspect Home, Services, Team and Contact. Submit a synthetic enquiry, confirm its reference and private record, and test actual inbox delivery separately if notifications are enabled. Confirm no source/configuration/private files can be downloaded.

`wrangler.jsonc` declares `epcoispl.com` as a Worker Custom Domain. Deployment connects the hostname directly to this Worker, replacing conflicting website-origin records where necessary; Cloudflare provisions the website DNS record and certificate. This does not require changing nameservers, mail records or DNSSEC. The build token must have Workers Routes Write for this zone as well as permission to deploy the Worker. If domain setup is rejected for missing permissions or because the zone is in another account, resolve that account/zone access before retrying; do not work around it by disabling SSL.

Production metadata defaults to `https://epcoispl.com/`; set build variable `DEPLOY_SITE_URL` if the preferred domain differs.

This local fix does not itself update GitHub, retry a remote build or prove a production deployment succeeded.
