# EPCO website

For the Cloudflare Workers deployment shown in the dashboard, use [CLOUDFLARE-DEPLOYMENT.md](CLOUDFLARE-DEPLOYMENT.md). The Worker is a separate supported backend; do not upload the PHP archive as a Worker or use the Node HTTP server as the Worker entry point.

## Run locally

Use Node 22.9 or newer. No dependency installation is required.

```powershell
npm run build
npm start
```

Open http://localhost:3000. The Node server is required for direct enquiry submission; a plain static file server cannot process the form.

## Enquiries

Successful submissions are saved to `.data/enquiries/` before the visitor receives a reference. This directory is blocked from HTTP access. Review received enquiries on the server using:

```powershell
npm run enquiries
```

Use a persistent, private disk for this directory on the production host. With the default settings, the running service removes records older than 90 days during hourly housekeeping. Back up and restrict access according to your operating requirements. The built-in limiter is intended for a single server process; use an upstream limiter/shared store when running multiple instances.

## Optional inbox notifications

The form works without an email provider: records are retained in the private register. It does not claim that an email was delivered. Notifications require your own Resend account/API key and a verified sending domain. Configure `RESEND_API_KEY`, `ENQUIRY_FROM` and `ENQUIRY_TO` as server-side environment variables; never put credentials in HTML or browser JavaScript. See [Resend's sending API](https://resend.com/docs/api-reference/emails/send-email).

`notification` in each private record identifies `sent`, `failed` or `not-configured`. Review this register regularly; a notification failure does not lose the enquiry. Provider acceptance does not prove inbox delivery. Run a real inbox test with authorised test data after configuration.

## Configuration and publication

`.env.example` documents supported settings. Copy it to `.env` for local configuration if needed; `.env` is ignored and is never served. Use environment variables or the host's secret manager in production.

`SITE_URL` defaults to `https://www.epcoispl.com/in/`, the address in the supplied company profile. Change it to the final deployment URL before building if necessary. Run `npm run build` with the same URL and retention settings as the server; this updates canonicals, sharing metadata, the sitemap and the privacy notice. Build scripts read `.env` when present. All public pages keep their relative links for local preview.

Run this as a Node application behind your HTTPS reverse proxy; `HOST` defaults to loopback and can be set by the host. Set `TRUST_PROXY=true` only where a trusted proxy replaces the incoming forwarding header. Only public HTML, images and explicit website assets are served; source scripts, enquiry records, configuration and audit reports are not.

Before public release, confirm the final domain, company policy wording and mailbox notification configuration. No production deployment or legal approval is implied by the local implementation.

## Content and photos

`npm run build` runs the service catalogue generator, company information generator, editorial/form content generator and shared metadata/image finalizer. Keep changes in those sources so rebuilding preserves fixes.

The supplied photographs are preserved as PNG originals. Responsive JPEG copies are used by the website. To regenerate those copies on Windows:

```powershell
powershell -File scripts/optimize-images.ps1
```

The private source company presentation must never be copied into the website or offered as a download.

## Verification

```powershell
npm test
```

Checks cover enquiry validation, persistence, error handling, notification integration (mock provider), rate limits, private-path blocking, navigation logic, generated content and internal links. Automated checks do not replace browser/mobile or real inbox testing.
