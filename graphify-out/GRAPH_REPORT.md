# Graph Report - frontend  (2026-08-14)

## Corpus Check
- 114 files · ~71,317 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 734 nodes · 1724 edges · 69 communities (25 shown, 44 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Cache & Timeline
- Layout & Navigation
- Artist Data Flow
- Share API
- Data Adapters
- Social Features
- App Config
- User Auth API
- Icon Assets
- Dev Tools
- Music Integrations
- State Management
- Utilities
- UI Components
- Module 14
- Module 15
- Module 16
- Module 17
- Module 18
- Module 19
- Module 20
- Module 21
- Module 22
- Module 23
- Module 24
- Module 25
- Module 26
- Module 27
- Module 28
- Module 29
- Module 30
- Module 31
- Module 32
- Module 33
- Module 34
- Module 35
- Module 36
- Module 37
- Module 38
- Module 39
- Module 40
- Module 41
- Module 42
- Module 43
- Module 44
- Module 45
- Module 46
- Module 47
- Module 48
- Module 49
- Module 50
- Module 51
- Module 52
- Module 53
- Module 54
- Module 55
- Module 56
- Module 57
- Module 59
- Module 60
- Module 61
- Module 62
- Module 63
- Module 64
- Module 65
- Module 66

## God Nodes (most connected - your core abstractions)
1. `useLayoutMode()` - 27 edges
2. `colors` - 24 edges
3. `Text()` - 20 edges
4. `useSelectedSlug()` - 20 edges
5. `BackHistoryTracker()` - 18 edges
6. `useTimelineData()` - 17 edges
7. `DbArtist` - 17 edges
8. `expo` - 16 edges
9. `BaseTimelineScreen()` - 16 edges
10. `useInterest()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Frontend Architecture` --references--> `Festival App UX Design Decisions`  [EXTRACTED]
  ARCHITECTURE.md → DESIGN.md
- `Tech Stack` --references--> `Tech Stack (Design)`  [EXTRACTED]
  ARCHITECTURE.md → DESIGN.md
- `Adaptive Icon Monochrome Variant` --semantically_similar_to--> `Adaptive Icon - BA Logo`  [INFERRED] [semantically similar]
  assets/adaptive-icon-monochrome.png → assets/adaptive-icon.png
- `Adaptive Icon - BA Logo` --semantically_similar_to--> `Custom App Icon - BA Logo`  [INFERRED] [semantically similar]
  assets/adaptive-icon.png → assets/custom-app-icon.png
- `Adaptive Icon - BA Logo` --semantically_similar_to--> `App Icon - BA Logo`  [INFERRED] [semantically similar]
  assets/adaptive-icon.png → assets/icon.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **UI Cache Refresh Flow** — frontend_architecture_cacheservice, frontend_architecture_backgroundsyncservice, frontend_architecture_appstate, frontend_architecture_uirefreshpattern [EXTRACTED 1.00]
- **Timeline Rendering Pipeline** — frontend_design_timelineview, frontend_design_timelineprogressivemount, frontend_design_categorylane, frontend_design_artistblock [EXTRACTED 1.00]
- **Artist Navigation and Details** — frontend_design_artistlistview, frontend_design_artistdetailscreen, frontend_design_bottomtray, frontend_design_starbutton [EXTRACTED 1.00]
- **Brutal Assault App Icon Set** — frontend_assets_adaptive_icon_monochrome, frontend_assets_adaptive_icon, frontend_assets_custom_app_icon [EXTRACTED 0.95]
- **Metal Archives Integration Icon Variants** — frontend_assets_metal_archives_icon_72, frontend_assets_metal_archives_icon, frontend_assets_metal_archives_icon_svg [EXTRACTED 0.95]
- **Streaming Service Icons** — frontend_assets_spotify_icon_72, frontend_assets_spotify_icon, frontend_assets_tidal_icon_72, frontend_assets_tidal_icon [EXTRACTED 0.90]

## Communities (69 total, 44 thin omitted)

### Community 0 - "Cache & Timeline"
Cohesion: 0.05
Nodes (82): getCategories(), getCategoryDayLayout(), getEvents(), getFestivalDays(), ArtistBlock, ArtistBlockBase(), BlockStyle, Props (+74 more)

### Community 1 - "Layout & Navigation"
Cohesion: 0.05
Nodes (53): BottomBar(), DrawerButton(), FeedbackToast(), LOGO_WIDTH, TopBar(), Props, SectionSeparator(), FriendAvatar() (+45 more)

### Community 2 - "Artist Data Flow"
Cohesion: 0.07
Nodes (50): getArtistEvents(), getArtists(), getStages(), ArtistRow, Props, ArtistDetailSheet(), ConflictDetailHeader(), ConflictDetailSheet() (+42 more)

### Community 3 - "Share API"
Cohesion: 0.07
Nodes (44): authedFetch(), buildShareUrl(), createShareLink(), CreateShareResponse, extractShareToken(), fetchSharedSchedule(), LINK_PREFIXES, revokeShareLink() (+36 more)

### Community 4 - "Data Adapters"
Cohesion: 0.07
Nodes (41): baPublicApiAdapter, DataAdapter, ValidationResult, buildCacheData(), buildLayoutMap(), CacheData, createDataCollector(), DataCollector (+33 more)

### Community 5 - "Social Features"
Cohesion: 0.10
Nodes (40): LensChip(), scopeStarStatus(), LensPanel(), getStarIconProps(), useArtistListFilter(), LensContext, LensContextValue, LensPanelContext (+32 more)

### Community 6 - "App Config"
Cohesion: 0.10
Nodes (30): App(), plugins, expo-apple-authentication, expo-asset, expo-font, expo-secure-store, expo-web-browser, devError() (+22 more)

### Community 7 - "User Auth API"
Cohesion: 0.08
Nodes (34): authedFetch(), deleteUserInterest(), fetchUserInterests(), putUserInterest(), ServerInterestStatus, InterestStatus, interestStorageKey(), LocalInterest (+26 more)

### Community 8 - "Icon Assets"
Cohesion: 0.06
Nodes (35): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, intentFilters, package, predictiveBackGestureEnabled (+27 more)

### Community 9 - "Dev Tools"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-react-app, devDependencies, eslint, eslint-config-react-app, @types/react, typescript, main (+18 more)

### Community 10 - "Music Integrations"
Cohesion: 0.11
Nodes (17): NAV_ITEMS, NavItem, SideDrawerContent(), DaySwitcher(), formatDate(), formatWeekday(), getCurrentDayStart(), Props (+9 more)

### Community 11 - "State Management"
Cohesion: 0.13
Nodes (19): hydrateInterests(), ScrollToTimeSignal, TimelineFilterContext, TimelineFilterContextValue, TimelineFilterProvider(), dirty, ENTRIES, Entry (+11 more)

### Community 12 - "Utilities"
Cohesion: 0.16
Nodes (18): AppShell Component, Artist Block, Artist Detail Screen, Artist List View, Back History System, Bottom Bar, BottomTray (Collapsed Detail), Category Lane (+10 more)

### Community 13 - "UI Components"
Cohesion: 0.22
Nodes (11): useExclusiveOverlay(), DrawerParamList, dispatch(), DRAWER_ID, DrawerAction, openDrawer(), navigationRef, ExclusiveOverlay (+3 more)

### Community 14 - "Module 14"
Cohesion: 0.24
Nodes (11): ASSETS, centredOnBlack(), fs, Jimp, luminance(), main(), measureArtwork(), path (+3 more)

### Community 15 - "Module 15"
Cohesion: 0.22
Nodes (9): babel-preset-expo, expo-auth-session, expo-crypto, @gorhom/bottom-sheet, dependencies, babel-preset-expo, expo-auth-session, expo-crypto (+1 more)

### Community 16 - "Module 16"
Cohesion: 0.60
Nodes (5): AppState and React Context, Background Sync Service, Cache Service, Data Hooks Convention, UI Refresh Pattern

### Community 17 - "Module 17"
Cohesion: 0.50
Nodes (5): Adaptive Icon - BA Logo, Adaptive Icon Monochrome Variant, Custom App Icon - BA Logo, Favicon - BA Logo Small, App Icon - BA Logo

### Community 18 - "Module 18"
Cohesion: 0.40
Nodes (4): expo/tsconfig.base, compilerOptions, strict, extends

### Community 19 - "Module 19"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 21 - "Module 21"
Cohesion: 0.67
Nodes (3): baPublicApiAdapter, DataAdapter Interface, DataCollector Interface

### Community 22 - "Module 22"
Cohesion: 0.67
Nodes (3): Metal Archives Icon, Metal Archives Icon 72x72, Metal Archives Icon SVG

## Knowledge Gaps
- **254 isolated node(s):** `extends`, `react-app`, `name`, `slug`, `scheme` (+249 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `plugins` connect `App Config` to `Icon Assets`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `expo` connect `Icon Assets` to `App Config`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `extends`, `react-app`, `name` to the rest of the system?**
  _254 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cache & Timeline` be split into smaller, more focused modules?**
  _Cohesion score 0.05047250859106529 - nodes in this community are weakly interconnected._
- **Should `Layout & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.05189189189189189 - nodes in this community are weakly interconnected._
- **Should `Artist Data Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.07341269841269842 - nodes in this community are weakly interconnected._
- **Should `Share API` be split into smaller, more focused modules?**
  _Cohesion score 0.0746606334841629 - nodes in this community are weakly interconnected._