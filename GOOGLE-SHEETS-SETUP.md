# Save EPCO enquiries to Google Sheets

The Cloudflare website saves a private backup before returning an enquiry reference. When the Google Sheets receiver is configured, each new enquiry is also sent to the `Enquiries` tab using that same reference. Existing enquiries are not automatically exported.

## 1. Prepare the Apps Script receiver

1. Open your enquiry spreadsheet, then **Extensions → Apps Script**.
2. Replace the example `Code.gs` with the personalised script provided locally, or use `integrations/google-sheets/Code.gs` from the repository. If using the generic file, add your spreadsheet ID as Script Property `SHEET_ID` in **Project Settings**.
3. Select **setupEnquirySheet** in the function dropdown and click **Run**. Complete Google's permissions prompt yourself. The script creates the `Enquiries` tab and headers if empty; it does not overwrite an existing tab with different headers or edit other tabs.
4. The setup creates Script Properties `SHEET_ID` and `WEBHOOK_SECRET`. The secret is not logged. Keep it private; later copy it directly into Cloudflare's secret field, not chat or GitHub.

Columns: Date & Time, Reference No., Name, Email, Phone, Service, Project Details, Privacy Consent. Timestamps are text in India Standard Time (`yyyy-MM-dd HH:mm:ss`). Leading formula characters are escaped so enquiries cannot become spreadsheet formulas.

## 2. Deploy the script

In Apps Script, select **Deploy → New deployment → Web app**:

- **Execute as:** Me (the spreadsheet owner/account that has edit access).
- **Who has access:** Anyone. The receiver requires the shared secret before any write; the spreadsheet itself stays private.
- Select **Deploy** and copy the Web App URL ending in `/exec`. A `/dev` editor/test URL is not the production endpoint. A Google Sheets `/edit` link is not this Web App URL.

After changing Apps Script code, update the deployment to a new version so the `/exec` receiver runs the new code.

References: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [JSON content service](https://developers.google.com/apps-script/guides/content).

## 3. Configure only the EPCO Worker

Open **Cloudflare → Workers & Pages → epcoispl-com → Settings → Variables and Secrets** and add:

| Name | Type | Value |
| --- | --- | --- |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Text | The deployed Google Apps Script `/exec` URL |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | Secret | The exact `WEBHOOK_SECRET` value from Apps Script Project Settings |

Save/deploy the environment change. These values are not included in browser HTML/JavaScript or the public asset folder. Do not paste the secret into chat or commit it. Wrangler preserves dashboard variables/secrets through future GitHub deployments.

The feature remains disabled until both values are configured. The website's existing enquiry submission continues to work in the meantime.

## Delivery and retries

The original enquiry is kept in Cloudflare's private register. The Google receiver returns JSON containing the same reference only after the row is saved. It uses a script lock and reference lookup to avoid duplicate rows on retry. HTML login/confirmation pages are not accepted as delivery success.

The private `enquiries` table adds `sheet_status` and `sheet_attempts`. Status can be `not-configured`, `pending`, `synced` or `failed`. Failed/pending configured deliveries are retried by the hourly maintenance alarm, up to five recorded attempts, in small batches. Enquiries submitted before the feature was configured are not retroactively sent. If attempts are exhausted, inspect the receiver settings and retained backup; no public record-list/retry endpoint is exposed.

The Cloudflare register's existing retention remains unchanged. The Google Sheet is a separate copy managed by the spreadsheet owner; deleting a Cloudflare record does not delete its Google Sheet row.

## Verify before relying on the sheet

Use an explicitly authorised synthetic enquiry and confirm its reference appears exactly once in the `Enquiries` tab. Confirm date/time, phone text and all eight columns. Check the private sync status if the row does not arrive. Do not test by exporting historical customer records.

No Google Sheets delivery is established merely by adding the spreadsheet link. Live verification requires the deployed receiver and matching secret.
