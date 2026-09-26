# Graph Report - app  (2026-09-26)

## Corpus Check
- 154 files · ~423,977 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1209 nodes · 2423 edges · 109 communities (66 shown, 43 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `745e74a1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- BackHistoryTracker.tsx
- ConflictDetailSheet.tsx
- cacheService.ts
- devDependencies
- InterestContext.tsx
- devDependencies
- authService.ts
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
- frontend/tsconfig.json
- infra-stack.ts
- .eslintrc.json
- sync/handler.test.ts
- sync/db.ts
- BaseTimelineScreen.tsx
- DaySwitcher.tsx
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
- uiStatePersistence.ts
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
- types.ts
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
- useTimelineData.ts
- SettingsScreen.tsx
- @gorhom/bottom-sheet
- tailwindcss
- AppNavigator.tsx
- ConflictDetailContext.tsx
- colors
- useLayoutMode
- @babel/core
- expo-crypto

## God Nodes (most connected - your core abstractions)
1. `useLayoutMode()` - 27 edges
2. `colors` - 24 edges
3. `compilerOptions` - 22 edges
4. `Text()` - 20 edges
5. `useSelectedSlug()` - 20 edges
6. `handler()` - 19 edges
7. `DbArtist` - 19 edges
8. `useTimelineData()` - 18 edges
9. `BackHistoryTracker()` - 18 edges
10. `expo` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Back History System` --references--> `Navigation`  [INFERRED]
  DESIGN.md → frontend/DESIGN.md
- `Bottom Bar` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `Side Drawer` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `Top Bar` --references--> `Navigation`  [EXTRACTED]
  DESIGN.md → frontend/DESIGN.md
- `call()` --calls--> `handler()`  [EXTRACTED]
  backend/lambdas/api/handler.test.ts → backend/lambdas/api/handler.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Artist Navigation and Details** — frontend_design_artistlistview, frontend_design_artistdetailscreen, frontend_design_bottomtray, frontend_design_starbutton [EXTRACTED 1.00]
- **Timeline Rendering Pipeline** — frontend_design_timelineview, frontend_design_timelineprogressivemount, frontend_design_categorylane, frontend_design_artistblock [EXTRACTED 1.00]

## Communities (109 total, 43 thin omitted)

### Community 0 - "BackHistoryTracker.tsx"
Cohesion: 0.06
Nodes (55): getArtists(), AppShell(), ArtistDetailSheet(), LensChip(), scopeStarStatus(), LensPanel(), getStarIconProps(), ArtistDetailContext (+47 more)

### Community 1 - "ConflictDetailSheet.tsx"
Cohesion: 0.16
Nodes (16): ConflictDetailHeader(), HeaderProps, MiniTimeline(), MiniTimelineProps, SNAP_POINTS, IndicatorProps, Props, STAR_CONFIG (+8 more)

### Community 2 - "cacheService.ts"
Cohesion: 0.05
Nodes (65): baPublicApiAdapter, DataAdapter, ValidationResult, bioCache, biosLoading, bioStorageKey(), BioStore, buildCacheData() (+57 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (38): @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, devDependencies, @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, esbuild (+30 more)

### Community 4 - "InterestContext.tsx"
Cohesion: 0.10
Nodes (27): authedFetch(), deleteUserInterest(), fetchUserInterests(), putUserInterest(), ServerInterestStatus, interestStorageKey(), LocalInterest, mergeServerInterests() (+19 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (36): aws-cdk, aws-cdk-lib, constructs, bin, infra, dependencies, aws-cdk-lib, constructs (+28 more)

### Community 6 - "authService.ts"
Cohesion: 0.18
Nodes (20): devError(), devLog(), makeRedirectUri(), nameFromClaims(), parseJwtPayload(), refreshTokens(), signIn(), SocialProvider (+12 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, alwaysStrict, declaration, experimentalDecorators, inlineSourceMap, inlineSources, lib, module (+21 more)

### Community 8 - "expo"
Cohesion: 0.06
Nodes (35): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, intentFilters, package, predictiveBackGestureEnabled (+27 more)

### Community 9 - "scripts"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-react-app, devDependencies, eslint, eslint-config-react-app, @types/react, typescript, typescript (+18 more)

### Community 10 - "sync/handler.ts"
Cohesion: 0.11
Nodes (32): cf, invalidatePaths(), activeSlugs(), ARTISTS_OFFICIAL_TABLES, Config, getConfig(), handler(), maxTime() (+24 more)

### Community 11 - "SocialContext.tsx"
Cohesion: 0.06
Nodes (49): App(), plugins, authedFetch(), buildShareUrl(), createShareLink(), CreateShareResponse, extractShareToken(), fetchSharedSchedule() (+41 more)

### Community 12 - "Bottom Bar"
Cohesion: 0.40
Nodes (6): Artist Block, Bottom Bar, Category Lane, Day Switcher, Timeline Progressive Mount, Timeline View

### Community 13 - "api/handler.ts"
Cohesion: 0.15
Nodes (24): client, deleteItem(), dynamo, getItem(), putItem(), queryAll(), querySyncState(), queryUserInterestsBySlug() (+16 more)

### Community 14 - "tokens.ts"
Cohesion: 0.13
Nodes (15): RowProps, LayoutMode, BOTTOM_OVERLAY_CLEARANCE, ColorToken, COMPACT_DIMENSION_BREAKPOINT, colors, MAX_CONTENT_WIDTH, OVERLAY_PANEL_MARGIN (+7 more)

### Community 15 - "dependencies"
Cohesion: 0.22
Nodes (9): babel-preset-expo, expo-asset, expo-auth-session, expo-splash-screen, dependencies, babel-preset-expo, expo-asset, expo-auth-session (+1 more)

### Community 16 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 17 - "ScreenUIContext.tsx"
Cohesion: 0.14
Nodes (14): BottomBarConfig, defaultState, FeedbackMessage, FeedbackTracker, FeedbackVariant, ScreenUIAction, ScreenUIActionsContext, ScreenUIActionsContextValue (+6 more)

### Community 18 - "frontend/tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, extends, expo/tsconfig.base

### Community 19 - "infra-stack.ts"
Cohesion: 0.12
Nodes (10): app, Api, ApiProps, Auth, Cdn, CdnProps, Lambdas, LambdasProps (+2 more)

### Community 21 - "sync/handler.test.ts"
Cohesion: 0.09
Nodes (18): ARTIST_1, BASE_ENV, CHANGES, EVENT, mockBatchDelete, mockBatchPut, mockFetchArtists, mockFetchChanges (+10 more)

### Community 22 - "sync/db.ts"
Cohesion: 0.25
Nodes (13): batchDelete(), batchPut(), client, closeDbClient(), DocWriteRequest, dynamo, getSyncState(), putSyncState() (+5 more)

### Community 23 - "BaseTimelineScreen.tsx"
Cohesion: 0.18
Nodes (11): getFestivalDayStart(), useTimelineFilter(), useTimelineData(), BaseTimelineScreen(), Props, TopBarRight(), SupportTimelineScreen(), TimelineScreen() (+3 more)

### Community 24 - "DaySwitcher.tsx"
Cohesion: 0.16
Nodes (16): DaySwitcher(), formatDate(), formatWeekday(), getCurrentDayStart(), Props, WEEKDAY_NAMES, CONTENT_MAX_WIDTH, NOW_BUTTON_ARROW_SIZE (+8 more)

### Community 26 - "ArtistListScreen.tsx"
Cohesion: 0.22
Nodes (10): Props, SectionSeparator(), ArtistListFilterContext, ArtistListFilterContextValue, ArtistListFilterProvider(), useArtistListFilter(), ArtistListScreenInner(), ArtistListTopBarRight() (+2 more)

### Community 32 - "conflictUtils.ts"
Cohesion: 0.24
Nodes (10): DbArtistEventMap, ConflictContext, ConflictContextValue, computeConflictEntries(), computeConflictOverlaps(), ConflictEntry, ConflictInputs, eventsOverlap() (+2 more)

### Community 37 - "Frontend Architecture"
Cohesion: 0.10
Nodes (19): Adapter Interface, Background Sync Service, Cache change notification, Cache Layer, Data Hooks, Deferred / known gaps, Error handling, Flow (+11 more)

### Community 39 - "ArtistBlock.tsx"
Cohesion: 0.13
Nodes (18): InterestStatus, ArtistBlock, ArtistBlockBase(), BlockStyle, Props, stripePath(), CategoryLane, NO_EVENTS (+10 more)

### Community 40 - "uiStatePersistence.ts"
Cohesion: 0.17
Nodes (14): hydrateInterests(), dirty, ENTRIES, Entry, flushDirty(), hydrateLocalState(), hydrateUiState(), KEYS (+6 more)

### Community 57 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, lib, module, outDir, resolveJsonModule, rootDir, skipLibCheck (+8 more)

### Community 58 - "timelineLayout.ts"
Cohesion: 0.18
Nodes (12): DAY_BOUNDARY_HOUR, NOW_LINE_ARROW_SIZE, PIXELS_PER_HOUR, RULER_HEIGHT, TIMELINE_PRE_ROLL_MS, VIEW_END_H, VIEW_OFFSET_X, VIEW_START_H (+4 more)

### Community 59 - "Native builds"
Cohesion: 0.12
Nodes (15): Android — EAS-managed keystore, Build profiles (`eas.json`), Credentials, Deep links, Distributing to invited testers (no App Store), First run for iOS (saved working steps), Frontend development, Frontend expo update (+7 more)

### Community 60 - "Brutal Assault — alternative app"
Cohesion: 0.12
Nodes (15): A note on scope and trademarks, API surface, Architecture, Auth, Brutal Assault — alternative app, Connection to the official backend, Current state and what is next, Data model (DynamoDB, 7 tables) (+7 more)

### Community 61 - "cacheStore.ts"
Cohesion: 0.16
Nodes (25): areBiosLoading(), getArtistBio(), getArtistEvents(), getCacheVersion(), getCategories(), getEvents(), getFestivalDays(), getLayoutMap() (+17 more)

### Community 62 - "TimelineView.tsx"
Cohesion: 0.27
Nodes (12): CategoryLaneBase(), defaultScrollX(), labelRepeatPx(), stripHeightFor(), timeToX(), clampToViewWindow(), MountWindow, NO_LANE_EVENTS (+4 more)

### Community 63 - "Festival App UX — Design Decisions"
Cohesion: 0.17
Nodes (11): Artist Detail View, Artist List View, Festival App UX — Design Decisions, Filtering, General Principles, Interest / Star System, Layout, Open Topics for follow-on versions (+3 more)

### Community 64 - "gen-icons.js"
Cohesion: 0.24
Nodes (11): ASSETS, centredOnBlack(), fs, Jimp, luminance(), main(), measureArtwork(), path (+3 more)

### Community 67 - "ArtistDetailScreen.tsx"
Cohesion: 0.23
Nodes (9): FriendPickList(), Exclamation(), ExclamationTouchable(), PropsTouchable, ArtistDetailHeader(), HTML_TAG_STYLES, Props, TEXT_SHRINK_SCALE (+1 more)

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

### Community 73 - "types.ts"
Cohesion: 0.13
Nodes (17): ARTIST, BASE_ENV, call(), event(), mockQueryAll, mockQuerySyncState, DbArtist, DbArtistBio (+9 more)

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
Cohesion: 0.31
Nodes (8): LaneLabelOverlayBase(), DbArtistBioLocalized, DbArtistLocalized, DbCategoryLocalized, DbShareToken, DbStageLocalized, getCategoryLocalized(), pickLanguage()

### Community 79 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 80 - "Artist Detail Screen"
Cohesion: 0.70
Nodes (5): Artist Detail Screen, Artist List View, BottomTray (Collapsed Detail), Interest/Star System, Star Button

### Community 81 - "useArtistDerived.ts"
Cohesion: 0.30
Nodes (12): ArtistRow, Props, ConflictDetailSheet(), getFeedbackLabel(), ConflictProvider(), useConflictDetail(), useInterestCycle(), useStartProgress() (+4 more)

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

### Community 95 - "useTimelineData.ts"
Cohesion: 0.18
Nodes (10): LaneEvent, LaneLabelOverlay, Props, LANE_HEIGHT, STRIP_HEIGHT, Options, TimelineData, DbCategory (+2 more)

### Community 96 - "SettingsScreen.tsx"
Cohesion: 0.39
Nodes (7): getSlugs(), useAuth(), useBottomBar(), useScreenUIActions(), useTopBar(), AccountSection(), SettingsScreen()

### Community 103 - "AppNavigator.tsx"
Cohesion: 0.24
Nodes (8): NAV_ITEMS, NavItem, SideDrawerContent(), useConflicts(), AppNavigator(), Drawer, DrawerParamList, ArtistListScreen()

### Community 104 - "ConflictDetailContext.tsx"
Cohesion: 0.40
Nodes (4): ConflictDetailContext, ConflictDetailContextValue, ConflictDetailProvider(), ConflictDetailState

### Community 105 - "colors"
Cohesion: 0.21
Nodes (13): SharedInterestStatus, FriendAvatar(), initialsOf(), Props, FriendFacepile(), Props, LoadingScreen(), Props (+5 more)

### Community 106 - "useLayoutMode"
Cohesion: 0.24
Nodes (10): BottomBar(), DrawerButton(), FeedbackToast(), LOGO_WIDTH, TopBar(), useScreenUI(), useScreenUIState(), useLayoutMode() (+2 more)

## Knowledge Gaps
- **507 isolated node(s):** `config`, `shelfJestDynamodb`, `config`, `client`, `dynamo` (+502 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `plugins` connect `SocialContext.tsx` to `expo`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `expo` connect `expo` to `SocialContext.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `config`, `shelfJestDynamodb`, `config` to the rest of the system?**
  _507 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BackHistoryTracker.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06265984654731457 - nodes in this community are weakly interconnected._
- **Should `cacheService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05009009009009009 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `InterestContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._