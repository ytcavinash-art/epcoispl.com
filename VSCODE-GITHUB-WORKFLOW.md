# Update EPCO from VS Code

## Connected workflow

```text
Edit in this VS Code folder
        ↓
Check the build and tests
        ↓
Review changes → Commit → Push to GitHub main
        ↓
Cloudflare's connected Git build runs
        ↓
Successful deployment updates the live site
```

Repository: https://github.com/ytcavinash-art/epcoispl.com

Cloudflare Worker: `epcoispl-com`. Production branch: `main`.

Keep using this existing folder; future updates do not need ZIP uploads or a new repository. Saving a file only changes the local copy. A successful push publishes the new commit to GitHub; Cloudflare must then finish its build successfully before the live website changes.

## Everyday steps in VS Code

1. Open **Source Control** in the left sidebar. Before starting work, use **… → Pull** to get changes made elsewhere. If there are uncommitted edits, commit them first or use VS Code's stash feature; do not discard them.
2. Edit and save the relevant files. Run **Terminal → Run Task → EPCO: Start localhost** when you need a preview, unless localhost is already running. Open http://localhost:3000.
3. Run **Terminal → Run Task → EPCO: Check before commit**. This prepares the Cloudflare build and runs the tests. Resolve failures before pushing.
4. In **Source Control**, click changed files to inspect the differences. Click **+** to stage the intended changes. Enter a useful commit message, such as `Update contact address`, and click **Commit**.
5. Select **Sync Changes** or **… → Push**. If GitHub asks you to sign in, use the `ytcavinash-art` account and approve the request yourself. Passwords or access tokens must not be pasted into project files or chat.
6. Open **Cloudflare → Workers & Pages → epcoispl-com → Deployments** and verify the new commit's build succeeds. If it fails, read the last error lines; pushing did not itself prove deployment succeeded.

## Cloudflare build settings

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx wrangler deploy` |

The included Wrangler configuration prepares the public assets and Worker backend. With the repository's Cloudflare Git integration and automatic builds enabled, pushes to the production branch trigger deployment. See `CLOUDFLARE-DEPLOYMENT.md` for backend configuration, secrets, domain connection and verification.

## Files to edit

- Shared styling: `style.css`.
- Navigation/form interactions: `script.js`.
- Homepage and leadership content: `index.html`, `team.html`.
- Service activities: `assets/services-catalog.json`.
- Generated company/service/editorial pages: update their sources in `scripts/build-company.cjs`, `scripts/build-services.cjs` or `scripts/build-content.cjs`; building regenerates these pages.
- Shared footer, icons, SEO metadata and final cleanup: `scripts/finalize-site.cjs`.

For example, change the contact address in the applicable source scripts rather than only one generated HTML page. That keeps the change consistent after Cloudflare rebuilds.

## Keep private and generated files out of Git

The repository's `.gitignore` excludes `.env`, `.data`, `node_modules`, `.wrangler`, generated `public-cloudflare`, npm caches and release ZIPs. Do not override these exclusions. Never add the source company presentation as a website download.

Do not use Force Push to resolve a normal sync error. Pull and review the differences or ask for help; force pushing can replace other commits.
