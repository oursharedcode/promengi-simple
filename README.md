# Prompt Engineering Studio

A free drag-and-drop studio for building reliable LLM **system prompts** from
labelled blocks (Role, Context, Task, Constraints, Chain-of-Thought, Output
Format, …). Pure static single-page React app — no backend, no accounts.
Everything the user writes stays in their browser (`localStorage`) or on their
own disk.

Live page: <https://www.oursharedcode.com/prompt-engineering-studio/>

See [REQUIREMENTS.md](./REQUIREMENTS.md) for the full requirement set.

## Features

- Block-based prompt editor with drag-and-drop, inline editing, placeholder
  chips, undo/redo (50 steps), live word/char count, prompt-health score and
  hallucination-risk badge.
- **Template blocks on the left** — 12 built-in technique blocks, each with a
  "Why?" tooltip, plus **custom blocks**: create (new), edit, delete, reorder,
  and **save / load** the whole custom-block library as a `blocks.json` file
  on your own disk.
- **Prompts save/load to local disk** — File System Access API when available,
  download fallback otherwise. Export as `.prompt` JSON, Python string,
  OpenAI/Anthropic messages JSON, Markdown, or plain text; load `.prompt` or
  plain text back.
- In-browser prompt library with colour-coded projects; template gallery of
  ready-made prompts; three themes (black / white / grey).
- Right rail: Google AdSense unit (top) and a live world map of visitors
  (bottom) — both optional and configured in one file.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in ./dist
```

## One-file site configuration

Edit [`src/config.js`](./src/config.js):

| Key             | What to put there                                                                 |
| --------------- | --------------------------------------------------------------------------------- |
| `adsenseClient` | The AdSense publisher ID — `ca-pub-1213781225888339`                              |
| `adsenseSlot`   | The slot ID of a vertical *Display ad* unit you create in AdSense                  |
| `visitorMapSrc` | The `src` URL of the embed script from mapmyvisitors.com or clustrmaps.com         |

Until these are filled in, the page shows neutral placeholders in both spots.

> **`ads.txt` does not belong in this repo.** Google reads `ads.txt` only from
> the domain root — `www.oursharedcode.com/ads.txt` — and ignores any copy at a
> subpath, so a file here would never be read. It belongs in the root site repo
> (`oursharedcode.github.io`), where one file covers every page on the domain.
>
> **AdSense note:** Google approves the domain, not the page — and the site is
> registered as `oursharedcode.com`, not `www.oursharedcode.com`, which AdSense
> rejects as a subdomain. Approval covers the whole domain, but ads appear only
> on pages carrying the ad code — see
> [`docs/adsense-snippet.md`](https://github.com/oursharedcode/oursharedcode.github.io/blob/main/docs/adsense-snippet.md)
> in the root repo. Note the rail needs **both** `adsenseClient` and
> `adsenseSlot` before it renders an ad; the slot ID comes from an ad unit
> created in the dashboard once the site is approved.
>
> **Visitor map note:** register the page URL
> `https://www.oursharedcode.com/prompt-engineering-studio/` with the widget
> provider (mapmyvisitors.com or clustrmaps.com); the free widget counts and
> plots visitors by location on a small world map.

## Deployment

### 1. GitHub Pages (build + hosting)

Pushing to `main` on `github.com/oursharedcode/prompt-engineering-studio` runs
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml), which builds
the site and publishes `dist/` to GitHub Pages.

One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

The site is then live at
`https://oursharedcode.github.io/prompt-engineering-studio/`.

### 2. Custom domain path

The `oursharedcode` org's root Pages site
(`oursharedcode/oursharedcode.github.io`) already carries the verified custom
domain `www.oursharedcode.com`, so every project page of the org is served
under it automatically — this repo is live at
**`https://www.oursharedcode.com/prompt-engineering-studio/`** with no extra
configuration.

The path comes from the repository name and nothing else, because GitHub Pages
always serves a project site at its repo-name path. Renaming the repo is
therefore the whole mechanism for changing the URL: there is no redirect file
and no route configuration to keep in sync.

### 3. Cloudflare alternative (only if the domain moves to Cloudflare)

If `oursharedcode.com` is ever proxied through Cloudflare, the app can instead
be served *directly* at `/prompt-engineering-studio` by deploying
[`deploy/cloudflare-worker.js`](./deploy/cloudflare-worker.js) as a Worker on
the route `www.oursharedcode.com/prompt-engineering-studio*` (it proxies to
the GitHub Pages origin; the relative asset URLs make this work without any
HTML rewriting). Not needed with the current DNS setup, which points the
domain straight at GitHub Pages.

## File formats

| File          | Contents                                                            |
| ------------- | ------------------------------------------------------------------- |
| `*.prompt`    | JSON `{ version, exportedAt, wordCount, text }`                      |
| `blocks.json` | JSON `{ version, exportedAt, blocks: [{label, emoji, color, text}] }` |

Both are plain JSON — easy to read, diff, or hand-edit.

## Maintenance

The page is intentionally low-maintenance: no server, no database, two runtime
dependencies (react, react-dom). Routine edits touch only `src/config.js`.
