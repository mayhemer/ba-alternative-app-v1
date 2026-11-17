import { appLanguage, type Language } from './language';

// ── Every string the app shows ────────────────────────────────────────────────
//
// One file for translators: English first, then Czech, each grouped by the
// component that shows the string. A word several components show with one
// meaning (a screen's name, a set's status, "conflict") has a group of its own
// and is defined once. Czech must have every key English has; the type checker
// and strings.test.ts both say which one is missing.
//
// Not here: what the API sends in each language (artist genre and country,
// stage and category names, bios; utils/localization.ts picks those), and the
// Android now card's screen-reader label for its clash icon, an Android
// resource (modules/now-card/android/src/main/res/values*/strings.xml).
//
// Read with strings() at call time — in a render, a model function or a
// handler — never into a module-level constant (see i18n/language.ts).
//
// Czech copy runs longer: layouts truncate names and never wrap statuses.

const en = {
  app: {
    /** The now pill's spoken label while nothing is on. */
    name: 'Brutal Assault',
  },

  /** Each screen's name: the drawer, the screen's top bar, search sections. */
  screens: {
    myPlan: 'My plan',
    artists: 'Artists',
    program: 'Program',
    supportProgram: 'Support Program',
    settings: 'Settings',
  },

  weekdays: {
    /** Indexed by Date.getUTCDay(): Sunday first. */
    short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    /** A festival day: "Wed 6". */
    dayLabel: (weekday: string, dayOfMonth: number): string => `${weekday} ${dayOfMonth}`,
  },

  /** A set's state on My plan, the now pill and the lock-screen now card. */
  setStatus: {
    live: 'LIVE',
    done: 'done',
    start: 'START',
  },

  /** A clash, wherever it shows: the conflict sheet, the drawer's count, My plan's rows. */
  conflict: {
    conflict: 'Conflict',
    conflictsLabel: (count: number): string => `${count} ${count === 1 ? 'conflict' : 'conflicts'}`,
  },

  /**
   * A pick's name: the star selector, the feedback after a star press. In the
   * user's own words, first person; the internal names (Must-see, Maybe, don't
   * go) never reach the user. At most about 18 characters: the selector's name
   * box is 182 pt at 13 pt bold, with the tick.
   */
  interest: {
    none: 'Not marked',
    maybe: 'Maybe I\'ll go',
    will_go: 'I must see this!',
    dont_go: 'I\'ll skip this',
  },

  starButton: {
    accessibilityLabel: 'Toggle interest',
  },

  starSelector: {
    accessibilityLabel: 'Interest',
    notSaved: '⚠ not saved',
  },

  drawerButton: {
    open: 'Open menu',
    close: 'Close menu',
  },

  splashScreen: {
    loading: 'Loading brutal data',
    retry: 'Retry',
  },

  artistListScreen: {
    loading: 'Loading artists…',
    empty: 'No artists found',
  },

  timelineScreen: {
    loading: 'Loading schedule…',
  },

  /** The order panel, opened by a long press on a timeline (screens/timeline/order). */
  laneOrder: {
    /** The Program's lanes are stages. */
    stageTitle: 'Stage order',
    /** The Support Program's lanes are categories. */
    categoryTitle: 'Category order',
    /** The order holds on every festival day. */
    everyDay: 'Every day',
    close: 'Close',
    /** A row's drag handle, spoken. */
    move: (name: string): string => `Move ${name}`,
    moveUp: 'Move up',
    moveDown: 'Move down',
  },

  myPlanScreen: {
    empty: 'Nothing planned for this day',
    emptyConflicts: 'No conflicts on this day',
    /**
     * An empty day under a filter of picks: a title, the intro on a line of
     * its own, then one sentence read in order: pickArtists (the link to the
     * artist list), pickArtistsRest,
     * changeFilter (the link to the filter panel, followed by the filter
     * button's glyph, which ends the sentence: a full stop after it floats).
     */
    nothingPicked: {
      title: 'Nothing picked for this day',
      intro: 'The filter shows only your picks.',
      pickArtists: 'Pick artists',
      pickArtistsRest: ', or ',
      changeFilter: 'change the filter',
    },
  },

  planFilter: {
    /** The top-bar chip that opens the panel. */
    chip: 'Filters',
    /** The panel's heading over the filters. */
    heading: 'Filter',
    close: 'Close',
    all: 'All sets',
    maybe: 'All my picks',
    must: 'Only what I must see',
    conflicts: 'Only conflicts',
  },

  /** The lock-screen now card (iOS Live Activity, Android notification). */
  nowCard: {
    /** Its name: the Android notification channel, the Settings switch. */
    name: 'Lock-screen now card',
    /** iOS: the heading over the next Must-see in a break. */
    next: 'NEXT UP',
    /** Android: before the next Must-see's name in a break, "NEXT:". */
    nextShort: 'NEXT',
    /** iOS: the day's last Must-see is over. */
    over: 'Today\'s plan is over',
  },

  artistDetail: {
    bioOffline: 'Biography unavailable offline.',
  },

  // My private note on the artist sheet (features/notes/ArtistNote).
  artistNote: {
    add: 'Add a note',
    editTitle: 'Edit my note',
    done: 'Done',
    counter: (length: number, max: number): string => `${length} / ${max}`,
  },

  artistSetRow: {
    overlaps: (count: number): string => `Overlaps with ${count} other event(s)`,
  },

  conflictDetailSheet: {
    close: 'Close conflict',
  },

  search: {
    entry: 'Search',
    placeholder: 'Search',
    close: 'Close search',
    /** The field's ✕ while it holds text: it clears the text only. */
    clear: 'Clear search',
    /** The artist list's own section. */
    bands: 'Bands',
    inProgram: 'In the Program',
    inSupportProgram: 'In the Support Program',
    opensThere: 'opens there',
    opensDetails: 'opens details',
    nothingFound: (query: string): string => `Nothing found for “${query}”`,
    more: (count: number): string => `${count} more. Type more to narrow it down.`,
    /** A result the lens hides; `everything` is the lens panel's own word. */
    tagLens: (everything: string): string => `Lens → ${everything}`,
    tagLane: 'Shows its lane',
    /** A result My plan's filter hides; `filterName` is the filter's own label. */
    tagFilter: (filterName: string): string => `Filter → ${filterName}`,
  },

  lensChip: {
    accessibilityLabel: 'View and share schedules',
  },

  lensPanel: {
    show: 'Show',
    everything: 'Everything',
    myPicks: 'My picks',
  },

  lensScopeRow: {
    cancel: 'Cancel',
    remove: 'Remove',
    removeFriend: (name: string): string => `Remove ${name}`,
  },

  friendPickList: {
    pickedByOne: (name: string): string => `${name} picked this`,
    pickedByMany: (count: number): string => `${count} friends picked this`,
  },

  myScheduleShare: {
    heading: 'My schedule',
    /** "Sign in" is the link, `signInRest` the text after it. */
    signIn: 'Sign in',
    signInRest: ' to share your schedule.',
    /** The share action fails this way while signed out. */
    signInRequired: 'Sign in to share your schedule',
    share: 'Share my schedule',
    shareAgain: 'Share again',
    copyLink: 'Copy link',
    revoke: 'Revoke',
    /** Sent with the link by the system share sheet. */
    shareMessage: 'Check out my festival schedule',
    linkCopied: 'Link copied',
    copyFailed: 'Could not copy the link',
    createFailed: 'Could not create link',
    revoked: 'Share link revoked',
  },

  /** Opening a friend's share link. */
  shareLinkHandler: {
    viewing: (name: string): string => `Viewing ${name}'s schedule`,
    openFailed: 'Could not open that link',
  },

  settingsScreen: {
    account: 'Account',
    signOut: 'Sign Out',
    signingIn: 'Signing in…',
    signInWithGoogle: 'Sign in with Google',
    signInWithApple: 'Sign in with Apple',
    signInFailed: 'Sign-in failed. Please try again.',
    lockScreen: 'Lock screen',
    nowCardTitle: 'Now card',
    nowCardHint: 'What is live and next, on the lock screen',
    notificationsOff: 'Notifications are off for this app in the system settings.',
    festivalEdition: 'Festival Edition',
    chooseEdition: 'Choose an edition',
    editionAccessibilityLabel: (edition: string): string => `Festival edition, ${edition}`,
    language: 'Language',
    languageSystem: 'System default',
    languageAccessibilityLabel: (language: string): string => `Language, ${language}`,
  },
};

export type Strings = typeof en;

/** Czech plural form: 1 → one, 2–4 → few, the rest (0 and 5+) → many. */
function czechPlural(count: number, one: string, few: string, many: string): string {
  if (count === 1) { return one; }
  if (count >= 2 && count <= 4) { return few; }
  return many;
}

const cs: Strings = {
  app: {
    name: 'Brutal Assault',
  },

  screens: {
    myPlan: 'Můj plán',
    artists: 'Kapely',
    program: 'Program',
    supportProgram: 'Doprovodný program',
    settings: 'Nastavení',
  },

  weekdays: {
    short: ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'],
    dayLabel: (weekday, dayOfMonth) => `${weekday} ${dayOfMonth}.`,
  },

  setStatus: {
    live: 'HRAJE',
    done: 'odehráno',
    start: 'ZAČNE',
  },

  conflict: {
    conflict: 'Konflikt',
    conflictsLabel: (count) => `${count} ${czechPlural(count, 'konflikt', 'konflikty', 'konfliktů')}`,
  },

  interest: {
    none: 'Neoznačeno',
    maybe: 'Možná se podívám',
    will_go: 'Tohle chci vidět!',
    dont_go: 'Tohle vynechám',
  },

  starButton: {
    accessibilityLabel: 'Změnit zájem',
  },

  starSelector: {
    accessibilityLabel: 'Zájem',
    notSaved: '⚠ neuloženo',
  },

  drawerButton: {
    open: 'Otevřít menu',
    close: 'Zavřít menu',
  },

  splashScreen: {
    loading: 'Načítám brutální data',
    retry: 'Zkusit znovu',
  },

  artistListScreen: {
    loading: 'Načítám kapely…',
    empty: 'Žádné kapely nenalezeny',
  },

  timelineScreen: {
    loading: 'Načítám program…',
  },

  laneOrder: {
    stageTitle: 'Pořadí pódií',
    categoryTitle: 'Pořadí kategorií',
    everyDay: 'Všechny dny',
    close: 'Zavřít',
    move: (name: string): string => `Přesunout ${name}`,
    moveUp: 'Posunout nahoru',
    moveDown: 'Posunout dolů',
  },

  myPlanScreen: {
    empty: 'Na tento den nic v plánu',
    emptyConflicts: 'V tento den žádné konflikty',
    nothingPicked: {
      title: 'Na tento den nemáte nic vybráno',
      intro: 'Filtr ukazuje jen váš výběr.',
      pickArtists: 'Vyberte kapely',
      pickArtistsRest: ', nebo ',
      changeFilter: 'změňte filtr',
    },
  },

  planFilter: {
    chip: 'Filtry',
    heading: 'Filtr',
    close: 'Zavřít',
    all: 'Všechna vystoupení',
    maybe: 'Vše vybrané',
    must: 'Jen co musím vidět',
    conflicts: 'Jen konflikty',
  },

  nowCard: {
    name: 'Karta na zamykací obrazovce',
    next: 'NÁSLEDUJE',
    nextShort: 'DALŠÍ',
    over: 'Dnešní plán skončil',
  },

  artistDetail: {
    bioOffline: 'Bez připojení není životopis k dispozici.',
  },

  artistNote: {
    add: 'Přidat poznámku',
    editTitle: 'Upravit poznámku',
    done: 'Hotovo',
    counter: (length, max) => `${length} / ${max}`,
  },

  artistSetRow: {
    overlaps: (count) => (count === 1
      ? 'Překrývá se s jiným vystoupením'
      : `Překrývá se s jinými vystoupeními (${count})`),
  },

  conflictDetailSheet: {
    close: 'Zavřít konflikt',
  },

  search: {
    entry: 'Hledat',
    placeholder: 'Hledat',
    close: 'Zavřít hledání',
    clear: 'Vymazat hledání',
    bands: 'Kapely',
    inProgram: 'V programu',
    inSupportProgram: 'V doprovodném programu',
    opensThere: 'otevře se tam',
    opensDetails: 'otevře detail',
    nothingFound: (query) => `Pro „${query}“ nic nenalezeno`,
    more: (count) => `${count} ${czechPlural(count, 'další', 'další', 'dalších')}. Upřesněte hledání.`,
    tagLens: (everything) => `Pohled → ${everything}`,
    tagLane: 'Ukáže svůj pruh',
    tagFilter: (filterName) => `Filtr → ${filterName}`,
  },

  lensChip: {
    accessibilityLabel: 'Zobrazit a sdílet plány',
  },

  lensPanel: {
    show: 'Zobrazit',
    everything: 'Vše',
    myPicks: 'Můj výběr',
  },

  lensScopeRow: {
    cancel: 'Zrušit',
    remove: 'Odebrat',
    removeFriend: (name) => `Odebrat: ${name}`,
  },

  friendPickList: {
    pickedByOne: (name) => `${name} to má vybrané`,
    pickedByMany: (count) => czechPlural(count, `Vybrané to má ${count} přítel`, `Vybrané to mají ${count} přátelé`, `Vybrané to má ${count} přátel`),
  },

  myScheduleShare: {
    heading: 'Můj program',
    signIn: 'Přihlaste se',
    signInRest: ' a sdílejte svůj program.',
    signInRequired: 'Pro sdílení programu se přihlaste',
    share: 'Sdílet můj program',
    shareAgain: 'Sdílet znovu',
    copyLink: 'Kopírovat odkaz',
    revoke: 'Zrušit sdílení',
    shareMessage: 'Mrkni na můj festivalový program',
    linkCopied: 'Odkaz zkopírován',
    copyFailed: 'Odkaz se nepodařilo zkopírovat',
    createFailed: 'Odkaz se nepodařilo vytvořit',
    revoked: 'Sdílení zrušeno',
  },

  shareLinkHandler: {
    viewing: (name) => `Prohlížíte program: ${name}`,
    openFailed: 'Odkaz se nepodařilo otevřít',
  },

  settingsScreen: {
    account: 'Účet',
    signOut: 'Odhlásit se',
    signingIn: 'Přihlašuji…',
    signInWithGoogle: 'Přihlásit přes Google',
    signInWithApple: 'Přihlásit přes Apple',
    signInFailed: 'Přihlášení se nezdařilo. Zkuste to znovu.',
    lockScreen: 'Zamykací obrazovka',
    nowCardTitle: 'Karta s programem',
    nowCardHint: 'Co právě hraje a co následuje, na zamykací obrazovce',
    notificationsOff: 'Oznámení jsou pro tuto aplikaci v systémovém nastavení vypnutá.',
    festivalEdition: 'Ročník festivalu',
    chooseEdition: 'Vyberte ročník',
    editionAccessibilityLabel: (edition) => `Ročník festivalu, ${edition}`,
    language: 'Jazyk',
    languageSystem: 'Podle systému',
    languageAccessibilityLabel: (language) => `Jazyk, ${language}`,
  },
};

// Each language named in itself, the same whatever the app shows: Settings
// offers them so that someone who can't read the current language finds theirs.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  cs: 'Čeština',
};

const BY_LANGUAGE: Record<Language, Strings> = { en, cs };

export function stringsFor(language: Language): Strings {
  return BY_LANGUAGE[language];
}

/** The strings in the language the app shows now. */
export function strings(): Strings {
  return BY_LANGUAGE[appLanguage()];
}
