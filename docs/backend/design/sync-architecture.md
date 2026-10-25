# Sync Architecture

## Two Lambdas

### Sync Lambda (background, no user traffic)
Triggered by **EventBridge Scheduler**:
- Every 5 minutes during the festival
- Every 1 hour off-season

Flow:
```
1. GET official /changes
2. Read syncState from DynamoDB for selected tables (TBD)
3. For each dirty table (lastOfficialUpdate != lastSyncedAt):
   a. GET official /<endpoints>?time=lastSyncedAt (or time=0) for all endpoints we need (artists, schedule)
   b. Process + normalize data
   c. Overwrite DynamoDB table (BatchWrite — full rebuild, no merge)
   d. Invalidate CloudFront for affected paths
   e. Update syncState (lastSyncedAt, dataVersion)
4. If nothing dirty → exit, nothing written
```

### API Lambda (user-facing)
- Reads from DynamoDB only — never hits the official API
- Always fast; resilient to official API downtime
- Returns `dataVersion` + `lastSyncedAt` in response headers

## CloudFront TTL + Invalidation

| Endpoint | TTL | Invalidated when |
|---|---|---|
| /artists | 1 hour | `artists` table dirty |
| /categories | 1 hour | `categories` dirty |
| /stages | 1 hour | `stage` or `stage_localization` dirty |
| /schedule | 2–5 min | `schedule` dirty |

Short TTL on `/schedule` ensures freshness even without explicit invalidation.
Explicit CloudFront invalidation is the fast path for immediate propagation.

## DynamoDB as Fallback
If the official API is unreachable, the API Lambda continues serving the last
known good data from DynamoDB. Users never see an error due to upstream outage.
