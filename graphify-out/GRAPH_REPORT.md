# Graph Report - app  (2026-10-04)

## Corpus Check
- 214 files · ~615,661 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1542 nodes · 3188 edges · 138 communities (87 shown, 51 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `155b3e2c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- BackHistoryTracker.tsx
- useArtistDerived.ts
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
- AppNavigator.tsx
- dependencies
- What You Must Do When Invoked
- ScreenUIContext.tsx
- compilerOptions
- infra-stack.ts
- .eslintrc.json
- sync/handler.test.ts
- sync/db.ts
- backend.ts
- backgroundSyncService.test.ts
- expo-apple-authentication
- test-e2e-ios.ts
- expo-dev-client
- expo-font
- expo-image
- expo-linear-gradient
- LensPanel.tsx
- conflictUtils.ts
- expo-status-bar
- expo-system-ui
- @expo/vector-icons
- expo-web-browser
- Frontend Architecture
- Tech Stack (Design)
- ConflictDetailSheet.tsx
- StartupGate.test.tsx
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
- useShareLinkHandler.ts
- Native builds
- Brutal Assault — alternative app
- cacheStore.ts
- ArtistBlock.tsx
- Festival App UX — Design Decisions
- gen-icons.js
- General Design Principles
- Loading Screen
- fixtureServer.ts
- BA Backend
- graphify reference: extra exports and benchmark
- UI Component Inventory
- Deployment instructions for the backend
- cacheStore.test.tsx
- Coding guidelines
- Timeline View
- App.tsx
- Navigation
- shell
- graphify reference: query, path, explain
- Artist Detail Screen
- ArtistDetailScreen.tsx
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
- tokens.ts
- LensContext.tsx
- gen-fixtures.ts
- AppShell.tsx
- aws-lambda
- frontend/jest.config.ts
- expo-crypto
- fixtures.ts
- expo-auth-session
- ArtistListScreen.tsx
- @react-navigation/drawer
- frontend/package.json
- test-all
- perf.setup.ts
- timelineLayout.ts
- jest.perf.config.ts
- conflictUtils.perf-test.ts
- DaySwitcher.tsx
- fixtureProcess.ts
- uiStatePersistence.ts
- @types/react
- BaseTimelineScreen.tsx
- interestUtils.ts
- expo-secure-store
- @playwright/test
- AppContext.tsx
- festivalConfig.ts
- @babel/core
- jest
- reassure
- withCleartextTraffic.js

## God Nodes (most connected - your core abstractions)
1. `DbArtist` - 29 edges
2. `scripts` - 27 edges
3. `useLayoutMode()` - 27 edges
4. `colors` - 24 edges
5. `DbEvent` - 23 edges
6. `compilerOptions` - 22 edges
7. `Text()` - 20 edges
8. `useSelectedSlug()` - 20 edges
9. `handler()` - 19 edges
10. `run()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Back History System` --references--> `Navigation`  [INFERRED]
  DESIGN.md → frontend/DESIGN.md
- `Bottom Bar` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `Side Drawer` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `Top Bar` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `DetailControl()` --calls--> `useArtistDetail()`  [EXTRACTED]
  frontend/src/screens/TimelineScreen.interest.renders.perf-test.tsx → frontend/src/context/ArtistDetailContext.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Artist Navigation and Details** — frontend_design_artistlistview, frontend_design_artistdetailscreen, frontend_design_bottomtray, frontend_design_starbutton [EXTRACTED 1.00]
- **Timeline Rendering Pipeline** — frontend_design_timelineview, frontend_design_timelineprogressivemount, frontend_design_categorylane, frontend_design_artistblock [EXTRACTED 1.00]

## Communities (138 total, 51 thin omitted)

### Community 0 - "BackHistoryTracker.tsx"
Cohesion: 0.21
Nodes (19): getArtists(), Appliers, flush(), goBack(), INITIAL, key(), keyWithoutDay(), notifyDepth() (+11 more)

### Community 1 - "useArtistDerived.ts"
Cohesion: 0.13
Nodes (21): InterestStatus, ArtistRow, Props, getFeedbackLabel(), IndicatorProps, Props, STAR_CONFIG, StarConfig (+13 more)

### Community 2 - "cacheService.ts"
Cohesion: 0.08
Nodes (35): bioCache, biosLoading, bioStorageKey(), BioStore, buildCacheData(), buildLayoutMap(), CacheData, cacheListeners (+27 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (38): @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, devDependencies, @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, esbuild (+30 more)

### Community 4 - "InterestContext.tsx"
Cohesion: 0.07
Nodes (39): authedFetch(), deleteUserInterest(), fetchUserInterests(), putUserInterest(), ServerInterestStatus, hydrateInterests(), interestStorageKey(), LocalInterest (+31 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (36): aws-cdk, aws-cdk-lib, constructs, bin, infra, dependencies, aws-cdk-lib, constructs (+28 more)

### Community 6 - "AuthContext.tsx"
Cohesion: 0.16
Nodes (23): devError(), devLog(), makeRedirectUri(), nameFromClaims(), parseJwtPayload(), refreshTokens(), signIn(), SocialProvider (+15 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, alwaysStrict, declaration, experimentalDecorators, inlineSourceMap, inlineSources, lib, module (+21 more)

### Community 8 - "expo"
Cohesion: 0.06
Nodes (35): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, intentFilters, package, predictiveBackGestureEnabled (+27 more)

### Community 9 - "scripts"
Cohesion: 0.07
Nodes (27): scripts, android, build:android:perf, build:android:preview, build:ios:e2e, build:ios:preview, build:web, clean:ios:e2e (+19 more)

### Community 10 - "sync/handler.ts"
Cohesion: 0.13
Nodes (30): activeSlugs(), ARTISTS_OFFICIAL_TABLES, Config, getConfig(), handler(), maxTime(), SCHEDULE_OFFICIAL_TABLES, syncSlug() (+22 more)

### Community 11 - "SocialContext.tsx"
Cohesion: 0.15
Nodes (23): API_ORIGIN, authedFetch(), buildShareUrl(), createShareLink(), CreateShareResponse, fetchSharedSchedule(), LINK_PREFIXES, revokeShareLink() (+15 more)

### Community 12 - "Bottom Bar"
Cohesion: 0.40
Nodes (6): Artist Block, Bottom Bar, Category Lane, Day Switcher, Timeline Progressive Mount, Timeline View

### Community 13 - "api/handler.ts"
Cohesion: 0.09
Nodes (41): client, deleteItem(), dynamo, getItem(), putItem(), queryAll(), querySyncState(), queryUserInterestsBySlug() (+33 more)

### Community 14 - "AppNavigator.tsx"
Cohesion: 0.18
Nodes (15): getSlugs(), NAV_ITEMS, NavItem, SideDrawerContent(), useAuth(), useConflicts(), useBottomBar(), useScreenUIActions() (+7 more)

### Community 15 - "dependencies"
Cohesion: 0.22
Nodes (9): babel-preset-expo, expo, expo-asset, expo-splash-screen, dependencies, babel-preset-expo, expo, expo-asset (+1 more)

### Community 16 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 17 - "ScreenUIContext.tsx"
Cohesion: 0.13
Nodes (15): BottomBarConfig, defaultState, FeedbackMessage, FeedbackTracker, FeedbackVariant, ScreenUIAction, ScreenUIActionsContext, ScreenUIActionsContextValue (+7 more)

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

### Community 23 - "backend.ts"
Cohesion: 0.10
Nodes (27): getFestivalDays(), BUDGET, ArtistListScreen(), BUDGET, Case, CASES, DetailControl(), NOW (+19 more)

### Community 24 - "backgroundSyncService.test.ts"
Cohesion: 0.13
Nodes (9): baPublicApiAdapter, DataAdapter, ValidationResult, DataCollector, mockFetchAllBios, mockPopulate, mockValidate, SERVER_SYNCED_AT (+1 more)

### Community 26 - "test-e2e-ios.ts"
Cohesion: 0.10
Nodes (41): before, data, remove(), ROOT, sim, sizeMb(), args, current (+33 more)

### Community 31 - "LensPanel.tsx"
Cohesion: 0.24
Nodes (11): LensChip(), scopeStarStatus(), LensPanel(), RowProps, getStarIconProps(), useLens(), useLensPanel(), useSocialData() (+3 more)

### Community 32 - "conflictUtils.ts"
Cohesion: 0.12
Nodes (19): LaneLabelOverlayBase(), DbArtistLocalized, DbCategoryLocalized, DbStageLocalized, computeConflictEntries(), computeConflictOverlaps(), eventsOverlap(), TODO: may want a filter that will include "maybe" into the conflict list (+11 more)

### Community 37 - "Frontend Architecture"
Cohesion: 0.10
Nodes (19): Adapter Interface, Background Sync Service, Cache change notification, Cache Layer, Data Hooks, Deferred / known gaps, Error handling, Flow (+11 more)

### Community 39 - "ConflictDetailSheet.tsx"
Cohesion: 0.14
Nodes (20): ArtistDetailSheet(), ConflictDetailHeader(), ConflictDetailSheet(), HeaderProps, MiniTimeline(), MiniTimelineProps, SNAP_POINTS, formatDayLabel() (+12 more)

### Community 40 - "StartupGate.test.tsx"
Cohesion: 0.18
Nodes (7): SplashScreen(), StartupGate(), mockHydrate, mockStartSync, mockStop, hydrateLocalState(), hydrateUiState()

### Community 54 - "test-perf-device.ts"
Cohesion: 0.08
Nodes (31): Device, batteryTempC(), coldStart, coolDown(), Frames, Memory, readMemory(), ALL (+23 more)

### Community 57 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, lib, module, outDir, resolveJsonModule, rootDir, skipLibCheck (+8 more)

### Community 58 - "useShareLinkHandler.ts"
Cohesion: 0.26
Nodes (9): extractShareToken(), SHARE_LINK_PATH, FriendSchedule, useFeedback(), useSocialActions(), useOpenSharedSchedule(), DrawerParamList, navigationRef (+1 more)

### Community 59 - "Native builds"
Cohesion: 0.09
Nodes (21): Android — EAS-managed keystore, Build profiles (`eas.json`), CI, Credentials, Deep links, Device performance (Android), Distributing to invited testers (no App Store), First run for iOS (saved working steps) (+13 more)

### Community 60 - "Brutal Assault — alternative app"
Cohesion: 0.12
Nodes (15): A note on scope and trademarks, API surface, Architecture, Auth, Brutal Assault — alternative app, Connection to the official backend, Current state and what is next, Data model (DynamoDB, 7 tables) (+7 more)

### Community 61 - "cacheStore.ts"
Cohesion: 0.11
Nodes (29): areBiosLoading(), getArtistBio(), getArtistEventMap(), getArtistEvents(), getCacheVersion(), getCategories(), getCategoryDayLayout(), getEvents() (+21 more)

### Community 62 - "ArtistBlock.tsx"
Cohesion: 0.21
Nodes (11): ArtistBlock, ArtistBlockBase(), BlockStyle, Props, stripePath(), BLOCK_FONT_SIZE, LANE_BORDER_WIDTH, MIN_BLOCK_WIDTH (+3 more)

### Community 63 - "Festival App UX — Design Decisions"
Cohesion: 0.17
Nodes (11): Artist Detail View, Artist List View, Festival App UX — Design Decisions, Filtering, General Principles, Interest / Star System, Layout, Open Topics for follow-on versions (+3 more)

### Community 64 - "gen-icons.js"
Cohesion: 0.24
Nodes (11): ASSETS, centredOnBlack(), fs, Jimp, luminance(), main(), measureArtwork(), path (+3 more)

### Community 67 - "fixtureServer.ts"
Cohesion: 0.15
Nodes (13): API_PORT, APP_PORT, HERE, DATASETS, FIXTURES, FixtureServer, HERE, readFixture() (+5 more)

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

### Community 73 - "cacheStore.test.tsx"
Cohesion: 0.21
Nodes (9): createDataCollector(), populateCache(), populate(), ArtistCount(), ARTISTS, BioState(), populate(), SYNCED_AT (+1 more)

### Community 74 - "Coding guidelines"
Cohesion: 0.25
Nodes (7): Coding guidelines, DynamoDB tables — keeping infra and tests in sync, Frontend constrains, graphify, Major, Minor, Project description

### Community 75 - "Timeline View"
Cohesion: 0.25
Nodes (8): Block Visual States, Bottom Bar, Conflict Detection, Layout, Now Line, Progressive mount, Timeline View, Top Bar Controls

### Community 76 - "App.tsx"
Cohesion: 0.16
Nodes (11): App(), plugins, ArtistDetailContext, ArtistDetailContextValue, ArtistDetailProvider(), ArtistDetailState, DetailPresentationState, expo-apple-authentication (+3 more)

### Community 77 - "Navigation"
Cohesion: 0.29
Nodes (7): Back history, Back History System, Bottom Bar, Navigation, Side Drawer, Side Drawer, Top Bar

### Community 78 - "shell"
Cohesion: 0.25
Nodes (20): shell(), readFrames(), resetFrames(), dumpUi(), find(), Match, matches(), tap() (+12 more)

### Community 79 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 80 - "Artist Detail Screen"
Cohesion: 0.70
Nodes (5): Artist Detail Screen, Artist List View, BottomTray (Collapsed Detail), Interest/Star System, Star Button

### Community 81 - "ArtistDetailScreen.tsx"
Cohesion: 0.13
Nodes (20): Props, SectionSeparator(), FriendAvatar(), initialsOf(), Props, FriendFacepile(), Props, FriendPickList() (+12 more)

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
Cohesion: 0.21
Nodes (18): getSyncWatermark(), hasBios(), hasCachedData(), setBiosLoading(), biosInFlight, bootstrap(), finishFirstLoad(), isStale() (+10 more)

### Community 96 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-react-app, devDependencies, eslint, eslint-config-react-app, jest-expo, msw, test-renderer (+11 more)

### Community 103 - "tokens.ts"
Cohesion: 0.20
Nodes (8): ColorToken, colors, MAX_CONTENT_WIDTH, OVERLAY_PANEL_MARGIN, OVERLAY_PANEL_MAX_WIDTH, OVERLAY_PANEL_RADIUS, TEXT_SHRINK_SCALE, { colors }

### Community 104 - "LensContext.tsx"
Cohesion: 0.16
Nodes (15): LensContext, LensContextValue, LensPanelContext, LensPanelContextValue, LensProvider(), useExclusiveOverlay(), dispatch(), DRAWER_ID (+7 more)

### Community 105 - "gen-fixtures.ts"
Cohesion: 0.20
Nodes (7): ARTISTS_SYNCED_AT, Capture, CAPTURES, EDITIONS, HERE, LAST_SYNCED_AT, OUT_ROOT

### Community 106 - "AppShell.tsx"
Cohesion: 0.19
Nodes (15): AppShell(), BottomBar(), DrawerButton(), FeedbackToast(), LOGO_WIDTH, TopBar(), useScreenUI(), LayoutMode (+7 more)

### Community 107 - "aws-lambda"
Cohesion: 0.50
Nodes (4): types, jest, node, aws-lambda

### Community 108 - "frontend/jest.config.ts"
Cohesion: 0.50
Nodes (3): config, shared, WEB_ONLY_IGNORES

### Community 110 - "fixtures.ts"
Cohesion: 0.31
Nodes (6): cutNetwork(), FIXTURE_SLUG, PINNED_NOW, seedEdition(), test, useFixtureApi()

### Community 112 - "ArtistListScreen.tsx"
Cohesion: 0.27
Nodes (9): ArtistListFilterContext, ArtistListFilterContextValue, ArtistListFilterProvider(), useArtistListFilter(), ArtistListScreenInner(), ArtistListTopBarRight(), buildSections(), Section (+1 more)

### Community 114 - "frontend/package.json"
Cohesion: 0.40
Nodes (4): main, name, private, version

### Community 117 - "timelineLayout.ts"
Cohesion: 0.08
Nodes (42): CategoryLane, CategoryLaneBase(), LaneEvent, NO_EVENTS, Props, LaneLabelOverlay, Props, NowLine (+34 more)

### Community 119 - "conflictUtils.perf-test.ts"
Cohesion: 0.17
Nodes (12): ARTISTS, ConflictInputs, ARTIST_EVENTS, ARTISTS, EVENTS, HEAVY, INPUTS, PLAYABLE (+4 more)

### Community 120 - "DaySwitcher.tsx"
Cohesion: 0.18
Nodes (14): DaySwitcher(), formatDate(), formatWeekday(), getCurrentDayStart(), Props, WEEKDAY_NAMES, ScrollToTimeSignal, TimelineFilterContext (+6 more)

### Community 121 - "fixtureProcess.ts"
Cohesion: 0.50
Nodes (4): FixtureProcess, reachable(), SERVER, startFixtureProcess()

### Community 122 - "uiStatePersistence.ts"
Cohesion: 0.13
Nodes (16): TimelineFilterProvider(), dirty, ENTRIES, Entry, flushDirty(), getUiState(), KEYS, scheduleWrite() (+8 more)

### Community 125 - "BaseTimelineScreen.tsx"
Cohesion: 0.21
Nodes (9): getFestivalDayStart(), useTimelineData(), BaseTimelineScreen(), Props, TopBarRight(), useSelectedSlug(), useFestivalDays(), getSelectedDay() (+1 more)

### Community 126 - "interestUtils.ts"
Cohesion: 0.47
Nodes (5): SharedInterestStatus, friendStatusToLocal(), matchesInterestFilter(), matchesScope(), ScopeLevel

### Community 129 - "AppContext.tsx"
Cohesion: 0.24
Nodes (9): AppAction, AppContext, AppContextValue, AppProvider(), appReducer(), AppState, TODO: Change the default slug automatically for the first installation to be, useAppContext() (+1 more)

### Community 130 - "festivalConfig.ts"
Cohesion: 0.33
Nodes (5): FESTIVAL_CONFIGS, FestivalConfig, SYNC_INTERVAL_BEFORE_FESTIVAL_MS, SYNC_INTERVAL_DEFAULT_MS, SYNC_INTERVAL_DURING_FESTIVAL_MS

## Knowledge Gaps
- **656 isolated node(s):** `config`, `shelfJestDynamodb`, `config`, `client`, `dynamo` (+651 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `key()` connect `BackHistoryTracker.tsx` to `test-e2e-ios.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `plugins` connect `App.tsx` to `expo`, `AuthContext.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `expo` connect `expo` to `App.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `config`, `shelfJestDynamodb`, `config` to the rest of the system?**
  _656 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useArtistDerived.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._
- **Should `cacheService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08253968253968254 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._