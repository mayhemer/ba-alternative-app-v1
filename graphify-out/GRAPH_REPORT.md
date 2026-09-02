# Graph Report - app  (2026-09-02)

## Corpus Check
- 151 files · ~416,633 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1146 nodes · 2244 edges · 102 communities (59 shown, 43 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf5e621a`
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
- normalize.ts
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
- handler.test.ts
- sync/handler.ts
- @babel/core
- LensChip.tsx
- expo-apple-authentication
- colors
- expo-dev-client
- expo-font
- expo-image
- expo-linear-gradient
- expo-secure-store
- ArtistBlock.tsx
- expo-status-bar
- expo-system-ui
- @expo/vector-icons
- expo-web-browser
- Frontend Architecture
- Tech Stack (Design)
- timelineLayout.ts
- BaseTimelineScreen.tsx
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
- useShareLinkHandler.ts
- Native builds
- Brutal Assault — alternative app
- uiStatePersistence.ts
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
- Navigation
- LaneLabelOverlay.tsx
- graphify reference: query, path, explain
- Artist Detail Screen
- types
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
- expo-auth-session
- expo-crypto
- @gorhom/bottom-sheet
- tailwindcss

## God Nodes (most connected - your core abstractions)
1. `useLayoutMode()` - 27 edges
2. `colors` - 24 edges
3. `compilerOptions` - 22 edges
4. `Text()` - 20 edges
5. `useSelectedSlug()` - 20 edges
6. `BackHistoryTracker()` - 18 edges
7. `useTimelineData()` - 17 edges
8. `DbArtist` - 17 edges
9. `handler()` - 16 edges
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
- `syncSlug()` --calls--> `invalidatePaths()`  [EXTRACTED]
  backend/lambdas/sync/handler.ts → backend/lambdas/sync/cloudfront.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Artist Navigation and Details** — frontend_design_artistlistview, frontend_design_artistdetailscreen, frontend_design_bottomtray, frontend_design_starbutton [EXTRACTED 1.00]
- **Timeline Rendering Pipeline** — frontend_design_timelineview, frontend_design_timelineprogressivemount, frontend_design_categorylane, frontend_design_artistblock [EXTRACTED 1.00]

## Communities (102 total, 43 thin omitted)

### Community 0 - "BackHistoryTracker.tsx"
Cohesion: 0.06
Nodes (44): SideDrawerContent(), DaySwitcher(), formatDate(), formatWeekday(), getCurrentDayStart(), Props, WEEKDAY_NAMES, CONTENT_MAX_WIDTH (+36 more)

### Community 1 - "ConflictDetailSheet.tsx"
Cohesion: 0.05
Nodes (80): App(), getArtistEvents(), getArtists(), getCategories(), getCategoryDayLayout(), getEvents(), getStages(), AppShell() (+72 more)

### Community 2 - "cacheService.ts"
Cohesion: 0.06
Nodes (45): baPublicApiAdapter, DataAdapter, ValidationResult, buildCacheData(), buildLayoutMap(), CacheData, createDataCollector(), DataCollector (+37 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (40): @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda, @aws-sdk/lib-dynamodb, devDependencies, @aws-sdk/client-cloudfront, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda (+32 more)

### Community 4 - "InterestContext.tsx"
Cohesion: 0.08
Nodes (40): authedFetch(), deleteUserInterest(), fetchUserInterests(), putUserInterest(), ServerInterestStatus, hydrateInterests(), InterestStatus, interestStorageKey() (+32 more)

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
Cohesion: 0.05
Nodes (41): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, intentFilters, package, predictiveBackGestureEnabled (+33 more)

### Community 9 - "scripts"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-react-app, devDependencies, eslint, eslint-config-react-app, @types/react, typescript, typescript (+18 more)

### Community 10 - "normalize.ts"
Cohesion: 0.13
Nodes (25): maxTime(), syncSlug(), extractUniqueStages(), normalizeArtist(), normalizeCategory(), normalizeEvent(), normalizeStage(), a2024 (+17 more)

### Community 11 - "SocialContext.tsx"
Cohesion: 0.16
Nodes (22): authedFetch(), buildShareUrl(), createShareLink(), CreateShareResponse, fetchSharedSchedule(), LINK_PREFIXES, revokeShareLink(), SHARE_LINK_ORIGIN (+14 more)

### Community 12 - "Bottom Bar"
Cohesion: 0.40
Nodes (6): Artist Block, Bottom Bar, Category Lane, Day Switcher, Timeline Progressive Mount, Timeline View

### Community 13 - "api/handler.ts"
Cohesion: 0.14
Nodes (24): client, deleteItem(), dynamo, getItem(), putItem(), queryAll(), querySyncState(), queryUserInterestsBySlug() (+16 more)

### Community 14 - "tokens.ts"
Cohesion: 0.15
Nodes (11): RowProps, ColorToken, colors, OVERLAY_PANEL_MARGIN, OVERLAY_PANEL_MAX_WIDTH, OVERLAY_PANEL_RADIUS, TEXT_SHRINK_SCALE, copyToClipboard() (+3 more)

### Community 15 - "dependencies"
Cohesion: 0.22
Nodes (9): babel-preset-expo, expo, expo-asset, expo-splash-screen, dependencies, babel-preset-expo, expo, expo-asset (+1 more)

### Community 16 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 17 - "ScreenUIContext.tsx"
Cohesion: 0.09
Nodes (27): getSlugs(), FeedbackToast(), LOGO_WIDTH, TopBar(), useAuth(), BottomBarConfig, defaultState, FeedbackMessage (+19 more)

### Community 18 - "frontend/tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, extends, expo/tsconfig.base

### Community 19 - "infra-stack.ts"
Cohesion: 0.12
Nodes (10): app, Api, ApiProps, Auth, Cdn, CdnProps, Lambdas, LambdasProps (+2 more)

### Community 21 - "handler.test.ts"
Cohesion: 0.10
Nodes (16): cf, invalidatePaths(), ARTIST_1, BASE_ENV, CHANGES, EVENT, mockBatchDelete, mockBatchPut (+8 more)

### Community 22 - "sync/handler.ts"
Cohesion: 0.19
Nodes (18): batchDelete(), batchPut(), client, closeDbClient(), DocWriteRequest, dynamo, getSyncState(), putSyncState() (+10 more)

### Community 24 - "LensChip.tsx"
Cohesion: 0.17
Nodes (18): SharedInterestStatus, LensChip(), scopeStarStatus(), LensPanel(), getStarIconProps(), LensContext, LensContextValue, LensPanelContext (+10 more)

### Community 26 - "colors"
Cohesion: 0.15
Nodes (17): NAV_ITEMS, NavItem, Props, SectionSeparator(), FriendAvatar(), initialsOf(), Props, FriendFacepile() (+9 more)

### Community 32 - "ArtistBlock.tsx"
Cohesion: 0.16
Nodes (16): ArtistBlock, BlockStyle, Props, CategoryLane, CategoryLaneBase(), LaneEvent, NO_EVENTS, Props (+8 more)

### Community 37 - "Frontend Architecture"
Cohesion: 0.11
Nodes (17): Adapter Interface, Background Sync Service, Cache Layer, Data Hooks (convention), Error handling, Flow, Folder Structure, Frontend Architecture (+9 more)

### Community 39 - "timelineLayout.ts"
Cohesion: 0.16
Nodes (14): NowLine, Props, CANVAS_WIDTH, DAY_BOUNDARY_HOUR, NOW_LINE_ARROW_SIZE, PIXELS_PER_HOUR, RULER_HEIGHT, TIMELINE_PRE_ROLL_MS (+6 more)

### Community 40 - "BaseTimelineScreen.tsx"
Cohesion: 0.19
Nodes (15): getFestivalDays(), getFestivalDayStart(), ScrollToTimeSignal, TimelineFilterContext, TimelineFilterContextValue, TimelineFilterProvider(), BaseTimelineScreen(), Props (+7 more)

### Community 57 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, lib, module, outDir, resolveJsonModule, rootDir, skipLibCheck (+8 more)

### Community 58 - "useShareLinkHandler.ts"
Cohesion: 0.36
Nodes (7): extractShareToken(), SHARE_LINK_PATH, FriendSchedule, useFeedback(), useSocialActions(), useOpenSharedSchedule(), useShareLinkHandler()

### Community 59 - "Native builds"
Cohesion: 0.12
Nodes (15): Android — EAS-managed keystore, Build profiles (`eas.json`), Credentials, Deep links, Distributing to invited testers (no App Store), First run for iOS (saved working steps), Frontend development, Frontend expo update (+7 more)

### Community 60 - "Brutal Assault — alternative app"
Cohesion: 0.12
Nodes (15): A note on scope and trademarks, API surface, Architecture, Auth, Brutal Assault — alternative app, Connection to the official backend, Current state and what is next, Data model (DynamoDB, 7 tables) (+7 more)

### Community 61 - "uiStatePersistence.ts"
Cohesion: 0.18
Nodes (13): dirty, ENTRIES, Entry, flushDirty(), hydrateUiState(), KEYS, scheduleWrite(), ScrollPositions (+5 more)

### Community 62 - "TimelineView.tsx"
Cohesion: 0.23
Nodes (12): ArtistBlockBase(), stripePath(), defaultScrollX(), labelRepeatPx(), timeToX(), clampToViewWindow(), MountWindow, NO_LANE_EVENTS (+4 more)

### Community 63 - "Festival App UX — Design Decisions"
Cohesion: 0.17
Nodes (11): Artist Detail View, Artist List View, Festival App UX — Design Decisions, Filtering, General Principles, Interest / Star System, Layout, Open Topics for follow-on versions (+3 more)

### Community 64 - "gen-icons.js"
Cohesion: 0.24
Nodes (11): ASSETS, centredOnBlack(), fs, Jimp, luminance(), main(), measureArtwork(), path (+3 more)

### Community 67 - "ArtistDetailScreen.tsx"
Cohesion: 0.25
Nodes (8): FriendPickList(), Exclamation(), ExclamationTouchable(), PropsTouchable, ArtistDetailHeader(), HTML_TAG_STYLES, Props, fitFontSize()

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
Cohesion: 0.25
Nodes (7): DbArtist, DbArtistLocalized, DbCategory, DbCategoryLocalized, DbShareToken, DbStage, DbStageLocalized

### Community 74 - "Coding guidelines"
Cohesion: 0.25
Nodes (7): Coding guidelines, DynamoDB tables — keeping infra and tests in sync, Frontend constrains, graphify, Major, Minor, Project description

### Community 75 - "Timeline View"
Cohesion: 0.25
Nodes (8): Block Visual States, Bottom Bar, Conflict Detection, Layout, Now Line, Progressive mount, Timeline View, Top Bar Controls

### Community 77 - "Navigation"
Cohesion: 0.29
Nodes (7): Back history, Back History System, Bottom Bar, Navigation, Side Drawer, Side Drawer, Top Bar

### Community 78 - "LaneLabelOverlay.tsx"
Cohesion: 0.33
Nodes (6): LaneLabelOverlay, LaneLabelOverlayBase(), Props, LANE_HEIGHT, STRIP_HEIGHT, getCategoryLocalized()

### Community 79 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 80 - "Artist Detail Screen"
Cohesion: 0.70
Nodes (5): Artist Detail Screen, Artist List View, BottomTray (Collapsed Detail), Interest/Star System, Star Button

### Community 81 - "types"
Cohesion: 0.50
Nodes (4): types, jest, node, aws-lambda

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

## Knowledge Gaps
- **489 isolated node(s):** `config`, `shelfJestDynamodb`, `config`, `client`, `dynamo` (+484 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-font` connect `expo` to `ConflictDetailSheet.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `config`, `shelfJestDynamodb`, `config` to the rest of the system?**
  _489 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BackHistoryTracker.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06352087114337568 - nodes in this community are weakly interconnected._
- **Should `ConflictDetailSheet.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05153099327856609 - nodes in this community are weakly interconnected._
- **Should `cacheService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06397306397306397 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `InterestContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._