import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  View,
  type ListRenderItem,
  type TextInputInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { useSearch, useCurrentSearchScope } from './SearchContext';
import { SEARCH_LIST, searchItemOffsets, searchListItems, type SearchListItem } from './SearchView.model';
import { searchResultRowModel } from './SearchResultRow.model';
import { SearchResultRow } from './SearchResultRow';
import { SEARCH_FIELD_SHADOW } from './SearchEntry';
import {
  SEARCH_ENTRY,
  keyboardLift,
  scrollRefocusesField,
  searchDockFrame,
  searchResultsBottomPadding,
} from './SearchDock.model';
import { searchStrings } from './searchStrings';
import { searchIndex, searchLineup } from '../../lib/search';
import { useArtistDetail } from '../artist-detail/ArtistDetailContext';
import { useDeferredInterests } from '../interests/InterestContext';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useCategories, useStages } from '../../store/cacheStore';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import type { InterestStatus } from '../../cache/cacheService';
import type { DbArtist, DbEvent } from '../../types/backend';
import {
  colors,
  OVERLAY_BACKDROP,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_MAX_WIDTH,
} from '../../styling/tokens';

// ── The search view ───────────────────────────────────────────────────────────
//
// Over the content area and the bottom bar, under the top bar: the field at the
// bottom edge, where the panel's entry was (SearchDock.model.ts), with a ✕ that
// closes it; it rises with the keyboard and sits on it. Empty, the screen behind
// is only dimmed and a tap on it closes the search; typed, the results cover it
// (SearchView.model.ts), scrolling under the field. A scroll puts the keyboard
// away; scrolling back to the top gives it back to the field. Typing is urgent and the results deferred, so a
// keystroke shows at once and a newer one drops the results render of the last.
//
// A tap on a result: the screen's own section lands there (the search closes,
// the screen widens its filter if it must and scrolls to the set); another
// section switches to that timeline, or opens the artist sheet over the results,
// as the screen's scope says. An artist with no set always opens the sheet.

/**
 * The field follows the keyboard. iOS announces it before it moves, so the
 * field moves with it, on a curve close to the keyboard's; Android announces it
 * once it is up, so the field catches up quickly.
 */
const RISE = Platform.OS === 'ios'
  ? { duration: 250, easing: Easing.bezier(0.38, 0.7, 0.125, 1) }
  : { duration: 120, easing: Easing.out(Easing.quad) };
type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
const keyOf = (item: SearchListItem): string => item.key;
/**
 * The field's accent frame marks it already, so no browser focus ring inside it.
 * Chrome draws that ring with outline-style auto, which ignores outline-width;
 * React Native's types have no 'none', which react-native-web passes through.
 */
const NO_FOCUS_RING = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

export function SearchView() {
  const { isOpen } = useSearch();
  if (!isOpen) {
    return null;
  }
  return <OpenSearch />;
}

function OpenSearch() {
  const { close } = useSearch();
  const scope = useCurrentSearchScope();
  const { openDetail } = useArtistDetail();
  const { isWide } = useLayoutMode();
  const keyboardHeight = useKeyboardHeight();
  const { bottom: safeAreaBottom } = useSafeAreaInsets();
  const lift = keyboardLift({ platform: Platform.OS, keyboardHeight, safeAreaBottom });

  // The field's rise over the bottom edge, animated to each new lift.
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(rise, { toValue: -lift, ...RISE, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [rise, lift]);

  // Scrolling back to the top gives the field the keyboard back: where the
  // user's drag started, until the scroll it began comes to rest.
  const inputRef = useRef<TextInputInstance>(null);
  const dragFrom = useRef<number | null>(null);
  const handleScrollBeginDrag = useCallback((e: ScrollEvent): void => {
    dragFrom.current = e.nativeEvent.contentOffset.y;
    Keyboard.dismiss();
  }, []);
  const handleScrollRest = useCallback((e: ScrollEvent): void => {
    const from = dragFrom.current;
    if (from !== null && scrollRefocusesField({ from, to: e.nativeEvent.contentOffset.y })) {
      dragFrom.current = null;
      inputRef.current?.focus();
    }
  }, []);

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const slug = useSelectedSlug();
  const artists = useArtists(slug);
  const artistEvents = useArtistEventMap(slug);
  const stages = useStages(slug);
  const categories = useCategories(slug);
  const interests = useDeferredInterests();

  const index = useMemo(() => searchIndex(artists), [artists]);
  const stageById = useMemo(() => new Map(stages.map((s) => [s.stageId, s])), [stages]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.categoryId, c])), [categories]);

  const items = useMemo((): SearchListItem[] | null => {
    if (scope === null || deferredQuery.trim() === '') {
      return null;
    }
    return searchListItems(searchLineup(deferredQuery, index, artistEvents), scope, deferredQuery);
  }, [scope, deferredQuery, index, artistEvents]);
  const offsets = useMemo(() => (items !== null ? searchItemOffsets(items) : []), [items]);

  // Read at the tap, so the rows' one callback never changes.
  const live = useRef({ items, scope });
  live.current = { items, scope };

  const handlePress = useCallback((key: string): void => {
    const { items: current, scope: currentScope } = live.current;
    const item = current?.find((i) => i.kind === 'row' && i.key === key);
    if (item === undefined || item.kind !== 'row' || currentScope === null) {
      return;
    }
    const { artist, event } = item.hit;
    // Expanded, as from the artist list: a result is picked to read about it.
    // The list keeps the keyboard up for its taps (keyboardShouldPersistTaps),
    // so it is put away here; the field gets it back when tapped again.
    const details = (a: DbArtist): void => {
      Keyboard.dismiss();
      openDetail(a, 'expanded');
    };
    if (event === null) {
      details(artist);
      return;
    }
    const ref: { artist: DbArtist; event: DbEvent } = { artist, event };
    if (item.placement.section === 'here') {
      if (currentScope.hereOpens === 'details') {
        details(artist);
        return;
      }
      close();
      currentScope.reveal(ref, item.placement.view);
      return;
    }
    if (currentScope.elsewhereOpens === 'details') {
      details(artist);
      return;
    }
    close();
    currentScope.openElsewhere(ref);
  }, [close, openDetail]);

  const renderItem = useCallback<ListRenderItem<SearchListItem>>(({ item }) => {
    switch (item.kind) {
      case 'header':
        return (
          <View style={{ height: item.height, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 8 }}>
            <Text style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textSecondary }}>{item.title}</Text>
            {item.note !== '' && <Text style={{ fontSize: 11, color: colors.muted }}>{item.note}</Text>}
          </View>
        );
      case 'row': {
        const model = searchResultRowModel({
          hit: item.hit,
          status: (interests[item.hit.artist.artistId] ?? 'none') as InterestStatus,
          stage: item.hit.event !== null ? stageById.get(item.hit.event.stageId) : undefined,
          category: item.hit.event !== null ? categoryById.get(item.hit.event.categoryId) : undefined,
          tag: item.tag,
        });
        return (
          <View style={{ height: item.height }}>
            <SearchResultRow item={model} onPress={handlePress} />
          </View>
        );
      }
      case 'more':
      case 'none':
        return (
          <View style={{ height: item.height, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>{item.text}</Text>
          </View>
        );
    }
  }, [interests, stageById, categoryById, handlePress]);

  const getItemLayout = useCallback((_: ArrayLike<SearchListItem> | null | undefined, i: number) => ({
    length: items?.[i].height ?? 0,
    offset: offsets[i] ?? 0,
    index: i,
  }), [items, offsets]);

  // Behind the results: the whole content area on a phone; on a wide screen only
  // the column, so the permanent drawer stays in sight, dimmed.
  const resultsArea = isWide
    ? { right: 0, width: OVERLAY_PANEL_MAX_WIDTH + OVERLAY_PANEL_MARGIN * 2 }
    : { left: 0, right: 0 };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {(items === null || isWide) && (
        <Pressable
          testID="search-dim"
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={searchStrings.close}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAY_BACKDROP }}
        />
      )}
      {items !== null && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, ...resultsArea, backgroundColor: colors.background }}>
          <FlatList
            testID="search-results"
            data={items}
            keyExtractor={keyOf}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            initialNumToRender={SEARCH_LIST.maxRows}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollRest}
            onMomentumScrollEnd={handleScrollRest}
            style={{ flex: 1, marginHorizontal: OVERLAY_PANEL_MARGIN }}
            // The last rows scroll clear of the field, and of the keyboard under it.
            contentContainerStyle={{ paddingTop: OVERLAY_PANEL_MARGIN, paddingBottom: searchResultsBottomPadding(lift) }}
          />
        </View>
      )}

      <Animated.View
        style={{
          position: 'absolute',
          ...searchDockFrame({ isWide }),
          transform: [{ translateY: rise }],
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 18,
          borderWidth: 1,
          borderColor: colors.accent,
          backgroundColor: colors.surfaceRaised,
          boxShadow: SEARCH_FIELD_SHADOW,
        }}
      >
        <Ionicons name="search" size={SEARCH_ENTRY.iconSize} color={colors.textMuted} />
        <TextInput
          testID="search-input"
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
          placeholder={searchStrings.placeholder}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          style={[{ flex: 1, height: '100%', fontSize: 16, color: colors.textPrimary, fontFamily: 'Regular-Default', padding: 0 }, NO_FOCUS_RING]}
        />
        <Pressable
          testID="search-close"
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={searchStrings.close}
          hitSlop={8}
          style={{ paddingHorizontal: 16, height: '100%', justifyContent: 'center' }}
        >
          <Ionicons name="close-circle" size={20} color={colors.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}
