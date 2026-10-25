# Deep links

`app.json` declares iOS `associatedDomains` and an Android `autoVerify` intent filter for
`ba.janbambas.cz/add-friend`. Both require files served from the web host, which live in
`frontend/public/.well-known/` — `expo export` copies `public/` verbatim into `dist/`, so they ship with
the normal `scripts/deploy-frontend` run. `assetlinks.json` carries the real Android SHA-256 from the
EAS-managed keystore; it must be refreshed if that keystore is ever replaced, or Android app links
stop verifying.

`public/.htaccess` ships alongside them and does two things the host does not do by default:

- `ForceType application/json` on `apple-app-site-association` — the file has no extension, so the
  server otherwise returns it with an empty `Content-Type`, which Apple's spec disallows.
- SPA fallback to `index.html` for any non-existent path, so `/add-friend/<token>` reaches the app
  instead of 404ing. `.well-known` is excluded — a missing AASA must stay a 404, never become HTML.

**iOS caches the association at install time.** A `preview`/`production` build reads the AASA once, from
Apple's CDN, when it is installed; there is no periodic re-check. Deploying (or fixing) the AASA after
the app was installed changes nothing on the device — delete and reinstall the app. No rebuild is needed
as long as the entitlement and App ID are unchanged.

Verifying the serving side without a device:

```bash
curl -sSI https://ba.janbambas.cz/.well-known/apple-app-site-association   # 200, no redirect
curl -sS  https://app-site-association.cdn-apple.com/a/v1/ba.janbambas.cz  # Apple's ingested copy
```

The CDN copy is what devices actually read. If it 404s or is stale, no amount of reinstalling helps —
Apple re-fetches the origin on its own schedule (up to ~24h).
