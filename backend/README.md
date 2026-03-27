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

# Run all tests once
npm test

# Run in watch mode during development
npm run test:watch

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

### Layer 3 — Integration tests _(planned)_

Will use `jest-dynalite` (in-memory DynamoDB) and mock the official API at the
HTTP level. Validates the full write → query → delete cycle against a real
DynamoDB schema.

## Adding fixture data

Place raw API responses under `tests/fixtures/<slug>/`:

| File            | Source endpoint                                    |
|-----------------|----------------------------------------------------|
| `changes.json`  | `GET /api/v2/<slug>/changes?time=0`                |
| `artists.json`  | `GET /api/v3/<slug>/artists?time=0`                |
| `schedule.json` | `GET /api/v3/<slug>/schedule?time=0`               |
