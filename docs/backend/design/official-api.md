# Official API Integration

## Source Endpoints (proxied, never exposed to frontend)

Base URL: `https://admin.best4fest.app`

```
GET /api/v2/{slug}/changes?time=0
GET /api/v3/{slug}/artists?time=0
GET /api/v3/{slug}/schedule?time=0    → contains: schedules[], categories[]
```

Note: `/changes` is at v2; `/artists` and `/schedule` are at v3.
Official slugs map directly to our DynamoDB `slug` key (e.g. `ba2026`, `ba2025`) — no remapping.

## `/changes` Response Shape

Returns an array of objects, one per internal DB table:
```json
[
  { "id": 2, "table": "db_artist",                      "time": 1754648838000, "count": 260 },
  { "id": 3, "table": "db_artist_localized",             "time": 1754648838000, "count": 520 },
  { "id": 19, "table": "db_schedule",                   "time": 1754648838000, "count": 311 },
  { "id": 20, "table": "db_schedule_category",          "time": 1754648838000, "count": 16  },
  { "id": 21, "table": "db_schedule_category_localized","time": 1754648838000, "count": 32  },
  { "id": 22, "table": "db_stage",                      "time": 1754648838000, "count": 13  },
  { "id": 23, "table": "db_stage_localized",            "time": 1754648838000, "count": 26  }
]
```

## Tables We Monitor

| Official table(s) | Triggers rebuild of | Our endpoint |
|---|---|---|
| `db_artist`, `db_artist_localized` | artists | /artists |
| `db_schedule`, `db_schedule_category`, `db_schedule_category_localized` | schedule + categories | /schedule, /categories |
| `db_stage`, `db_stage_localized` | stages | /stages |

## Key Observations
- `?time=0` returns the full dataset — we always use this (full rebuild, no incremental merging)
- `/changes` is polled to detect when any monitored table's `time` has advanced
- We store the max `time` seen across all monitored tables in `syncState`
- When any monitored table is dirty, we rebuild **all** our datasets (simplest correctness guarantee)
- No merge logic needed: official API is always the single source of truth

## Official Data Notes
- `schedule.schedules[]` embeds artist and stage data redundantly — we normalize this
- `schedule.categories[]` is the vertical grid axis (not the stage description)
- `stage` object on each event is often redundant — we extract stages separately and reference by ID
