# Graph Report - app  (2026-10-04)

## Corpus Check
- 228 files · ~624,467 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1622 nodes · 3416 edges · 140 communities (90 shown, 50 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `970cae3f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- BackHistoryTracker.tsx
- ArtistBlock.tsx
- cacheService.ts
- devDependencies
- InterestContext.tsx
- devDependencies
- AuthContext.tsx
- compilerOptions
- expo
- scripts
- sync/handler.ts
- SocialContext.tsx
- Bottom Bar
- api/handler.ts
- useLayoutMode
- dependencies
- What You Must Do When Invoked
- ScreenUIContext.tsx
- compilerOptions
- infra-stack.ts
- .eslintrc.json
- sync/handler.test.ts
- sync/db.ts
- TimelineScreen.interest.renders.perf-test.tsx
- backgroundSyncService.test.ts
- expo-apple-authentication
- test-e2e-ios.ts
- expo-dev-client
- TimelineView.tsx
- expo-image
- expo-linear-gradient
- tokens.ts
- conflictUtils.ts
- expo-status-bar
- expo-system-ui
- @expo/vector-icons
- expo-web-browser
- Frontend Architecture
- Tech Stack (Design)
- useTimelineData.ts
- StartupGate.tsx
- nativewind
- react
- react-dom
- react-native
- @react-native-async-storage/async-storage
- react-native-gesture-handler
- react-native-reanimated
- react-native-render-html
- react-native-safe-area-context
- react-native-screens
- react-native-svg
- react-native-web
- react-native-worklets
- test-perf-device.ts
- @react-navigation/native
- @react-navigation/native-stack
- compilerOptions
- useArtistDerived.ts
- Native builds
- Brutal Assault — alternative app
- cacheStore.ts
- backend.ts
- Festival App UX — Design Decisions
- gen-icons.js
- General Design Principles
- Loading Screen
- timeline.spec.ts
- BA Backend
- graphify reference: extra exports and benchmark
- UI Component Inventory
- Deployment instructions for the backend
- cacheService.test.ts
- Coding guidelines
- Timeline View
- App.tsx
- Navigation
- shell
- graphify reference: query, path, explain
- Artist Detail Screen
- colors
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Top Bar
- metro.config.js
- jest.integration.config.ts
- clearTables.ts
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Welcome to your CDK TypeScript project
- jest.config.ts
- .claude/CLAUDE.md
- extraction-spec.md
- backgroundSyncService.ts
- devDependencies
- @gorhom/bottom-sheet
- tailwindcss
- ArtistDetailScreen.tsx
- LensContext.tsx
- gen-fixtures.ts
- check-render-counts.ts
- aws-lambda
- frontend/jest.config.ts
- expo-crypto
- BaseTimelineScreen.test.tsx
- expo-auth-session
- toFestivalClock
- @react-navigation/drawer
- frontend/package.json
- test-all
- perf.setup.ts
- timelineLayout.ts
- jest.perf.config.ts
- androidUi.ts
- DaySwitcher.tsx
- fixtureProcess.ts
- BaseTimelineScreen.tsx
- @types/react
- ConflictDetailSheet.tsx
- ArtistListScreen.tsx
- expo-secure-store
- @playwright/test
- LaneLabelOverlay.tsx
- festivalConfig.ts
- expo
- @babel/core
- jest
- reassure
- withCleartextTraffic.js

## God Nodes (most connected - your core abstractions)
1. `DbArtist` - 34 edges
2. `DbEvent` - 28 edges
3. `scripts` - 27 edges
4. `useLayoutMode()` - 27 edges
5. `colors` - 24 edges
6. `compilerOptions` - 22 edges
7. `run()` - 21 edges
8. `Text()` - 20 edges
9. `useSelectedSlug()` - 20 edges
10. `handler()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Back History System` --references--> `Navigation`  [INFERRED]
  DESIGN.md → frontend/DESIGN.md
- `Bottom Bar` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `Side Drawer` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `Top Bar` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `syncSlug()` --calls--> `invalidatePaths()`  [EXTRACTED]
  backend/lambdas/sync/handler.ts → backend/lambdas/sync/cloudfront.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Artist Navigation and Details** — frontend_design_artistlistview, frontend_design_artistdetailscreen, frontend_design_bottomtray, frontend_design_starbutton [EXTRACTED 1.00]
- **Timeline Rendering Pipeline** — frontend_design_timelineview, frontend_design_timelineprogressivemount, frontend_design_categorylane, frontend_design_artistblock [EXTRACTED 1.00]

## Communities (140 total, 50 thin omitted)

### Community 0 - "BackHistoryTracker.tsx"
Cohesion: 0.14
Nodes (25): useConflictDetail(), useLensPanel(), Appliers, flush(), goBack(), INITIAL, key(), keyWithoutDay() (+17 more)

### Community 1 - "ArtistBlock.tsx"
Cohesion: 0.14
Nodes (17): ArtistBlockBase(), BlockStyle, Props, stripePath(), CategoryLane, LaneEvent, NO_EVENTS, Props (+9 more)

### Community 2 - "cacheService.ts"
Cohesion: 0.07
Nodes (31): bioCache, biosLoading, BioStore, buildCacheData(), buildLayoutMap(), CacheData, cacheListeners, DbCategoryDayLayout (+23 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (38): @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, devDependencies, @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, esbuild (+30 more)

### Community 4 - "InterestContext.tsx"
Cohesion: 0.07
Nodes (40): authedFetch(), deleteUserInterest(), fetchUserInterests(), putUserInterest(), ServerInterestStatus, InterestStatus, INTEREST_FILTER_LABELS, StarFilterButton() (+32 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (36): aws-cdk, aws-cdk-lib, constructs, bin, infra, dependencies, aws-cdk-lib, constructs (+28 more)

### Community 6 - "AuthContext.tsx"
Cohesion: 0.16
Nodes (24): devError(), devLog(), makeRedirectUri(), nameFromClaims(), parseJwtPayload(), refreshTokens(), signIn(), SocialProvider (+16 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, alwaysStrict, declaration, experimentalDecorators, inlineSourceMap, inlineSources, lib, module (+21 more)

### Community 8 - "expo"
Cohesion: 0.05
Nodes (40): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, intentFilters, package, predictiveBackGestureEnabled (+32 more)

### Community 9 - "scripts"
Cohesion: 0.07
Nodes (27): scripts, build:e2e:ios, build:perf:android, build:preview:android, build:preview:ios, build:web, clean:e2e:ios, doctor (+19 more)

### Community 10 - "sync/handler.ts"
Cohesion: 0.13
Nodes (30): activeSlugs(), ARTISTS_OFFICIAL_TABLES, Config, getConfig(), handler(), maxTime(), SCHEDULE_OFFICIAL_TABLES, syncSlug() (+22 more)

### Community 11 - "SocialContext.tsx"
Cohesion: 0.08
Nodes (40): API_ORIGIN, authedFetch(), buildShareUrl(), createShareLink(), CreateShareResponse, extractShareToken(), fetchSharedSchedule(), LINK_PREFIXES (+32 more)

### Community 12 - "Bottom Bar"
Cohesion: 0.40
Nodes (6): Artist Block, Bottom Bar, Category Lane, Day Switcher, Timeline Progressive Mount, Timeline View

### Community 13 - "api/handler.ts"
Cohesion: 0.09
Nodes (41): client, deleteItem(), dynamo, getItem(), putItem(), queryAll(), querySyncState(), queryUserInterestsBySlug() (+33 more)

### Community 14 - "useLayoutMode"
Cohesion: 0.21
Nodes (15): getSlugs(), NAV_ITEMS, NavItem, SideDrawerContent(), useConflicts(), useBottomBar(), useScreenUIActions(), useTopBar() (+7 more)

### Community 15 - "dependencies"
Cohesion: 0.22
Nodes (9): babel-preset-expo, expo-asset, expo-font, expo-splash-screen, dependencies, babel-preset-expo, expo-asset, expo-font (+1 more)

### Community 16 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 17 - "ScreenUIContext.tsx"
Cohesion: 0.11
Nodes (22): BottomBar(), DrawerButton(), FeedbackToast(), LOGO_WIDTH, TopBar(), BottomBarConfig, defaultState, FeedbackMessage (+14 more)

### Community 18 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowImportingTsExtensions, noEmit, resolveJsonModule, strict, extends, expo/tsconfig.base

### Community 19 - "infra-stack.ts"
Cohesion: 0.12
Nodes (10): app, Api, ApiProps, Auth, Cdn, CdnProps, Lambdas, LambdasProps (+2 more)

### Community 21 - "sync/handler.test.ts"
Cohesion: 0.10
Nodes (16): cf, invalidatePaths(), ARTIST_1, BASE_ENV, CHANGES, EVENT, mockBatchDelete, mockBatchPut (+8 more)

### Community 22 - "sync/db.ts"
Cohesion: 0.25
Nodes (13): batchDelete(), batchPut(), client, closeDbClient(), DocWriteRequest, dynamo, getSyncState(), putSyncState() (+5 more)

### Community 23 - "TimelineScreen.interest.renders.perf-test.tsx"
Cohesion: 0.16
Nodes (12): getArtists(), buildSections(), ARTISTS, Case, CASES, NOW, pressContext(), pressSheet() (+4 more)

### Community 24 - "backgroundSyncService.test.ts"
Cohesion: 0.13
Nodes (9): baPublicApiAdapter, DataAdapter, ValidationResult, DataCollector, mockFetchAllBios, mockPopulate, mockValidate, SERVER_SYNCED_AT (+1 more)

### Community 26 - "test-e2e-ios.ts"
Cohesion: 0.10
Nodes (40): before, data, remove(), ROOT, sim, sizeMb(), args, current (+32 more)

### Community 28 - "TimelineView.tsx"
Cohesion: 0.23
Nodes (15): CategoryLaneBase(), defaultScrollX(), eventScrollTarget, labelRepeatPx(), stripHeightFor(), timeToX(), clampToViewWindow(), MountWindow (+7 more)

### Community 31 - "tokens.ts"
Cohesion: 0.12
Nodes (18): LensPanel(), RowProps, useAuth(), LayoutMode, AccountSection(), BOTTOM_OVERLAY_CLEARANCE, ColorToken, COMPACT_DIMENSION_BREAKPOINT (+10 more)

### Community 32 - "conflictUtils.ts"
Cohesion: 0.10
Nodes (21): DbArtistEventMap, computeConflictEntries(), computeConflictOverlaps(), ConflictInputs, eventsOverlap(), ARTIST_EVENTS, ARTISTS, EVENTS (+13 more)

### Community 37 - "Frontend Architecture"
Cohesion: 0.10
Nodes (19): Adapter Interface, Background Sync Service, Cache change notification, Cache Layer, Data Hooks, Deferred / known gaps, Error handling, Flow (+11 more)

### Community 39 - "useTimelineData.ts"
Cohesion: 0.28
Nodes (14): ConflictContext, ConflictContextValue, ConflictProvider(), useInterest(), useSocialData(), Options, TimelineData, useTimelineData() (+6 more)

### Community 40 - "StartupGate.tsx"
Cohesion: 0.20
Nodes (8): StartupGate(), mockHydrate, mockStartSync, mockStop, hydrateLocalState(), hydrateUiState(), startSync(), stop()

### Community 54 - "test-perf-device.ts"
Cohesion: 0.08
Nodes (26): PACKAGE, clearLog(), Frames, markGapMs(), Memory, ALL, args, baselineFile (+18 more)

### Community 57 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, lib, module, outDir, resolveJsonModule, rootDir, skipLibCheck (+8 more)

### Community 58 - "useArtistDerived.ts"
Cohesion: 0.26
Nodes (11): ArtistRow, Props, SPARSE, getFeedbackLabel(), useStartProgress(), useArtistDerived(), DbCategoryLocalized, DbStageLocalized (+3 more)

### Community 59 - "Native builds"
Cohesion: 0.09
Nodes (21): Android — EAS-managed keystore, Build profiles (`eas.json`), CI, Credentials, Deep links, Device performance (Android), Distributing to invited testers (no App Store), First run for iOS (saved working steps) (+13 more)

### Community 60 - "Brutal Assault — alternative app"
Cohesion: 0.12
Nodes (15): A note on scope and trademarks, API surface, Architecture, Auth, Brutal Assault — alternative app, Connection to the official backend, Current state and what is next, Data model (DynamoDB, 7 tables) (+7 more)

### Community 61 - "cacheStore.ts"
Cohesion: 0.14
Nodes (24): areBiosLoading(), DbFestivalDays, DbLayoutMap, getArtistBio(), getArtistEventMap(), getArtistEvents(), getCacheVersion(), getEvents() (+16 more)

### Community 62 - "backend.ts"
Cohesion: 0.12
Nodes (22): BUDGET, ArtistBlock, ArtistListScreen(), BUDGET, NOW, SYNCED_AT, TimelineScreen(), DbArtist (+14 more)

### Community 63 - "Festival App UX — Design Decisions"
Cohesion: 0.17
Nodes (11): Artist Detail View, Artist List View, Festival App UX — Design Decisions, Filtering, General Principles, Interest / Star System, Layout, Open Topics for follow-on versions (+3 more)

### Community 64 - "gen-icons.js"
Cohesion: 0.24
Nodes (11): ASSETS, centredOnBlack(), fs, Jimp, luminance(), main(), measureArtwork(), path (+3 more)

### Community 67 - "timeline.spec.ts"
Cohesion: 0.06
Nodes (32): cutNetwork(), FIXTURE_SLUG, PINNED_NOW, seedEdition(), test, useFixtureApi(), ARTISTS, EVENTS (+24 more)

### Community 69 - "BA Backend"
Cohesion: 0.20
Nodes (9): Adding fixture data, Additional notes, BA Backend, Layer 1 — Pure unit tests (`normalize.test.ts`), Layer 2 — Sync logic tests (`handler.test.ts`), Layer 3 — Integration tests (`tests/integration/db.test.ts`), Running tests, Structure (+1 more)

### Community 70 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 71 - "UI Component Inventory"
Cohesion: 0.22
Nodes (9): Artist Detail, Artist List, Bottom Bar, Interest Control, Layout, Navigation, Timeline, Top Bar (+1 more)

### Community 72 - "Deployment instructions for the backend"
Cohesion: 0.25
Nodes (7): Certificate, Deploy/redeploy, Deployment instructions for the backend, Manual sync, Prerequisites, Validation, via cli

### Community 73 - "cacheService.test.ts"
Cohesion: 0.13
Nodes (14): createDataCollector(), getCategoryDayLayout(), getFestivalDays(), populateCache(), ARTISTS, BIOS, CATEGORIES, EVENTS (+6 more)

### Community 74 - "Coding guidelines"
Cohesion: 0.25
Nodes (7): Coding guidelines, DynamoDB tables — keeping infra and tests in sync, Frontend constrains, graphify, Major, Minor, Project description

### Community 75 - "Timeline View"
Cohesion: 0.25
Nodes (8): Block Visual States, Bottom Bar, Conflict Detection, Layout, Now Line, Progressive mount, Timeline View, Top Bar Controls

### Community 76 - "App.tsx"
Cohesion: 0.16
Nodes (10): App(), AppShell(), ArtistListFilterContext, ArtistListFilterContextValue, ArtistListFilterProvider(), useArtistListFilter(), ConflictDetailContext, ConflictDetailContextValue (+2 more)

### Community 77 - "Navigation"
Cohesion: 0.29
Nodes (7): Back history, Back History System, Bottom Bar, Navigation, Side Drawer, Side Drawer, Top Bar

### Community 78 - "shell"
Cohesion: 0.28
Nodes (24): shell(), batteryTempC(), coldStart, coolDown(), readFrames(), readMemory(), resetFrames(), dumpUi() (+16 more)

### Community 79 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 80 - "Artist Detail Screen"
Cohesion: 0.70
Nodes (5): Artist Detail Screen, Artist List View, BottomTray (Collapsed Detail), Interest/Star System, Star Button

### Community 81 - "colors"
Cohesion: 0.19
Nodes (14): FriendAvatar(), initialsOf(), Props, FriendFacepile(), Props, FriendPickList(), LoadingScreen(), Props (+6 more)

### Community 82 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 83 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 84 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 85 - "Top Bar"
Cohesion: 0.50
Nodes (4): AppShell Component, Conflict Detection, Top Bar Feedback Zone, Top Bar

### Community 86 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 95 - "backgroundSyncService.ts"
Cohesion: 0.17
Nodes (25): bioStorageKey(), evictBiosExcept(), festivalStorageKey(), getSyncWatermark(), hasBios(), hasCachedData(), hydrateBioCache(), hydrateFestivalCache() (+17 more)

### Community 96 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-react-app, devDependencies, eslint, eslint-config-react-app, jest-expo, msw, test-renderer (+11 more)

### Community 103 - "ArtistDetailScreen.tsx"
Cohesion: 0.24
Nodes (9): Exclamation(), ExclamationTouchable(), PropsTouchable, useTimelineFilter(), ArtistDetailBody(), ArtistDetailHeader(), HTML_TAG_STYLES, Props (+1 more)

### Community 104 - "LensContext.tsx"
Cohesion: 0.15
Nodes (16): LensContext, LensContextValue, LensPanelContext, LensPanelContextValue, LensProvider(), useExclusiveOverlay(), DrawerParamList, dispatch() (+8 more)

### Community 105 - "gen-fixtures.ts"
Cohesion: 0.20
Nodes (7): ARTISTS_SYNCED_AT, Capture, CAPTURES, EDITIONS, HERE, LAST_SYNCED_AT, OUT_ROOT

### Community 106 - "check-render-counts.ts"
Cohesion: 0.20
Nodes (8): Added, Compared, failures, improved, Issues, Measured, OUTPUT, ROOT

### Community 107 - "aws-lambda"
Cohesion: 0.50
Nodes (4): types, jest, node, aws-lambda

### Community 108 - "frontend/jest.config.ts"
Cohesion: 0.50
Nodes (3): config, shared, WEB_ONLY_IGNORES

### Community 110 - "BaseTimelineScreen.test.tsx"
Cohesion: 0.21
Nodes (7): getCategories(), mount(), NOW, settle(), WED, setCurrentTimeMs(), TESTING_TIME_VALUE

### Community 112 - "toFestivalClock"
Cohesion: 0.42
Nodes (6): FESTIVAL_TIME_ZONE, festivalUtcOffsetMs(), fromFestivalClock(), lastSundayChangeUtc(), offsetFormat, toFestivalClock()

### Community 114 - "frontend/package.json"
Cohesion: 0.40
Nodes (4): main, name, private, version

### Community 115 - "test-all"
Cohesion: 0.83
Nodes (3): test-all script, skipped(), step()

### Community 117 - "timelineLayout.ts"
Cohesion: 0.09
Nodes (27): ConflictDetailHeader(), EDITIONS, KNOWN_OVERLAPS, NowLine, Props, CANVAS_WIDTH, DAY_BOUNDARY_HOUR, DAY_DURATION_MS (+19 more)

### Community 119 - "androidUi.ts"
Cohesion: 0.33
Nodes (6): Device, find(), Match, matches(), UiNode, unescape()

### Community 120 - "DaySwitcher.tsx"
Cohesion: 0.24
Nodes (7): DaySwitcher(), getCurrentDayStart(), Props, CONTENT_MAX_WIDTH, formatDayMonth(), NOW_BUTTON_ARROW_SIZE, SupportTimelineScreen()

### Community 121 - "fixtureProcess.ts"
Cohesion: 0.50
Nodes (4): FixtureProcess, reachable(), SERVER, startFixtureProcess()

### Community 122 - "BaseTimelineScreen.tsx"
Cohesion: 0.11
Nodes (25): ScrollToTimeSignal, TimelineFilterContext, TimelineFilterContextValue, TimelineFilterProvider(), BaseTimelineScreen(), Props, TopBarRight(), useFestivalDays() (+17 more)

### Community 125 - "ConflictDetailSheet.tsx"
Cohesion: 0.14
Nodes (16): ArtistDetailSheet(), ConflictDetailSheet(), HeaderProps, MiniTimeline(), MiniTimelineProps, SNAP_POINTS, ArtistDetailContext, ArtistDetailContextValue (+8 more)

### Community 126 - "ArtistListScreen.tsx"
Cohesion: 0.16
Nodes (15): Props, SectionSeparator(), LensChip(), scopeStarStatus(), getStarIconProps(), useLens(), ArtistListTopBarRight(), Section (+7 more)

### Community 129 - "LaneLabelOverlay.tsx"
Cohesion: 0.33
Nodes (6): LaneLabelOverlay, LaneLabelOverlayBase(), Props, LANE_HEIGHT, STRIP_HEIGHT, getCategoryLocalized()

### Community 130 - "festivalConfig.ts"
Cohesion: 0.33
Nodes (5): FESTIVAL_CONFIGS, FestivalConfig, SYNC_INTERVAL_BEFORE_FESTIVAL_MS, SYNC_INTERVAL_DEFAULT_MS, SYNC_INTERVAL_DURING_FESTIVAL_MS

## Knowledge Gaps
- **678 isolated node(s):** `config`, `shelfJestDynamodb`, `config`, `client`, `dynamo` (+673 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `key()` connect `BackHistoryTracker.tsx` to `test-e2e-ios.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `AuthContext.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `config`, `shelfJestDynamodb`, `config` to the rest of the system?**
  _678 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BackHistoryTracker.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14039408866995073 - nodes in this community are weakly interconnected._
- **Should `ArtistBlock.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `cacheService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06906906906906907 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._