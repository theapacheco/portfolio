# Reel Cut — film editor portfolio & résumé

A multi-page site built around a film editor's actual working vocabulary —
timecode, an EDL-style credits list, a leader countdown — instead of a
generic template. TypeScript + Three.js, light/dark mode, and a built-in
admin panel for updating content without touching code. No backend,
deploys free on GitHub Pages.

Everything currently on the site is placeholder content (generated stills,
a procedurally generated loop clip, a fictional name/email/credit list) so
you can see the real layout before you touch anything.

## Pages

- `index.html` — Home: hero + 3 featured pieces
- `work.html` — the full reel grid
- `about.html` — portrait, statement, skills, credits (EDL)
- `contact.html` — email + links
- `admin.html` — password-gated content editor (see below)

Light/dark mode is a toggle in the top nav, defaults to the visitor's OS
preference, and is remembered per-browser. The hero video wall stays dark
in both modes on purpose — a screening room doesn't change color for
daytime, and neither does this one.

## Quick start

```bash
npm install
npm run dev       # local dev server, live reload
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

Requires Node 18+.

## Editing content

All page content — name, statement, reel, credits, skills, contact — lives
in **`public/content.json`**, which every page fetches at runtime. That
means you can update it two ways:

**A. Edit the file directly.** Change `public/content.json`, add media to
`public/media/`, commit, push. No rebuild step needed locally — GitHub
Actions builds it for you (see Deploying, below).

**B. Use the admin panel** at `/admin.html` on your live site — a form for
everything in content.json, including image/video uploads, that publishes
straight to your GitHub repo. This is the "easy interface, no folders, no
git" option.

### Admin panel — what it is, honestly

Open `https://<your-username>.github.io/<repo>/admin.html`. First visit,
it asks you to set a password — this is a **soft lock**, stored as a hash
in that browser's local storage and checked by the page's own JavaScript.
It keeps the panel tidy if you're on a shared machine, but it is not real
security: anyone with developer tools could bypass the check in the page
itself. That's fine, because it isn't what actually protects your site.

**What actually protects your site is your GitHub token.** No token, no
write access — full stop. To publish changes, you enter a
[fine-grained personal access token](https://github.com/settings/tokens?type=beta)
scoped to just this one repo (Contents: Read and write, nothing else) into
the Publishing section. That token:
- is stored only in that browser's local storage,
- is sent only to `api.github.com`, directly from your browser,
- is never sent to me, to Anthropic, or to any third party,
- never gets typed into a chat, a terminal, or anyone else's hands.

Set an expiration on it (30–90 days is plenty) and regenerate when it
lapses. If you ever think it's been exposed, revoke it immediately from
the same GitHub settings page — that takes about ten seconds and instantly
kills its access.

If you'd rather not use a token at all: fill out the form, click
**"Download content.json instead,"** and upload that file (plus any new
images) to your repo through
[github.dev](https://github.dev) — press `.` on your repo's GitHub page to
open a full browser-based editor, no install, no token.

Publishing (either path) triggers the same GitHub Actions build as a
normal push, so changes go live within about a minute.

## Deploying — free, on GitHub Pages

1. Push this project to a GitHub repo (see the walkthrough you already
   have for `theapacheco/portfolio` if this is a repeat deploy).
2. **Settings → Pages → Build and deployment → Source → GitHub Actions.**
   (One-time setting.)
3. Push to `main` — `.github/workflows/deploy.yml` builds and publishes
   automatically. Watch progress under the **Actions** tab.
4. Live at `https://<your-username>.github.io/<repo-name>/`.

### Why every internal link is relative
Every page — including `admin.html` — sits at the same folder depth, and
every internal link, `fetch()`, and media path in this project is written
relative (`work.html`, `content.json`, `media/still-01.jpg`, never a
leading `/`). That's deliberate: it's what makes the site work correctly
both at a domain root and under a GitHub Pages project subpath like
`/portfolio/`. If you ever add a new page or move `admin.html` into a
subfolder, keep that convention or the relative paths will break.

### Custom domain
Add a `CNAME` file to `public/` containing your domain, then point your
domain's DNS at GitHub Pages per
[their docs](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site).

## What's under the hood

- **`public/content.json`** — all page content, fetched at runtime.
- **`src/content.ts`** — the `SiteContent` type + the fetch loader.
- **`src/scene.ts`** — the Three.js hero background (drifting film-frame
  outlines with cursor parallax) and the leader-countdown intro, both on
  the home page only.
- **`src/site.ts`** — shared nav, theme toggle, and the live timecode clock.
- **`src/pages/*.ts`** — one small entry script per page.
- **`src/pages/admin.ts`** — the content editor + GitHub publish flow.
- **`src/style.css`** — the full design system (palette, type, layout,
  light/dark tokens, responsive rules).

No frameworks, no CMS platform, no database — static files plus one page
that knows how to commit to GitHub on your behalf, which is what makes
free hosting possible while still getting you a real "edit and publish"
workflow.
