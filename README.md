# Prompt Engineering Studio (promengi-simple)

A free drag-and-drop studio for building reliable LLM **system prompts** from
labelled blocks (Role, Context, Task, Constraints, Chain-of-Thought, Output
Format, …). Pure static single-page React app — no backend, no accounts.
Everything the user writes stays in their browser (`localStorage`) or on their
own disk.

Live page: <https://www.oursharedcode.com/prompt-engineering-studio>

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

> **AdSense note:** Google must approve the site at the URL where it is
> actually served (www.oursharedcode.com). Apply after the Cloudflare route
> below is live, and verify the site in AdSense with the same path.
>
> **Visitor map note:** register the page URL
> `https://www.oursharedcode.com/prompt-engineering-studio` with the widget
> provider; the free widget counts and plots visitors by location on a small
> world map.

## Deployment

### 1. GitHub Pages (build + hosting)

Pushing to `main` on `github.com/oursharedcode/promengi-simple` runs
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml), which builds
the site and publishes `dist/` to GitHub Pages.

One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

The site is then live at `https://oursharedcode.github.io/promengi-simple/`.

### 2. Cloudflare route → www.oursharedcode.com/prompt-engineering-studio

The app is built with relative asset URLs, so it can be proxied under any
path. With the `oursharedcode.com` zone on Cloudflare, deploy
[`deploy/cloudflare-worker.js`](./deploy/cloudflare-worker.js) as a Worker and
attach the route `www.oursharedcode.com/prompt-engineering-studio*`. The
worker proxies requests to the GitHub Pages origin and sets sane cache
headers. Full steps are in the comments at the top of that file.

(Alternative: skip GitHub Pages and use **Cloudflare Pages** — connect the
repo, build command `npm run build`, output `dist` — then proxy the same way.)

## File formats

| File          | Contents                                                            |
| ------------- | ------------------------------------------------------------------- |
| `*.prompt`    | JSON `{ version, exportedAt, wordCount, text }`                      |
| `blocks.json` | JSON `{ version, exportedAt, blocks: [{label, emoji, color, text}] }` |

Both are plain JSON — easy to read, diff, or hand-edit.

## Maintenance

The page is intentionally low-maintenance: no server, no database, two runtime
dependencies (react, react-dom). Routine edits touch only `src/config.js`.
