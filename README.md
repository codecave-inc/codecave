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

## Build stages
- [x] **Stage 1** — Design system, themes, header/footer, page transitions, motion engine, form-embed component, homepage
- [x] **Stage 2** — Software solutions: Website Development (+ pricing checker), Mobile App Development (+ pricing checker), Automation Workflows
- [x] **Stage 3** — Learning: AI Utility Training, AI-Assisted Dev Training, Hackathon 27
- [x] **Stage 4** — Campus Ambassadors, Partnership Initiatives, Products, Sponsor Initiatives, Contact + FAQ
- [ ] **Stage 5** — QA: accessibility, performance, SEO (sitemap, robots), final polish
