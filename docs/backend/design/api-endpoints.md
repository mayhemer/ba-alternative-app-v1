# API Endpoints (your AWS API Gateway)

| Method | Path | Description |
|---|---|---|
| GET | /:slug/artists | Cleaned artist list for this edition, without bios |
| GET | /:slug/bios | Every artist's bio for this edition, per language — fetched alongside the datasets |
| GET | /:slug/categories | Full category list for this edition |
| GET | /:slug/stages | All stages for this edition |
| GET | /:slug/schedule | All events for this edition (normalized, ID refs only) |
| GET | /:slug/validity | Returns the server's last rebuild time (overall and artists-only); the client compares against its own watermark |
| GET | /user/:slug/schedule | Authenticated user's interests for this edition |
| PUT | /user/:slug/schedule/:artistId | Set status for a band in this edition |
| DELETE | /user/:slug/schedule/:artistId | Remove status for a band in this edition |
| POST | /:slug/share | Generate a share token for this edition |
| GET | /share/:token | Read-only personal schedule via token |
| DELETE | /share/:token | Revoke share token (authenticated, must own token) |

All read endpoints for public data (`/:slug/artists`, `/:slug/schedule`, etc.) are served via **CloudFront**
with short TTLs, gzip and brotli enabled. User endpoints bypass CloudFront (auth required, personalized).

Bios are split out of the artist list because they dominate its size but are only read on the detail
screen. They are fetched for the whole edition in one request, started beside the dataset fetch and
never awaited before first paint, then cached and persisted — so the list paints fast *and* every
bio is readable offline. Only the active edition's bios are kept; the rest are evicted on switch.

`/:slug/validity` carries no caller-specific value — it is polled by every running app, so it has to
be cacheable. It reports the artists' watermark separately so a schedule-only rebuild, the common
one mid-festival, does not discard cached bios.

> **CloudFront cache paths** use `/:slug/artists`, `/:slug/schedule`, etc. The slug is part of the
> cache key, so editions are cached independently.
