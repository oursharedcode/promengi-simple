# Prompt Engineering Studio (promengi-simple)

A free drag-and-drop studio for building reliable LLM **system prompts** from
labelled blocks (Role, Context, Task, Constraints, Chain-of-Thought, Output
Format, …). Pure static single-page React app — no backend, no accounts.
Everything the user writes stays in their browser (`localStorage`) or on their
own disk.

Live page: <https://www.oursharedcode.com/promengi-simple/>
(also reachable as <https://www.oursharedcode.com/prompt-engineering-studio> —
see the deployment section)

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
| `adsenseClient` | Your AdSense publisher ID (`ca-pub-…`) once the site is approved at adsense.google.com |
| `adsenseSlot`   | The slot ID of a vertical *Display ad* unit you create in AdSense                  |
| `visitorMapSrc` | The `src` URL of the embed script from mapmyvisitors.com or clustrmaps.com         |

Also put the publisher ID (without `ca-`) into [`public/ads.txt`](./public/ads.txt).
Until these are filled in, the page shows neutral placeholders in both spots.

> **AdSense note:** Google must approve the site at the domain where it is
> actually served — register `www.oursharedcode.com` in AdSense, put the
> publisher ID in `ads.txt` at the *root site* (oursharedcode.github.io repo)
> as well, then fill in `src/config.js` here.
>
> **Visitor map note:** register the page URL
> `https://www.oursharedcode.com/promengi-simple/` with the widget provider
> (mapmyvisitors.com or clustrmaps.com); the free widget counts and plots
> visitors by location on a small world map.

## Deployment

### 1. GitHub Pages (build + hosting)

Pushing to `main` on `github.com/oursharedcode/promengi-simple` runs
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml), which builds
the site and publishes `dist/` to GitHub Pages.

One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

The site is then live at `https://oursharedcode.github.io/promengi-simple/`.

### 2. Custom domain path

The `oursharedcode` org's root Pages site
(`oursharedcode/oursharedcode.github.io`) already carries the verified custom
domain `www.oursharedcode.com`, so every project page of the org is served
under it automatically — this repo is live at
**`https://www.oursharedcode.com/promengi-simple/`** with no extra
configuration (GitHub Pages always serves a project site at its repo-name
path).

To also answer at `/prompt-engineering-studio`, commit
[`deploy/prompt-engineering-studio-redirect.html`](./deploy/prompt-engineering-studio-redirect.html)
into the **root site repo** as `prompt-engineering-studio/index.html`:

```bash
git clone https://github.com/oursharedcode/oursharedcode.github.io.git
mkdir oursharedcode.github.io/prompt-engineering-studio
cp deploy/prompt-engineering-studio-redirect.html \
   oursharedcode.github.io/prompt-engineering-studio/index.html
cd oursharedcode.github.io && git add -A && git commit -m "Add /prompt-engineering-studio redirect" && git push
```

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
