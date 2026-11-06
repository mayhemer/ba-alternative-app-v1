# Festival App UX — Design Decisions

## General Principles

- Mobile-first, small screen, but web-ready as well. Thumb-friendly. Designed for festival conditions: sun, crowds, imprecision, altered states.
- Dark aesthetic. Restrained, elegant, functional. Aligned with Brutal Assault's industrial/military visual identity.
- Async actions always show progress indicator resolving to a tick. Never silent uncertainty.
- No onboarding. The UI teaches through use.
- **Clash stripes rise ("/"), everywhere:** the timeline's conflict bars, My plan's clash bar and
  day-button strip, the lock-screen card's live bar and Android's next-row edge. 45°, 2 pt bands
  and gaps alike. Only My plan's past rows fall ("\"), so they never read as a clash. In the app
  they come from `src/ui/stripes.ts`; native code draws the same (iOS `ClashStripes`, Android
  `nc_clash_stripes`), and so do mockups (in CSS a rising stripe is `repeating-linear-gradient(-45deg, …)`;
  `45deg` falls).

---

## Tech Stack

- React Native + TailwindCSS, Expo, single codebase for iOS, Android, Web
- React Navigation for screen and drawer navigation.
- Zustand or React Context for feeding TopBar/BottomBar with screen-specific and state-specific controls.
- React Native Reanimated + react-native-bottom-sheet for BottomTray spring animation and gesture handling.
- ArtistDetailScreen must be rendered as a modal-style overlay above the navigator stack (not a regular screen), as it overlays the TopBar when fully expanded.
