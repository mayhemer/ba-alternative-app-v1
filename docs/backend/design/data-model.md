# Data Model

## DynamoDB Tables

### `artists`
```
PK: slug      (string)   — e.g. "brutal-assault-2025"
SK: artistId  (string)   — official numeric id, stringified
---
name        string
isPlayable  boolean
imageUrl    string
thumbUrl    string
url         string   (website / Facebook)
localized   list     — [{ language: "EN"|"CS", name: string, content: string, genre: string, country: string }]
```

### `stages`
```
PK: slug     (string)
SK: stageId  (string)
---
imageUrl    string
thumbUrl    string
localized   list     — [{ language: "EN"|"CS", name: string }]
```

### `categories`
```
PK: slug         (string)
SK: categoryId   (string)
---
color       number   (raw integer from official API; -1 = no color)
localized   list     — [{ language: "EN"|"CS", title: string }]
```

### `events`
```
PK: slug     (string)
SK: eventId  (string)
---
dateFrom      number   (Unix ms UTC)
dateTo        number   (Unix ms UTC)
artistId      string   → ref to artists (scoped to same slug)
categoryId    string   → ref to categories (scoped to same slug)
stageId       string   → ref to stages (scoped to same slug)
```

> Events are fully normalized — no embedded copies of artist/category/stage data.
> The app joins locally after fetching all datasets for a given slug.

### `userInterests`
```
PK: userId          (string)   — Cognito sub or anonymous UUID
SK: slug#artistId   (string)   — composite; scopes interest to a specific edition
---
status       string    (will_go | maybe | dont_go | none)   ← none = soft delete (DELETE route)
updatedAt    number    (Unix ms UTC)  ← used for merge conflict resolution
```

### `shareTokens`
```
PK: token    (string)   — opaque random token
---
userId       string
slug         string   — the edition this share covers
createdAt    number
```
No automatic expiry. User explicitly revokes via DELETE /share/:token.

### `syncState`
```
PK: slug        (string)   — festival slug
SK: tableName   (string)   — "artists" | "stages" | "categories" | "schedule"
---
lastOfficialUpdate   number   (Unix ms — from official /changes endpoint)
lastSyncedAt         number   (Unix ms — when we last rebuilt this table)
dataVersion          string   (hash or counter — for cache busting)
```
