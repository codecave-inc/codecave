# CodeCave Inc. — Website

Static multi-page site (HTML, CSS, vanilla JS). Deploys on Vercel with no build step.

## Run locally
```bash
npx serve .          # clean URLs work out of the box
```

## Deploy
1. Push this folder to GitHub.
2. In Vercel: **Add New → Project → import the repo**. Framework preset: **Other**. No build command, output directory `.`.
3. Add the `codecave.com` domain in Vercel → Settings → Domains.

## Structure
```
index.html              Homepage
404.html                Not-found page
vercel.json             Clean URLs + cache/security headers
assets/css/styles.css   Design system (3 themes via CSS variables)
assets/js/config.js     ✏️ Nav, footer links, contact email, Google Form links
assets/js/pricing-data.js ✏️ Pricing checker questions & tier prices (Website + Mobile)
assets/js/pricing.js    Renders the pricing checker from pricing-data.js
assets/js/main.js       Header/footer, themes, page transitions, scroll motion, form embeds
assets/js/hero3d.js     Built 3D hero (source in src/hero3d.js)
assets/vendor/          GSAP, ScrollTrigger, Lenis (self-hosted)
assets/img/             Logo (cropped) and icons
```

## Things you edit
- **Google Forms:** paste each form's embed URL into `assets/js/config.js` → `forms`. Empty ones show a friendly placeholder.
- **Nav / footer:** `assets/js/config.js`.
- **Contact details:** phone, address and social links are placeholders on the Contact page — add real ones when ready.
- **Sponsor wall:** top sponsor slots on Sponsor Initiatives are marked "Open slot" — no placeholder names/brands were invented.
- **Hackathon 27 date:** set `hackathonDate` in `assets/js/config.js` (ISO format) once you have one — the countdown activates automatically; until then it shows "Date to be announced."
- **Placeholder content on the homepage:** the four stats (500+, 25+, 12+, 99.8%), the testimonial quote, and avatar initials. Replace with real figures.

## Rebuilding the 3D hero (optional)
```bash
npm i three esbuild
npx esbuild src/hero3d.js --bundle --minify --format=iife --outfile=assets/js/hero3d.js
```

## Design refresh
The UI moved from a playful "neo-tech" look (lime/pink, hard shadows, emoji) to a
professional palette: sky blue + deep blue only, neutral black/white/gray, soft
shadows, and a hand-rolled line-icon set (`assets/js/icons.js`, keyed by
`data-icon="..."` and swapped for inline SVG at runtime). Backward-compatible
CSS variables (`--lime`, `--pink`) still exist so old markup keeps working, but
both now resolve to blue/ink tones instead of bright accent colors.

## Backend: Convex

All 11 forms submit to Convex instead of Google Forms. Content management
(portfolio, sponsors, FAQ, pricing tiers) also lives in Convex, ready for
the admin dashboard (built in the next phase).

### First-time setup
```bash
npm install
npx convex dev
```
This opens a browser to log into (or create) a Convex account, creates a
project, and starts a local dev sync. It will print your deployment URL,
something like:
```
https://happy-otter-123.convex.cloud
```
Copy that into `assets/js/config.js`:
```js
convexUrl: "https://happy-otter-123.convex.cloud",
```
Until this is set, every form on the site shows a friendly "this form is
warming up" message instead of breaking — the site remains fully usable
with the backend disconnected.

Keep `npx convex dev` running while you work locally — it watches
`convex/*.ts` and pushes schema/function changes live. Leaving it stopped
doesn't break the deployed site; it only stops picking up code changes.

### Deploying the backend
```bash
npx convex deploy
```
Run this whenever you change anything under `convex/` and are ready to
push it to your **production** Convex deployment (separate from the `dev`
one `convex dev` uses). It prints a production URL — put that one in
`config.js` before you push the site to Vercel, so production points at
production, not your local dev deployment.

### What's in `convex/`
```
convex/schema.ts    All tables: form submissions + content (portfolio,
                     sponsors, FAQ, pricing tiers, site settings) + auth
convex/forms.ts      One mutation per form — the only thing the public
                     site is allowed to write
convex/content.ts    Read-only queries for published content (empty
                     until the admin dashboard is used to add rows)
convex/auth.ts       Convex Auth config (email + password), for the
                     admin dashboard — not used by the public site
convex/auth.config.ts, convex/http.ts   Convex Auth plumbing
```

### Creating your first admin login
There's no public sign-up — that's intentional. See
[`admin-app/README.md`](./admin-app/README.md) for the one-time bootstrap
steps to create your account.

### Where form submissions show up
Either in the admin dashboard (see below), or directly in the
[Convex dashboard](https://dashboard.convex.dev) → your project → Data
tab → pick a table (`projectBriefs`, `contactMessages`, etc.).

## Admin dashboard

A separate app at `admin-app/` for full content management (portfolio,
sponsors, FAQ, pricing tiers) and reviewing/triaging form submissions.
Gated behind Convex Auth (email + password, no public sign-up), served
at an unguessable route (`/portal-30ye9dy96d`) not linked from anywhere
public, and deployed as its own Vercel project so it can never affect
the public site's deploys.

**Setup, first admin account, and deployment steps:**
see [`admin-app/README.md`](./admin-app/README.md).

**Backend functions:** `convex/adminAuth.ts` (access control + the
one-time bootstrap), `convex/adminContent.ts` (portfolio/sponsors/FAQ/
pricing CRUD), `convex/adminSubmissions.ts` (list/triage all 8 form
tables).

**Known gap:** the dashboard can edit pricing tiers and site settings,
but the public site doesn't read them from Convex yet — it still uses
the hardcoded values in `assets/js/pricing-data.js` and `config.js`.
Wiring that read path is a follow-up, not done yet.

## Build stages
- [x] **Stage 1** — Design system, themes, header/footer, page transitions, motion engine, form-embed component, homepage
- [x] **Stage 2** — Software solutions: Website Development (+ pricing checker), Mobile App Development (+ pricing checker), Automation Workflows
- [x] **Stage 3** — Learning: AI Utility Training, AI-Assisted Dev Training, Hackathon 27
- [x] **Stage 4** — Campus Ambassadors, Partnership Initiatives, Products, Sponsor Initiatives, Contact + FAQ
- [ ] **Stage 5** — QA: accessibility, performance, SEO (sitemap, robots), final polish
