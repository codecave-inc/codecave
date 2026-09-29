# CodeCave Admin — setup

A small React app (separate from the public site) for managing site
content and reviewing form submissions. Lives at an unguessable route
so it isn't linked from anywhere public.

## 1. Install
```bash
cd admin-app
npm install
```

## 2. Point it at Convex
```bash
cp .env.local.example .env.local
```
Edit `.env.local` and set `VITE_CONVEX_URL` to your Convex deployment
URL — the same one in the main site's `assets/js/config.js`.

## 3. Create your admin account (one-time)
There's no sign-up screen anywhere in the UI — that's intentional, so
random visitors can't create accounts even if they find the URL.
Instead, from the **repo root** (not admin-app/), with `npx convex dev`
running in another terminal:

```bash
npx convex run auth:signIn '{"provider":"password","params":{"email":"you@example.com","password":"choose-a-strong-password","flow":"signUp"}}'
```
This creates the account (but it has no admin access yet). Then grant
it admin access:
```bash
npx convex run adminAuth:promoteToAdmin '{"email":"you@example.com"}'
```
Repeat the `promoteToAdmin` step (only) for a second admin later — no
need to re-run the sign-up step for yourself.

Do this against **production** too when you deploy for real — run both
commands again with `--prod` added:
```bash
npx convex run auth:signIn '{"provider":"password","params":{...}}' --prod
npx convex run adminAuth:promoteToAdmin '{"email":"you@example.com"}' --prod
```

## 4. Run it locally
```bash
npm run dev
```
Open the printed localhost URL + `/portal-30ye9dy96d/` and sign in.

## 5. Deploy
This deploys as its **own, separate Vercel project** — it does not
touch your existing CodeCave website project:

1. On [vercel.com](https://vercel.com), **Add New → Project**, import
   the same `codecave-inc/codecave` GitHub repo again (yes, a second
   project from the same repo is normal here).
2. In that project's settings, set **Root Directory** to `admin-app`.
3. Framework preset: Vite (should auto-detect).
4. Add an environment variable: `VITE_CONVEX_URL` = your production
   Convex URL.
5. Deploy. Vercel gives you a URL like
   `https://codecave-admin-xyz.vercel.app`.
6. Back in the **main** site's repo, open `vercel.json` and replace
   `REPLACE_WITH_ADMIN_APP_VERCEL_URL` in the `rewrites` section with
   that URL (just the host, no `https://` prefix needed to remove —
   see the existing line for the exact format). Commit and push — the
   main site redeploys and `codecave.com/portal-30ye9dy96d` now serves
   this app.

## If you ever need to regenerate the unguessable slug
Change it in **three** places (they must all match):
- `admin-app/vite.config.ts` → `base`
- the folder isn't named after it, so no rename needed there
- main site's `vercel.json` → the `rewrites` source/destination path
- this README's examples (not required, just for your own sanity)

## What's not wired up yet
The Pricing and Settings pages let you edit data in Convex, but the
public site doesn't read from Convex for these yet — it still uses the
hardcoded values in `assets/js/pricing-data.js` and `config.js`/
`index.html`. Editing them here is safe (nothing breaks) but won't
change the live site until that read-side wiring is built as a
follow-up.
