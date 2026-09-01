# Reel Cut — film editor portfolio & résumé

A single-page site built around a film editor's actual working vocabulary —
timecode, an EDL-style credits list, a leader countdown — instead of a
generic template. TypeScript + Three.js, no backend, deploys free on GitHub
Pages.

Everything currently on the page is placeholder content (generated stills,
a procedurally generated loop clip, a fictional name and credit list) so you
can see the real layout before you touch anything.

## Quick start

```bash
npm install
npm run dev       # local dev server, live reload
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

Requires Node 18+.

## Adding your own work

This is the exact sequence to go from the placeholder demo to your own
portfolio. You never need to touch the Three.js code or the CSS to do this.

**1. Drop your files into `public/media/`.**
Export your reel stills as `.jpg`/`.png` and your clips as `.mp4` (H.264,
under ~10MB each so the page stays fast — a 5–8 second muted loop is plenty,
you're not hosting the full cut, just a preview). Name them however you
like, e.g.:

```
public/media/night-drive-still.jpg
public/media/night-drive-loop.mp4
public/media/harvest-still.jpg
```

**2. Open `src/content.ts`.** This one file drives the entire page — your
name, statement, reel, credits, skills, and contact links. Replace the
placeholder entries. For each reel item:

```ts
{
  title: "Night Drive",
  meta: "Editor · Short Film · 2025",
  image: "/media/night-drive-still.jpg",
  video: "/media/night-drive-loop.mp4",   // optional — omit if you don't have one
  link: "https://vimeo.com/your-video",   // where "view full cut" should go
},
```

Do the same for `credits` (your résumé, most recent first — it renders as
a chronological EDL), `skills`, and `contact`.

**3. Preview it.** `npm run dev`, open the local URL, scroll through. Hover
a reel card — if you gave it a `video`, it cross-fades in on hover.

**4. Rebuild and ship it** — see below.

You can repeat steps 1–2 any time you finish a new project; there's nothing
else in the codebase you need to touch for routine updates.

## Deploying — free, on GitHub Pages

No hosting bill, no server to maintain. This repo already includes the
GitHub Actions workflow that builds and publishes the site automatically.

1. Create a new GitHub repository and push this project to it:
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source →
   GitHub Actions.** (One-time setting.)
3. Push to `main` — the included workflow (`.github/workflows/deploy.yml`)
   builds the site and publishes it automatically. Watch progress under
   the repo's **Actions** tab.
4. Your site is live at `https://<your-username>.github.io/<repo-name>/`.

From then on, every time you `git push` after adding new work (steps 1–2
above), the live site updates itself within a minute or two — no manual
deploy step, no cost.

### If you'd rather use a custom domain
GitHub Pages supports this for free too: add a `CNAME` file to `public/`
containing your domain, then point your domain's DNS at GitHub Pages per
[their docs](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site).

## What's under the hood

- **`src/content.ts`** — the only file you need for day-to-day edits.
- **`src/scene.ts`** — the Three.js hero background (a sparse field of
  drifting film-frame outlines with cursor parallax) and the one-time
  leader-countdown intro animation.
- **`src/main.ts`** — builds the page from `content.ts` and drives the
  bottom timeline scrubber, which doubles as section navigation and a
  running fictional timecode tied to scroll position.
- **`src/style.css`** — the full design system (palette, type, layout).

No frameworks, no CMS, no database — it's a static site, which is exactly
what makes free hosting possible.
