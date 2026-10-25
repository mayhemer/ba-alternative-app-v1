# Multi-Edition / Multi-Festival Support

The official API serves multiple festivals and multiple annual editions of the same festival.
Each edition is identified by a **festival slug** (e.g. `brutal-assault-2025`, `brutal-assault-2026`).
Artist and schedule IDs are **not unique across slugs** — the same numeric ID can appear in different editions.

All public data is therefore partitioned by slug. The frontend targets a single festival
(`brutal-assault`) but can switch between annual editions.
