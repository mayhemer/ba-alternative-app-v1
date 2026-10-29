# CI

`.github/workflows/frontend.yml` runs the first three layers on every push and pull request touching
`frontend/`. The performance job is **advisory** (`continue-on-error`): render counts are comparable anywhere,
durations are not — so it runs the render-count gate, whose failure shows on the job without blocking. It measures the base revision and the current one in the same job, which cancels
the machine variance that makes a committed baseline useless there — and skips with a notice while
the base branch has no performance suite.

Read a duration report with the noise floor in mind. Identical code compared against itself typically
moves by ~1-2% and occasionally ~6%, and the scenarios **drift together** with machine load: if every
row moved the same way by a similar amount, nothing changed. `tests/setup/perfOptions.ts` documents
the two noise sources, and why the suite samples 30 runs after 3 warmups and repeats each subject to
fill a ~20 ms window.

Two metrics are sturdier than timing and are the ones worth gating: **render counts**
(`measureRenders`, deterministic) and **element budgets** (`src/**/*.elementBudget.test.tsx` per row or block, `src/screens/screenBudgets.test.tsx` per screen; exact,
and in the normal suite rather than the performance one).

Native E2E is deliberately absent from CI: it needs a built binary, and those come from EAS cloud
builds whose minutes are a real quota, unlike Actions minutes on a public repo.
