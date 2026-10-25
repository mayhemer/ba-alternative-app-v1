# Festival App UX — Design Decisions

## General Principles

- Mobile-first, small screen, but web-ready as well. Thumb-friendly. Designed for festival conditions: sun, crowds, imprecision, altered states.
- Dark aesthetic. Restrained, elegant, functional. Aligned with Brutal Assault's industrial/military visual identity.
- Async actions always show progress indicator resolving to a tick. Never silent uncertainty.
- No onboarding. The UI teaches through use.

---

## Tech Stack

- React Native + TailwindCSS, Expo, single codebase for iOS, Android, Web
- React Navigation for screen and drawer navigation.
- Zustand or React Context for feeding TopBar/BottomBar with screen-specific and state-specific controls.
- React Native Reanimated + react-native-bottom-sheet for BottomTray spring animation and gesture handling.
- ArtistDetailScreen must be rendered as a modal-style overlay above the navigator stack (not a regular screen), as it overlays the TopBar when fully expanded.
