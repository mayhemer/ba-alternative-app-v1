# Documentation

Split by area (general, backend, frontend), then by kind: **design** (how it works and why),
**build** (building and deploying), **instructions** (running and testing).

## General

Design
- [overview.md](general/design/overview.md) — product brief: overview, tech stack, V1 scope and feature status, open questions
- [multi-edition.md](general/design/multi-edition.md) — festival slugs and per-edition partitioning
- [auth-merge-flow.md](general/design/auth-merge-flow.md) — anonymous use and the merge on login
- [share-link-flow.md](general/design/share-link-flow.md) — share token flow

## Backend

Design
- [code-structure.md](backend/design/code-structure.md) — Lambda and shared code layout
- [data-model.md](backend/design/data-model.md) — DynamoDB tables
- [api-endpoints.md](backend/design/api-endpoints.md) — API routes, bios, validity, CloudFront cache paths
- [official-api.md](backend/design/official-api.md) — official best4fest API integration
- [sync-architecture.md](backend/design/sync-architecture.md) — sync and API Lambdas, CloudFront TTLs, DynamoDB fallback

Build
- [deployment.md](backend/build/deployment.md) — certificate, DNS, deploy/redeploy
- [cdk-commands.md](backend/build/cdk-commands.md) — CDK npm commands

Instructions
- [testing.md](backend/instructions/testing.md) — test layers, running tests, fixture data
- [manual-sync.md](backend/instructions/manual-sync.md) — triggering a sync by hand

## Frontend

Design
- [ux-principles.md](frontend/design/ux-principles.md) — UX principles, tech stack
- [navigation.md](frontend/design/navigation.md) — drawer, top/bottom bar, back history, feedback zone
- [interest-system.md](frontend/design/interest-system.md) — interest / star states
- [artist-list.md](frontend/design/artist-list.md) — artist list view
- [artist-detail.md](frontend/design/artist-detail.md) — artist detail view
- [timeline.md](frontend/design/timeline.md) — timeline view, conflict detection, progressive mount
- [timeline-rendering.md](frontend/design/timeline-rendering.md) — landscape trade-off, landing position, no counter-animation against scroll
- [layout-and-chrome.md](frontend/design/layout-and-chrome.md) — layout modes, app chrome, overlays across rotation
- [my-plan.md](frontend/design/my-plan.md) — My plan screen
- [component-inventory.md](frontend/design/component-inventory.md) — UI components, open topics

Architecture
- [overview.md](frontend/design/architecture/overview.md) — tech stack, folders, app state
- [data-layer.md](frontend/design/architecture/data-layer.md) — slug adapter, cache, adapters, cache change notification, data hooks, shared types
- [cache-freshness.md](frontend/design/architecture/cache-freshness.md) — persisted cache and the server watermark
- [background-sync.md](frontend/design/architecture/background-sync.md) — sync runs, intervals, error handling
- [startup.md](frontend/design/architecture/startup.md) — startup gate, UI state persistence, splash
- [known-gaps.md](frontend/design/architecture/known-gaps.md) — deferred items and known gaps

Build
- [native-builds.md](frontend/build/native-builds.md) — EAS setup and build profiles
- [distribution.md](frontend/build/distribution.md) — distributing to invited testers
- [credentials.md](frontend/build/credentials.md) — iOS and Android credentials, build-time env
- [deep-links.md](frontend/build/deep-links.md) — universal/app links and `.well-known` files
- [local-dev-build.md](frontend/build/local-dev-build.md) — local iOS dev build
- [expo-dependency-updates.md](frontend/build/expo-dependency-updates.md) — updating dependencies within an Expo SDK

Instructions
- [local-run.md](frontend/instructions/local-run.md) — running and debugging locally, linting
- [testing.md](frontend/instructions/testing.md) — test units and batches, conventions, what each layer cannot tell you
- [e2e-ios.md](frontend/instructions/e2e-ios.md) — Maestro E2E on the iOS Simulator
- [device-perf.md](frontend/instructions/device-perf.md) — device performance on Android
- [fixtures.md](frontend/instructions/fixtures.md) — generated test fixtures
- [ci.md](frontend/instructions/ci.md) — GitHub Actions
