import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { Text } from '../../ui/Text';
import { stripePath, CONFLICT_STRIPE } from '../../ui/stripes';
import { BOLD, CLASH_BAR_WIDTH, LIST_GUTTER, PAST_ROW, PROGRESS_BAR_WIDTH, PROGRESS_COLORS, ROW_RADIUS, STATUS_LABEL, TABULAR, type ProgressColors } from './planStyles';
import { NowArrow } from './PlanListItems';
import { StarGlyph } from '../../features/interests/StarButton';
import { LeftEdge } from '../../ui/LeftEdge';
import { LEFT_EDGE_WIDTH } from '../../ui/LeftEdge.model';
import { sameProps } from '../../ui/sameProps';
import type { ClashBar, PlanSetModel, SetFill, SetStatus } from './PlanSetRow.model';
import type { InterestStatus } from '../../cache/cacheService';
import type { DbArtist } from '../../types/backend';
import { LandingRing } from '../../ui/LandingRing';
import { endLandingHighlight, useLandingHighlight } from '../../features/timeline/landingHighlight';
import { colors, MAX_CONTENT_WIDTH } from '../../styling/tokens';

// ── One set in My plan ────────────────────────────────────────────────────────
//
// A two-line card with rounded corners, filled by its pick: a Must-see in its
// category's colour, a Maybe and an unpicked set (All sets) in the raised
// surface, a "don't go" (All sets) with no fill and its text in the muted grey.
// No row has a border of its own. A Must-see has a 3 pt solid left edge in the
// category's brighter colour and a Maybe a dotted grey one, drawn by
// LeftEdge; the others have none, their own background showing there. Every
// live set's progress bar starts past the edge. A live Must-see or Maybe is
// outlined in a 1 pt border in its category's brighter colour, laid over the
// row so nothing in it moves. Outside All sets a Maybe is
// one compact line, its text muted but bright enough for sunlight, with a red
// dot before the name while live. Under All sets every row has its pick's star
// at the right end of the name's line, before which a long name cuts off. A
// past row is only slightly dimmed, with faint grey stripes behind its text.
// Both share one fixed inset, so the time, name and stage columns line up in
// every state, clear of the progress bar on the left edge and the clash bar on
// the right. Tapping anywhere opens the artist's detail sheet. Draws its model
// (PlanSetRow.model.ts) and computes nothing itself.

// A fixed inset: the content starts 18 pt from the row's left side and ends
// 23 pt from its right, clear of the left edge and progress bar and of the
// right clash bar whether they are drawn or not.
const INSET_LEFT = 18;
const INSET_RIGHT = 23;

const STAR_SIZE = 15;

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

/** The pick's star, at the line's right end; it never shrinks, the name does. */
function PickStar({ status }: { status: InterestStatus }) {
  return (
    <View testID={`plan-star-${status}`} style={{ flexShrink: 0 }}>
      <StarGlyph status={status} size={STAR_SIZE} />
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

/** A live Must-see's or Maybe's outline, over everything in the row: it takes no room. */
const LIVE_OUTLINE = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  borderWidth: 1,
  borderRadius: ROW_RADIUS,
};

function LiveOutline({ color }: { color: string }) {
  return <View testID="plan-live-border" pointerEvents="none" style={[LIVE_OUTLINE, { borderColor: color }]} />;
}

function LeftProgress({ progress, palette }: { progress: number; palette: ProgressColors }) {
  return (
    <View
      testID="plan-live-progress"
      pointerEvents="none"
      style={{ position: 'absolute', left: LEFT_EDGE_WIDTH, top: 0, bottom: 0, width: PROGRESS_BAR_WIDTH, backgroundColor: palette.remaining }}
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

/** The category's colours a row uses (categoryBlockColors). */
type CategoryColors = { bg: string; border: string };

/** Without category colours: the surface, and a grey border. */
const NO_CATEGORY: CategoryColors = { bg: colors.surface, border: colors.borderMid };

type Props = {
  item: PlanSetModel;
  onPressArtist: (artist: DbArtist) => void;
  /** The set's category's colours: a Must-see's fill and left edge, and a live Must-see's or Maybe's outline. */
  category?: CategoryColors;
};

function backgroundOf(fill: SetFill, category: CategoryColors): string | undefined {
  switch (fill) {
    case 'category': return category.bg;
    case 'raised': return colors.surfaceRaised;
    case 'none': return undefined;
  }
}

function edgeColorOf(edge: PlanSetModel['edge'], category: CategoryColors): string {
  if (edge === 'dotted') {
    return colors.maybeBorder;
  }
  return category.border;
}

function SetCard({ item, onPressArtist, category = NO_CATEGORY }: Props) {
  const live = item.state === 'live';
  // No border: the left edge is drawn by its own element (LeftEdge). A native
  // dotted border places its dots by the whole rounded box, not the left side.
  const edge = <LeftEdge edge={item.edge} height={item.height} color={edgeColorOf(item.edge, category)} />;
  const box = {
    height: item.height,
    paddingLeft: INSET_LEFT,
    paddingRight: INSET_RIGHT,
    borderRadius: ROW_RADIUS,
    backgroundColor: backgroundOf(item.fill, category),
    overflow: 'hidden' as const,
    opacity: item.state === 'past' ? PAST_ROW.opacity : 1,
  };

  if (item.compact) {
    return (
      <Pressable
        onPress={() => { onPressArtist(item.artist); }}
        accessibilityRole="button"
        accessibilityLabel={item.accessibilityLabel}
        style={{ ...box, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        {item.state === 'past' && <PastStripes height={item.height} />}
        {edge}
        {live && <LeftProgress progress={item.progress} palette={PROGRESS_COLORS[item.progressColors]} />}
        <Text style={[TABULAR, { fontSize: 13, color: colors.textMuted }]}>{item.timeText}</Text>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {live && <View testID="plan-maybe-live-dot" style={LIVE_DOT} />}
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, color: colors.textMuted }}>{item.artist.name}</Text>
        </View>
        <Text numberOfLines={1} style={{ maxWidth: '35%', fontSize: 13, color: colors.textMuted }}>{item.stageName}</Text>
        {item.liveBorder && <LiveOutline color={category.border} />}
      </Pressable>
    );
  }

  // A "don't go" writes everything in the muted grey.
  const timeColor = item.dimmed ? colors.muted : colors.textMuted;
  const nameColor = item.dimmed ? colors.muted : colors.textPrimary;
  const stageColor = item.dimmed ? colors.muted : colors.textSecondary;
  return (
    <Pressable
      onPress={() => { onPressArtist(item.artist); }}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      style={{ ...box, justifyContent: 'center', gap: 5 }}
    >
      {item.state === 'past' && <PastStripes height={item.height} />}
      {edge}
      {item.clashBars.map((bar, i) => (
        <ClashStripes key={`${item.key}-${i}`} bar={bar} rowHeight={item.height} clipId={`planClash-${item.key}-${i}`} />
      ))}
      {live && <LeftProgress progress={item.progress} palette={PROGRESS_COLORS[item.progressColors]} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={[TABULAR, { fontSize: 13, color: timeColor }]}>{item.timeText}</Text>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={[BOLD, { flexGrow: 1, flexShrink: 1, fontSize: 15, color: nameColor }]}>{item.artist.name}</Text>
          {item.star !== null && <PickStar status={item.star} />}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Status status={item.status} />
        <Text numberOfLines={1} style={{ flex: 1, textAlign: 'right', fontSize: 13, color: stageColor }}>
          {item.stageName}
        </Text>
      </View>
      {item.liveBorder && <LiveOutline color={category.border} />}
    </Pressable>
  );
}

/** The card inside the list's side gutters, the now arrow in the left one while live, and the ring of a landing on it. */
function PlanSetRowBase(props: Props) {
  const { nowY } = props.item;
  // Only this row's own answer: a landing renders the row it lands on alone.
  const landing = useLandingHighlight(props.item.key);
  return (
    <View>
      <View style={{ paddingHorizontal: LIST_GUTTER }}>
        <SetCard {...props} />
        {landing !== null && <LandingRing key={landing} token={landing} onEnd={endLandingHighlight} horizontalInset={LIST_GUTTER} />}
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
