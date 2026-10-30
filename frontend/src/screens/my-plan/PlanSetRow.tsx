import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { Text } from '../../ui/Text';
import { stripePath, CONFLICT_STRIPE } from '../../ui/stripes';
import { BOLD, CLASH_BAR_WIDTH, LIST_GUTTER, LIVE_BORDER, PAST_ROW, PROGRESS_BAR_WIDTH, PROGRESS_COLORS, STATUS_LABEL, TABULAR, type ProgressColors } from './planStyles';
import { NowArrow } from './PlanListItems';
import { StarIndicator } from '../../features/interests/StarButton';
import { sameProps } from '../../ui/sameProps';
import type { ClashBar, PlanSetModel, SetStatus } from './PlanSetRow.model';
import type { DbArtist } from '../../types/backend';
import { colors, MAX_CONTENT_WIDTH } from '../../styling/tokens';

// ── One set in My plan ────────────────────────────────────────────────────────
//
// Must-see: a filled two-line card in its category's colours. A set you haven't
// picked (All sets): the same card, outlined only. Maybe: one line in a dashed
// box, its text muted but bright enough for sunlight; while live, a solid accent
// border and a red dot before the name. A pick's star follows its name; a long
// name cuts off and the star stays at the end of the line. A past row is only
// slightly dimmed, with faint grey stripes behind its text.
// Both share one fixed inset, so the time, name and stage columns line up in
// every state, clear of the progress bar on the left edge and the clash bar on
// the right. Tapping anywhere opens the artist's detail sheet. Draws its model
// (PlanSetRow.model.ts) and computes nothing itself.

// Fixed inset inside the 1 pt border: clear of the left progress bar and the
// right clash bar whether they are drawn or not.
const INSET_LEFT = 17;
const INSET_RIGHT = 22;


const STAR_SIZE = { will_go: 15, maybe: 12 } as const;

/**
 * A past row's stripes, behind everything it shows. Drawn as wide as the content
 * can be, so one path per row height serves every width; the row clips it.
 */
const pastStripePaths = new Map<number, string>();

function PastStripes({ height }: { height: number }) {
  let d = pastStripePaths.get(height);
  if (d === undefined) {
    d = stripePath(MAX_CONTENT_WIDTH, height, { step: PAST_ROW.stripeStep, falling: true });
    pastStripePaths.set(height, d);
  }
  return (
    <Svg testID="plan-past-stripes" pointerEvents="none" width={MAX_CONTENT_WIDTH} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Path d={d} stroke={PAST_ROW.stripeColor} strokeWidth={PAST_ROW.stripeWidth} />
    </Svg>
  );
}

/** The pick's star, right after the name; it never shrinks, the name does. */
function RowStar({ star }: { star: PlanSetModel['star'] }) {
  if (star === null) {
    return null;
  }
  return (
    <View testID={`plan-star-${star}`} style={{ flexShrink: 0 }}>
      <StarIndicator status={star} size={STAR_SIZE[star]} />
    </View>
  );
}

/** The red dot that marks a live set, in a Must-see's status and before a live Maybe's name. */
const LIVE_DOT = { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger };

/** `clipId` must be unique in the whole list: on web, SVG ids are global to the page. */
function ClashStripes({ bar, rowHeight, clipId }: { bar: ClashBar; rowHeight: number; clipId: string }) {
  const height = Math.max(1, (bar.to - bar.from) * rowHeight);
  return (
    <View
      testID="plan-clash-bar"
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 0,
        width: CLASH_BAR_WIDTH,
        top: `${bar.from * 100}%`,
        height: `${(bar.to - bar.from) * 100}%`,
        overflow: 'hidden',
      }}
    >
      <Svg width={CLASH_BAR_WIDTH} height={height}>
        <Defs>
          <ClipPath id={clipId}>
            <Rect width={CLASH_BAR_WIDTH} height={height} />
          </ClipPath>
        </Defs>
        <Rect width={CLASH_BAR_WIDTH} height={height} fill={colors.danger} />
        <Path d={stripePath(CLASH_BAR_WIDTH, height)} stroke={colors.dangerMuted} strokeWidth={CONFLICT_STRIPE} clipPath={`url(#${clipId})`} />
      </Svg>
    </View>
  );
}

function LeftProgress({ progress, palette }: { progress: number; palette: ProgressColors }) {
  return (
    <View
      testID="plan-live-progress"
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: PROGRESS_BAR_WIDTH, backgroundColor: palette.remaining }}
    >
      <View testID="plan-live-fill" style={{ width: PROGRESS_BAR_WIDTH, height: `${progress * 100}%`, backgroundColor: palette.passed }} />
    </View>
  );
}

function Status({ status }: { status: SetStatus }) {
  switch (status.kind) {
    case 'live':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={LIVE_DOT} />
          <Text style={STATUS_LABEL}>{status.label}</Text>
          <Text style={[BOLD, TABULAR, { fontSize: 14, color: colors.accent }]}>{status.time}</Text>
        </View>
      );
    case 'start':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={STATUS_LABEL}>{status.label}</Text>
          <Text style={[BOLD, TABULAR, { fontSize: 14, color: colors.danger }]}>{status.time}</Text>
        </View>
      );
    case 'done':
      return <Text style={{ fontSize: 12, color: colors.textMuted }}>{status.label}</Text>;
    default:
      return null;
  }
}

type Props = {
  item: PlanSetModel;
  onPressArtist: (artist: DbArtist) => void;
  /** A Must-see row's background (an unpicked row has none), and any row's border; the surface colour and a grey border when not given. */
  background?: string;
  border?: string;
};

function SetCard({ item, onPressArtist, background = colors.surface, border = colors.borderMid }: Props) {
  const live = item.state === 'live';

  if (item.level === 'maybe') {
    return (
      <Pressable
        onPress={() => { onPressArtist(item.artist); }}
        accessibilityRole="button"
        accessibilityLabel={item.accessibilityLabel}
        style={{
          height: item.height,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingLeft: INSET_LEFT,
          paddingRight: INSET_RIGHT,
          borderWidth: 1,
          borderStyle: live ? 'solid' : 'dashed',
          borderColor: live ? LIVE_BORDER : border,
          overflow: 'hidden',
          opacity: item.state === 'past' ? PAST_ROW.opacity : 1,
        }}
      >
        {item.state === 'past' && <PastStripes height={item.height} />}
        {live && <LeftProgress progress={item.progress} palette={PROGRESS_COLORS.maybeLive} />}
        <Text style={[TABULAR, { fontSize: 13, color: colors.textMuted }]}>{item.timeText}</Text>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {live && <View testID="plan-maybe-live-dot" style={LIVE_DOT} />}
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, color: colors.textMuted }}>{item.artist.name}</Text>
          <RowStar star={item.star} />
        </View>
        <Text numberOfLines={1} style={{ maxWidth: '35%', fontSize: 13, color: colors.textMuted }}>{item.stageName}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => { onPressArtist(item.artist); }}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      style={{
        height: item.height,
        justifyContent: 'center',
        gap: 5,
        paddingLeft: INSET_LEFT,
        paddingRight: INSET_RIGHT,
        borderWidth: 1,
        borderColor: live ? LIVE_BORDER : border,
        // Filled = picked, outlined = not.
        backgroundColor: item.level === 'none' ? undefined : background,
        overflow: 'hidden',
        opacity: item.state === 'past' ? PAST_ROW.opacity : 1,
      }}
    >
      {item.state === 'past' && <PastStripes height={item.height} />}
      {item.clashBars.map((bar, i) => (
        <ClashStripes key={`${item.key}-${i}`} bar={bar} rowHeight={item.height} clipId={`planClash-${item.key}-${i}`} />
      ))}
      {live && <LeftProgress progress={item.progress} palette={PROGRESS_COLORS.live} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={[TABULAR, { fontSize: 13, color: colors.textMuted }]}>{item.timeText}</Text>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={[BOLD, { flexShrink: 1, fontSize: 15, color: colors.textPrimary }]}>{item.artist.name}</Text>
          <RowStar star={item.star} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Status status={item.status} />
        <Text numberOfLines={1} style={{ flex: 1, textAlign: 'right', fontSize: 13, color: colors.textSecondary }}>
          {item.stageName}
        </Text>
      </View>
    </Pressable>
  );
}

/** The card inside the list's side gutters, and the now arrow in the left one while live. */
function PlanSetRowBase(props: Props) {
  const { nowY } = props.item;
  return (
    <View>
      <View style={{ paddingHorizontal: LIST_GUTTER }}>
        <SetCard {...props} />
      </View>
      {nowY !== null && <NowArrow y={nowY} />}
    </View>
  );
}

/**
 * Renders again only when what it shows changes (sameProps): the plan rebuilds
 * its models every minute, but a row whose texts and progress stay the same is
 * left alone.
 */
export const PlanSetRow = memo(PlanSetRowBase, sameProps);
