# BA Backend

AWS Lambda functions and shared types for the Brutal Assault festival app.

## Structure

```
backend/
├── lambdas/
│   ├── sync/           # EventBridge-scheduled sync job (polls official API → DynamoDB)
│   │   ├── handler.ts        # Entry point
│   │   ├── official-api.ts   # Official best4fest API client
│   │   ├── normalize.ts      # API response → DynamoDB item transforms
│   │   ├── db.ts             # DynamoDB batch helpers (put / delete / query)
│   │   └── cloudfront.ts     # CloudFront invalidation
│   └── api/            # HTTP API handler (API Gateway → Lambda)
│       └── handler.ts
├── shared/
│   └── types.ts        # DynamoDB item type definitions shared across lambdas
└── tests/
    └── fixtures/
        ├── ba2025/     # Real API snapshots for ba2025 (artists, schedule, changes)
        └── ba2024/     # Real API snapshots for ba2024
```

## Running tests

```bash
# Install dependencies (first time only)
npm install

# Unit + mocked-I/O tests (fast, no external processes)
npm test

# Watch mode during development
npm run test:watch

# Integration tests — spins up in-memory DynamoDB (dynalite)
npm run test:integration

# All layers in sequence
npm run test:all

# Type-check without emitting
npm run typecheck
```

## Test layers

### Layer 1 — Pure unit tests (`normalize.test.ts`)

Tests the normalization functions in isolation using real fixture data from
`tests/fixtures/`. No mocks, no I/O. Covers field mapping, ID stringification,
slug isolation across editions, and edge cases (null fields, empty localized arrays).

### Layer 2 — Sync logic tests (`handler.test.ts`)

Tests the sync handler with all I/O mocked via `jest.mock`:

- `./official-api` — replaced with Jest fns returning inline fixture data
- `./db` — replaced with Jest fns (no real DynamoDB)
- `./cloudfront` — replaced with a Jest fn

Covers: dirty-check logic, per-group rebuilds (artists vs schedule), stale item
deletion, CloudFront path invalidation, per-slug error isolation, and multi-slug runs.

### Layer 3 — Integration tests (`tests/integration/db.test.ts`)

Uses `jest-dynalite` (in-memory DynamoDB, no Java required) to test `db.ts`
against a real DynamoDB engine. Tables from `jest-dynalite-config.js` are
created before each file and cleared after each test. Covers: batchPut,
batchDelete, queryAllKeys (including >25-item chunking), getSyncState,
putSyncState, key projection, and slug isolation.

## Adding fixture data

Place raw API responses under `tests/fixtures/<slug>/`:

| File            | Source endpoint                                    |
|-----------------|----------------------------------------------------|
| `changes.json`  | `GET /api/v2/<slug>/changes?time=0`                |
| `artists.json`  | `GET /api/v3/<slug>/artists?time=0`                |
| `schedule.json` | `GET /api/v3/<slug>/schedule?time=0`               |

## Additional notes

[authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
