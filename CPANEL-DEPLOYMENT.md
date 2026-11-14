# Publish EPCO on GoDaddy cPanel

The prepared release is for **https://epcoispl.com/**. Use `DEPLOY_SITE_URL` when packaging for a different URL, such as a staging subdomain. The local Node version is preserved.

## Package

Run `npm run build` and `node scripts/package-cpanel.cjs`. The latter creates a unique staging directory under `releases/` and records its path in `releases/latest-cpanel.json`. ZIP the **contents** of that directory, including `.htaccess`; `index.html` must be at the ZIP root.

The package contains 30 public HTML pages, referenced image files, CSS/JS, metadata files and a PHP 8.1+ enquiry endpoint. It excludes source scripts, tests, `.env`, enquiry records, source presentations and original unoptimised photos.

## GoDaddy upload

1. GoDaddy → My Products → Web Hosting (cPanel) → Manage → cPanel Admin.
2. Confirm the **document root for epcoispl.com** under Domains and note the hosting **Shared IP Address**. Do not assume the root if this is an addon domain.
3. Back up the existing website before replacing files. Do not extract the release over an unrelated website or delete its content.
4. In File Manager, open the confirmed document root (`public_html` for many primary domains), enable showing hidden files, upload the release ZIP and extract its contents there. Remove the uploaded ZIP after extraction; it is not website content.
5. Confirm PHP 8.1+ is enabled and test the site's PHP handler. The form posts to `api/enquiries.php` and does not require Node or a rewrite rule.

Official upload guide: https://help-center.dc-aws.godaddy.com/help/upload-files-using-my-web-hosting-cpanel-file-manager-3239

## DNS

The public lookup on 13 November 2026 returned Cloudflare nameservers `danica.ns.cloudflare.com` and `sevki.ns.cloudflare.com`. Recheck before changing records.

With those nameservers, edit **Cloudflare → epcoispl.com → DNS → Records**:

- Set the apex `A` record (`@`) to the exact hosting IPv4 address shown in cPanel.
- Configure `www` as directed by the hosting account (typically a CNAME to `epcoispl.com`).
- Check existing apex/`www` A, AAAA and CNAME records for conflicting old targets before changing them. Retain existing values for rollback.
- Leave mail-related MX, SPF, DKIM and DMARC records unchanged unless separately configuring mail.
- **DS Records** in GoDaddy are for DNSSEC, not uploading or pointing the website. Do not change them for this task.

DNS instructions: https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/

Do not switch nameservers as a shortcut; it can disrupt other existing records. Confirm an appropriate certificate for `epcoispl.com` and `www.epcoispl.com` on the hosting origin and verify HTTPS. With Cloudflare proxying, the origin must support the selected TLS mode; do not bypass certificate errors.

## Enquiry storage and delivery

The PHP endpoint creates a private `.epco-enquiries-…` directory beside the document root. It refuses a private data directory inside the domain's document root, and adds a deny-all `.htaccess` as additional protection. The hosting account must allow writing to the private parent directory. A custom absolute `ENQUIRY_DATA_DIR` can instead be configured outside public directories.

Successful submissions create a JSON record and show a reference. The record's `notification` field distinguishes `sent`, `failed` and `not-configured`. Without email-provider configuration, received enquiries must be reviewed in the private server folder. No public admin/data endpoint is included.

Optional notifications use server-side `RESEND_API_KEY`, `ENQUIRY_FROM` (a verified sender) and `ENQUIRY_TO` (defaults to epcoispl@gmail.com), plus PHP cURL. Do not add credentials to HTML, JavaScript, the public ZIP or screenshots. Actual inbox delivery still requires configuration and a real test.

Retention cleanup runs on enquiry requests. For regular cleanup without traffic, set an hourly cPanel cron job using the account's actual PHP executable and absolute path:

```text
php -q /home/ACCOUNT/public_html/api/enquiries.php --cleanup
```

Adjust the path for the actual document root. This command is for cPanel Cron Jobs, not a public URL. The default retention is 90 days. The request limiter uses server-provided `REMOTE_ADDR`; confirm that the hosting/proxy passes the real visitor address before opening public traffic, or use an upstream rate limiter.

## Launch checks

- HTTPS home, Services, Team and Contact pages load with the new content; inspect mobile layout.
- Form validation rejects incomplete enquiries. A synthetic test submission returns a reference and appears in the private register. Verify inbox delivery separately if notifications are enabled.
- Private configuration, registers and source files cannot be downloaded.
- Sitemap and canonicals use the final domain root, not localhost or the former `/in/` base.
- Both the apex and `www` resolve to the intended site; verify the preferred-host redirect before enabling it.
- Clear only the relevant website cache if Cloudflare still serves old content.

This file describes the prepared release. It does not mean files have already been uploaded or DNS has been changed.
