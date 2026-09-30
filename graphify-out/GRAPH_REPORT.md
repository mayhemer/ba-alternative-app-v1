# Graph Report - app  (2026-09-30)

## Corpus Check
- 177 files · ~596,308 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1309 nodes · 2635 edges · 112 communities (68 shown, 44 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac34966b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- BackHistoryTracker.tsx
- ConflictDetailSheet.tsx
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
- tokens.ts
- dependencies
- What You Must Do When Invoked
- ScreenUIContext.tsx
- compilerOptions
- infra-stack.ts
- .eslintrc.json
- sync/handler.test.ts
- sync/db.ts
- useTimelineData.ts
- backgroundSyncService.test.ts
- expo-apple-authentication
- ArtistListScreen.tsx
- expo-dev-client
- expo-font
- expo-image
- expo-linear-gradient
- expo-secure-store
- conflictUtils.ts
- expo-status-bar
- expo-system-ui
- @expo/vector-icons
- expo-web-browser
- Frontend Architecture
- Tech Stack (Design)
- ArtistBlock.tsx
- App.tsx
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
- @react-navigation/drawer
- @react-navigation/native
- @react-navigation/native-stack
- compilerOptions
- timelineLayout.ts
- Native builds
- Brutal Assault — alternative app
- cacheStore.ts
- TimelineView.tsx
- Festival App UX — Design Decisions
- gen-icons.js
- General Design Principles
- Loading Screen
- ArtistDetailScreen.tsx
- BA Backend
- graphify reference: extra exports and benchmark
- UI Component Inventory
- Deployment instructions for the backend
- cacheService.test.ts
- Coding guidelines
- Timeline View
- expo
- Navigation
- backend.ts
- graphify reference: query, path, explain
- Artist Detail Screen
- useArtistDerived.ts
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
- AppContext.tsx
- @gorhom/bottom-sheet
- tailwindcss
- LensContext.tsx
- drawerOverlay.ts
- gen-fixtures.ts
- AppShell.tsx
- aws-lambda
- frontend/jest.config.ts
- expo-crypto
- tokens.js
- expo-auth-session

## God Nodes (most connected - your core abstractions)
1. `useLayoutMode()` - 27 edges
2. `colors` - 24 edges
3. `DbArtist` - 22 edges
4. `compilerOptions` - 22 edges
5. `Text()` - 20 edges
6. `useSelectedSlug()` - 20 edges
7. `handler()` - 19 edges
8. `useTimelineData()` - 18 edges
9. `BackHistoryTracker()` - 18 edges
10. `currentTimeMs()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Back History System` --references--> `Navigation`  [INFERRED]
  DESIGN.md → frontend/DESIGN.md
- `Bottom Bar` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `Side Drawer` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `Top Bar` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `ArtistCount()` --calls--> `useArtists()`  [EXTRACTED]
  frontend/src/store/cacheStore.test.tsx → frontend/src/store/cacheStore.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Artist Navigation and Details** — frontend_design_artistlistview, frontend_design_artistdetailscreen, frontend_design_bottomtray, frontend_design_starbutton [EXTRACTED 1.00]
- **Timeline Rendering Pipeline** — frontend_design_timelineview, frontend_design_timelineprogressivemount, frontend_design_categorylane, frontend_design_artistblock [EXTRACTED 1.00]

## Communities (112 total, 44 thin omitted)

### Community 0 - "BackHistoryTracker.tsx"
Cohesion: 0.15
Nodes (24): getArtists(), ArtistDetailContext, ArtistDetailContextValue, ArtistDetailProvider(), ArtistDetailState, DetailPresentationState, Appliers, flush() (+16 more)

### Community 1 - "ConflictDetailSheet.tsx"
Cohesion: 0.23
Nodes (10): ConflictDetailHeader(), HeaderProps, MiniTimeline(), MiniTimelineProps, SNAP_POINTS, formatDayLabel(), formatTime(), PIXELS_PER_MS (+2 more)

### Community 2 - "cacheService.ts"
Cohesion: 0.08
Nodes (36): bioCache, biosLoading, bioStorageKey(), BioStore, buildCacheData(), buildLayoutMap(), CacheData, cacheListeners (+28 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (38): @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, devDependencies, @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, esbuild (+30 more)

### Community 4 - "InterestContext.tsx"
Cohesion: 0.05
Nodes (50): authedFetch(), deleteUserInterest(), fetchUserInterests(), putUserInterest(), ServerInterestStatus, hydrateInterests(), InterestStatus, interestStorageKey() (+42 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (36): aws-cdk, aws-cdk-lib, constructs, bin, infra, dependencies, aws-cdk-lib, constructs (+28 more)

### Community 6 - "AuthContext.tsx"
Cohesion: 0.09
Nodes (34): devError(), devLog(), makeRedirectUri(), nameFromClaims(), parseJwtPayload(), refreshTokens(), signIn(), SocialProvider (+26 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, alwaysStrict, declaration, experimentalDecorators, inlineSourceMap, inlineSources, lib, module (+21 more)

### Community 8 - "expo"
Cohesion: 0.06
Nodes (35): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, intentFilters, package, predictiveBackGestureEnabled (+27 more)

### Community 9 - "scripts"
Cohesion: 0.05
Nodes (43): eslint, eslint-config-react-app, devDependencies, eslint, eslint-config-react-app, jest, jest-expo, msw (+35 more)

### Community 10 - "sync/handler.ts"
Cohesion: 0.13
Nodes (30): activeSlugs(), ARTISTS_OFFICIAL_TABLES, Config, getConfig(), handler(), maxTime(), SCHEDULE_OFFICIAL_TABLES, syncSlug() (+22 more)

### Community 11 - "SocialContext.tsx"
Cohesion: 0.10
Nodes (34): authedFetch(), buildShareUrl(), createShareLink(), CreateShareResponse, fetchSharedSchedule(), LINK_PREFIXES, revokeShareLink(), SHARE_LINK_ORIGIN (+26 more)

### Community 12 - "Bottom Bar"
Cohesion: 0.40
Nodes (6): Artist Block, Bottom Bar, Category Lane, Day Switcher, Timeline Progressive Mount, Timeline View

### Community 13 - "api/handler.ts"
Cohesion: 0.09
Nodes (41): client, deleteItem(), dynamo, getItem(), putItem(), queryAll(), querySyncState(), queryUserInterestsBySlug() (+33 more)

### Community 14 - "tokens.ts"
Cohesion: 0.14
Nodes (19): LensChip(), scopeStarStatus(), LensPanel(), RowProps, getStarIconProps(), useLens(), useLensPanel(), useSocialData() (+11 more)

### Community 15 - "dependencies"
Cohesion: 0.22
Nodes (9): @babel/core, babel-preset-expo, expo-asset, expo-splash-screen, dependencies, @babel/core, babel-preset-expo, expo-asset (+1 more)

### Community 16 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 17 - "ScreenUIContext.tsx"
Cohesion: 0.13
Nodes (18): getSlugs(), BottomBarConfig, defaultState, FeedbackMessage, FeedbackTracker, FeedbackVariant, ScreenUIAction, ScreenUIActionsContext (+10 more)

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

### Community 23 - "useTimelineData.ts"
Cohesion: 0.27
Nodes (13): ConflictDetailSheet(), useArtistDetail(), useTimelineFilter(), Options, TimelineData, useTimelineData(), BaseTimelineScreen(), Props (+5 more)

### Community 24 - "backgroundSyncService.test.ts"
Cohesion: 0.12
Nodes (10): API_ORIGIN, baPublicApiAdapter, DataAdapter, ValidationResult, DataCollector, mockFetchAllBios, mockPopulate, mockValidate (+2 more)

### Community 26 - "ArtistListScreen.tsx"
Cohesion: 0.21
Nodes (12): Props, SectionSeparator(), LoadingScreen(), Props, DEFAULT_STYLE, Text(), useArtistListFilter(), ArtistListScreenInner() (+4 more)

### Community 32 - "conflictUtils.ts"
Cohesion: 0.14
Nodes (14): DbArtist, DbEvent, ConflictInputs, ConflictOverlap, eventsOverlap(), TODO: may want a filter that will include "maybe" into the conflict list, ARTIST_EVENTS, ARTISTS (+6 more)

### Community 37 - "Frontend Architecture"
Cohesion: 0.10
Nodes (19): Adapter Interface, Background Sync Service, Cache change notification, Cache Layer, Data Hooks, Deferred / known gaps, Error handling, Flow (+11 more)

### Community 39 - "ArtistBlock.tsx"
Cohesion: 0.20
Nodes (11): ArtistBlock, ArtistBlockBase(), BlockStyle, Props, stripePath(), BLOCK_FONT_SIZE, LANE_BORDER_WIDTH, MIN_BLOCK_WIDTH (+3 more)

### Community 40 - "App.tsx"
Cohesion: 0.06
Nodes (40): App(), plugins, ArtistListFilterContext, ArtistListFilterContextValue, ArtistListFilterProvider(), ConflictDetailContext, ConflictDetailContextValue, ConflictDetailProvider() (+32 more)

### Community 57 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, lib, module, outDir, resolveJsonModule, rootDir, skipLibCheck (+8 more)

### Community 58 - "timelineLayout.ts"
Cohesion: 0.16
Nodes (15): NowLine, Props, CANVAS_WIDTH, DAY_BOUNDARY_HOUR, NOW_LINE_ARROW_SIZE, PIXELS_PER_HOUR, RULER_HEIGHT, TIMELINE_PRE_ROLL_MS (+7 more)

### Community 59 - "Native builds"
Cohesion: 0.12
Nodes (15): Android — EAS-managed keystore, Build profiles (`eas.json`), Credentials, Deep links, Distributing to invited testers (no App Store), First run for iOS (saved working steps), Frontend development, Frontend expo update (+7 more)

### Community 60 - "Brutal Assault — alternative app"
Cohesion: 0.12
Nodes (15): A note on scope and trademarks, API surface, Architecture, Auth, Brutal Assault — alternative app, Connection to the official backend, Current state and what is next, Data model (DynamoDB, 7 tables) (+7 more)

### Community 61 - "cacheStore.ts"
Cohesion: 0.16
Nodes (24): areBiosLoading(), getArtistBio(), getArtistEvents(), getCategories(), getEvents(), getFestivalDays(), getLayoutMap(), getStages() (+16 more)

### Community 62 - "TimelineView.tsx"
Cohesion: 0.18
Nodes (18): CategoryLane, CategoryLaneBase(), LaneEvent, NO_EVENTS, Props, defaultScrollX(), labelRepeatPx(), stripHeightFor() (+10 more)

### Community 63 - "Festival App UX — Design Decisions"
Cohesion: 0.17
Nodes (11): Artist Detail View, Artist List View, Festival App UX — Design Decisions, Filtering, General Principles, Interest / Star System, Layout, Open Topics for follow-on versions (+3 more)

### Community 64 - "gen-icons.js"
Cohesion: 0.24
Nodes (11): ASSETS, centredOnBlack(), fs, Jimp, luminance(), main(), measureArtwork(), path (+3 more)

### Community 67 - "ArtistDetailScreen.tsx"
Cohesion: 0.28
Nodes (7): deriveFestivalDays(), getFestivalDayStart(), Exclamation(), ExclamationTouchable(), PropsTouchable, HTML_TAG_STYLES, Props

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
Cohesion: 0.11
Nodes (18): createDataCollector(), getArtistEventMap(), getCacheVersion(), getCategoryDayLayout(), populateCache(), ARTISTS, BIOS, CATEGORIES (+10 more)

### Community 74 - "Coding guidelines"
Cohesion: 0.25
Nodes (7): Coding guidelines, DynamoDB tables — keeping infra and tests in sync, Frontend constrains, graphify, Major, Minor, Project description

### Community 75 - "Timeline View"
Cohesion: 0.25
Nodes (8): Block Visual States, Bottom Bar, Conflict Detection, Layout, Now Line, Progressive mount, Timeline View, Top Bar Controls

### Community 77 - "Navigation"
Cohesion: 0.29
Nodes (7): Back history, Back History System, Bottom Bar, Navigation, Side Drawer, Side Drawer, Top Bar

### Community 78 - "backend.ts"
Cohesion: 0.20
Nodes (13): LaneLabelOverlay, LaneLabelOverlayBase(), Props, LANE_HEIGHT, STRIP_HEIGHT, DbArtistBioLocalized, DbArtistLocalized, DbCategory (+5 more)

### Community 79 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 80 - "Artist Detail Screen"
Cohesion: 0.70
Nodes (5): Artist Detail Screen, Artist List View, BottomTray (Collapsed Detail), Interest/Star System, Star Button

### Community 81 - "useArtistDerived.ts"
Cohesion: 0.17
Nodes (20): ArtistRow, NAV_ITEMS, NavItem, SideDrawerContent(), getFeedbackLabel(), ConflictContext, ConflictContextValue, ConflictProvider() (+12 more)

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
Cohesion: 0.16
Nodes (20): getSyncWatermark(), hasBios(), setBiosLoading(), biosInFlight, bootstrap(), finishFirstLoad(), isStale(), TODO: have something smarter? check how this works on sleep/resume/kill/restart (+12 more)

### Community 96 - "AppContext.tsx"
Cohesion: 0.19
Nodes (13): extractShareToken(), AppShell(), useFeedback(), useSocialActions(), useOpenSharedSchedule(), useShareLinkHandler(), AppAction, AppContext (+5 more)

### Community 103 - "LensContext.tsx"
Cohesion: 0.21
Nodes (10): LensContext, LensContextValue, LensPanelContext, LensPanelContextValue, LensProvider(), DEFAULT_SCOPE, friendStatusToLocal(), matchesInterestFilter() (+2 more)

### Community 104 - "drawerOverlay.ts"
Cohesion: 0.29
Nodes (9): useExclusiveOverlay(), dispatch(), DRAWER_ID, DrawerAction, openDrawer(), ExclusiveOverlay, onOpening(), register() (+1 more)

### Community 105 - "gen-fixtures.ts"
Cohesion: 0.20
Nodes (7): ARTISTS_SYNCED_AT, Capture, CAPTURES, EDITIONS, HERE, LAST_SYNCED_AT, OUT_ROOT

### Community 106 - "AppShell.tsx"
Cohesion: 0.15
Nodes (17): ArtistDetailSheet(), BottomBar(), DrawerButton(), FeedbackToast(), LOGO_WIDTH, TopBar(), useScreenUI(), useBottomSheetMount() (+9 more)

### Community 107 - "aws-lambda"
Cohesion: 0.50
Nodes (4): types, jest, node, aws-lambda

### Community 108 - "frontend/jest.config.ts"
Cohesion: 0.50
Nodes (3): config, shared, WEB_ONLY_IGNORES

## Knowledge Gaps
- **558 isolated node(s):** `config`, `shelfJestDynamodb`, `config`, `client`, `dynamo` (+553 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `plugins` connect `App.tsx` to `expo`, `AuthContext.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `expo` connect `expo` to `App.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `config`, `shelfJestDynamodb`, `config` to the rest of the system?**
  _558 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BackHistoryTracker.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Should `cacheService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07957957957957958 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `InterestContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.051923076923076926 - nodes in this community are weakly interconnected._