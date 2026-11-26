import React from 'react';
import { processColor, StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { PlanSetRow } from './PlanSetRow';
import { ConflictGroupTitle, NowArrow } from './PlanListItems';
import { buildPlanDay, type PlanInputs } from './planUtils';
import { computeConflictEntries, conflictOverlapsOf } from '../../lib/conflictUtils';
import type { PlanSetModel } from './PlanSetRow.model';
import type { PlanFilterLevel } from '../../lib/plan';
import { getFestivalDayStart } from '../../utils/festivalTime';
import { colors } from '../../styling/tokens';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── A set in the plan ─────────────────────────────────────────────────────────
//
// Built through buildPlanDay rather than by hand, so the row is tested against
// the items the screen really gets. The dimensions: the pick level (Must-see,
// Maybe, unpicked, don't go), All sets or another filter, and now (before,
// during, after a set).

function at(hm: string): number {
  return Date.parse(`2025-08-07T${hm}:00+02:00`);
}

const THU = getFestivalDayStart(at('12:00'));

function setup(): { inputs: PlanInputs; interests: Record<string, string> } {
  const specs: [string, string, number, number, string][] = [
    ['1', 'Mgła', at('17:55'), at('18:40'), 'will_go'],
    ['5', 'Gojira', at('19:00'), at('20:00'), 'will_go'],
    ['6', 'Batushka', at('19:40'), at('20:30'), 'will_go'],
    ['7', 'Paysage', at('20:10'), at('21:00'), 'maybe'],
    ['8', 'Ulcerate', at('21:00'), at('21:45'), 'none'],
    ['9', 'Spectral', at('21:50'), at('22:30'), 'dont_go'],
  ];
  const artists: DbArtist[] = [];
  const artistEvents: Record<string, DbEvent[]> = {};
  const interests: Record<string, string> = {};
  for (const [id, name, from, to, status] of specs) {
    artists.push({ slug: 't', artistId: id, name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] });
    artistEvents[id] = [{ slug: 't', eventId: `e${id}`, dateFrom: from, dateTo: to, artistId: id, stageId: 's', categoryId: 'c' }];
    interests[id] = status;
  }
  const stages = [{ slug: 't', stageId: 's', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Octagon' }] }];
  return { inputs: { artists, stages, artistEvents }, interests };
}

function item(name: string, now: string, level: PlanFilterLevel = 'all'): PlanSetModel {
  const { inputs, interests } = setup();
  const entries = computeConflictEntries(interests, inputs);
  const items = buildPlanDay(interests, inputs, { entries, overlaps: conflictOverlapsOf(entries) }, { dayStart: THU, now: at(now), duringFestival: true, level });
  const found = items.find((i): i is PlanSetModel => i.kind === 'set' && i.artist.name === name);
  if (found === undefined) {
    throw new Error(`no ${name}`);
  }
  return found;
}

async function renderRow(row: PlanSetModel, handlers = { onPressArtist: jest.fn() }) {
  await render(<PlanSetRow item={row} {...handlers} />);
  return handlers;
}

it('shows the time range, band and stage', async () => {
  await renderRow(item('Gojira', '19:23'));
  expect(screen.getByText('19:00–20:00')).toBeTruthy();
  expect(screen.getByText('Gojira')).toBeTruthy();
  expect(screen.getByText('Octagon')).toBeTruthy();
});

it('shows a live set as LIVE with its time left', async () => {
  await renderRow(item('Gojira', '19:23'));
  expect(screen.getByText('LIVE')).toBeTruthy();
  expect(screen.getByText('−37 min')).toBeTruthy();
  expect(screen.getByTestId('plan-live-progress')).toBeTruthy();
});

// Every progress bar: the passed part dark, what remains light.
it('fills a live Must-see\'s bar dark for the time passed, over the accent for what remains', async () => {
  await renderRow(item('Gojira', '19:23'));
  expect(StyleSheet.flatten(screen.getByTestId('plan-live-progress').props.style).backgroundColor).toBe(colors.accent);
  expect(StyleSheet.flatten(screen.getByTestId('plan-live-fill').props.style).backgroundColor).toBe(colors.livePassed);
});

it('fills a live Maybe\'s bar dark grey for the time passed, over the light grey for what remains', async () => {
  await renderRow(item('Paysage', '20:20'));
  expect(StyleSheet.flatten(screen.getByTestId('plan-live-progress').props.style).backgroundColor).toBe(colors.maybeText);
  expect(StyleSheet.flatten(screen.getByTestId('plan-live-fill').props.style).backgroundColor).toBe(colors.borderMid);
});

it('counts down to a set that clashes with one live now', async () => {
  await renderRow(item('Batushka', '19:23'));
  expect(screen.getByText('START')).toBeTruthy();
  expect(screen.getByText('−17 min')).toBeTruthy();
});

it('draws the now arrow on a live set only, at the tip of its progress', async () => {
  const live = item('Gojira', '19:23');
  await renderRow(live);
  expect(StyleSheet.flatten(screen.getByTestId('plan-now-arrow').props.style).top).toBe(live.nowY! - 15);
  await renderRow(item('Batushka', '19:23'));
  expect(screen.queryByTestId('plan-now-arrow')).toBeNull();
});

type ArrowShape = React.ReactElement<{ fill?: string; stroke?: string; strokeWidth?: number }>;

function arrowShape(color?: string): ArrowShape {
  const arrow = NowArrow({ y: 20, color }) as React.ReactElement<{ children: ArrowShape }>;
  return arrow.props.children;
}

it('draws the now arrow red by default, with no outline', () => {
  const shape = arrowShape();
  expect(shape.props.fill).toBe(colors.danger);
  expect(shape.props.stroke).toBeUndefined();
});

it('draws a now arrow of another colour outlined in grey', () => {
  const shape = arrowShape(colors.surfaceRaised);
  expect(shape.props.fill).toBe(colors.surfaceRaised);
  expect(shape.props.stroke).toBe(colors.muted);
  expect(shape.props.strokeWidth).toBe(1);
});

it.each([
  ['a Must-see', 'Gojira', '19:23', colors.danger],
  ['a Maybe', 'Paysage', '20:20', colors.danger],
  ['an unpicked set', 'Ulcerate', '21:20', colors.surfaceRaised],
  ['a "don\'t go" set', 'Spectral', '22:00', colors.surfaceRaised],
] as const)('draws the now arrow of live %s in %s', async (_kind, name, now, fill) => {
  await renderRow(item(name, now));
  expect(screen.getByTestId('plan-now-arrow-shape').props.fill).toEqual({ type: 0, payload: processColor(fill) });
});

it('marks a past set as done', async () => {
  await renderRow(item('Mgła', '19:23'));
  expect(screen.getByText('done')).toBeTruthy();
});

it('draws a clash bar for each overlap, and none on a Maybe', async () => {
  await renderRow(item('Gojira', '19:23'));
  expect(screen.getAllByTestId('plan-clash-bar')).toHaveLength(1);
  await renderRow(item('Paysage', '19:23'));
  expect(screen.queryByTestId('plan-clash-bar')).toBeNull();
});

it('gives every clash bar its own clip id: on web, SVG ids are global to the page', async () => {
  await render(
    <>
      <PlanSetRow item={item('Gojira', '19:23')} onPressArtist={jest.fn()} />
      <PlanSetRow item={item('Batushka', '19:23')} onPressArtist={jest.fn()} />
    </>,
  );
  const ids: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node !== null && typeof node === 'object' && 'type' in node) {
      const host = node as { type: string; props: { name?: string }; children: unknown };
      if (host.type === 'RNSVGClipPath') {
        ids.push(host.props.name ?? '');
      }
      walk(host.children);
    }
  };
  walk(screen.toJSON());
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
});

// ── The box: category colours, left edge, corners ────────────────────────────
//
// A row takes its category's colours from the timeline (categoryBlockColors):
// a Must-see its background. A Maybe and an unpicked row are the raised
// surface, a "don't go" has no background. Under every filter a row has no
// border; a Must-see has a solid 3 pt left edge in the category's brighter
// colour and a Maybe a dotted one in one grey whatever its category, each drawn
// by its own element (PlanRowEdge); the others have none, their own background
// showing there. Every live set's progress bar starts 3 pt in, past the edge.
// A live Must-see or Maybe is outlined in a 1 pt border in its category's
// brighter colour, laid over the row. The content keeps its inset: 18 pt from
// the left side, 23 pt from the right.

const CATEGORY = { bg: 'rgb(10, 20, 30)', border: 'rgb(40, 50, 60)' };

async function rowStyle(row: PlanSetModel) {
  await render(<PlanSetRow item={row} onPressArtist={jest.fn()} category={CATEGORY} />);
  return StyleSheet.flatten(screen.getByRole('button').props.style);
}

/** The grey #595959 as the SVG host gets it: processed for the platform (its ARGB number, signed on Android). */
const GREY = { type: 0, payload: processColor('#595959') };

/** The dots of a compact (26 pt) and a tall (58 pt) row's dotted edge. */
const DOTS = {
  26: 'M0 2h3v3h-3zM0 8h3v3h-3zM0 14h3v3h-3zM0 20h3v3h-3z',
  58: 'M0 3h3v3h-3zM0 9h3v3h-3zM0 15h3v3h-3zM0 21h3v3h-3zM0 27h3v3h-3zM0 33h3v3h-3zM0 39h3v3h-3zM0 45h3v3h-3zM0 51h3v3h-3z',
};

/** The left edge the row draws: solid with its colour, dotted with its colour and dots, or null. */
function rowEdge(): { edge: 'solid'; color: unknown } | { edge: 'dotted'; color: unknown; dots: string } | null {
  const solid = screen.queryByTestId('left-edge-solid');
  if (solid !== null) {
    return { edge: 'solid', color: StyleSheet.flatten(solid.props.style).backgroundColor };
  }
  const dots = screen.queryByTestId('left-edge-dots');
  if (dots !== null) {
    return { edge: 'dotted', color: dots.props.fill, dots: dots.props.d };
  }
  return null;
}

const ROWS = [
  ['a Must-see under All sets', 'Batushka', 'all'],
  ['a Must-see under Must-see only', 'Batushka', 'must'],
  ['a Maybe under All sets', 'Paysage', 'all'],
  ['a compact Maybe under Must-see and Maybe', 'Paysage', 'maybe'],
  ['an unpicked set', 'Ulcerate', 'all'],
  ['a "don\'t go" set', 'Spectral', 'all'],
] as const;

it.each(ROWS)('rounds the corners of %s by 4', async (_kind, name, level) => {
  expect((await rowStyle(item(name, '19:23', level))).borderRadius).toBe(4);
});

it.each(ROWS)('gives %s no border, its content 18 pt in from the left and 23 pt from the right', async (_kind, name, level) => {
  const style = await rowStyle(item(name, '19:23', level));
  expect(style.borderWidth ?? 0).toBe(0);
  expect(style.borderLeftWidth ?? 0).toBe(0);
  expect(style.paddingLeft).toBe(18);
  expect(style.paddingRight).toBe(23);
});

it.each([
  ['All sets', 'all'],
  ['Must-see only', 'must'],
] as const)('fills a Must-see row under %s with its category\'s colour, with a solid left edge in the brighter one', async (_filter, level) => {
  const style = await rowStyle(item('Batushka', '19:23', level));
  expect(style.backgroundColor).toBe('rgb(10, 20, 30)');
  expect(rowEdge()).toEqual({ edge: 'solid', color: 'rgb(40, 50, 60)' });
});

it.each([
  ['a live Must-see under All sets', 'Gojira', '19:23', 'all', 'solid'],
  ['a live Must-see under Must-see only', 'Gojira', '19:23', 'must', 'solid'],
  ['a live Maybe under All sets', 'Paysage', '20:30', 'all', 'dotted'],
  ['a live compact Maybe', 'Paysage', '20:30', 'maybe', 'dotted'],
] as const)('outlines %s in a 1 pt border in its category\'s brighter colour, over its left edge, without moving its content', async (_kind, name, now, level, edge) => {
  const style = await rowStyle(item(name, now, level));
  expect(rowEdge()?.edge).toBe(edge);
  expect(StyleSheet.flatten(screen.getByTestId('plan-live-border').props.style)).toMatchObject({
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 1, borderRadius: 4, borderColor: 'rgb(40, 50, 60)',
  });
  expect(style.borderWidth ?? 0).toBe(0);
  expect(style.paddingLeft).toBe(18);
  expect(style.paddingRight).toBe(23);
});

it.each([
  ['an upcoming Must-see', 'Batushka', '19:23', 'all'],
  ['a past Must-see', 'Mgła', '19:23', 'all'],
  ['an upcoming Maybe', 'Paysage', '19:23', 'all'],
  ['a live unpicked set', 'Ulcerate', '21:20', 'all'],
  ['a live "don\'t go" set', 'Spectral', '22:10', 'all'],
] as const)('draws no live border on %s', async (_kind, name, now, level) => {
  await rowStyle(item(name, now, level));
  expect(screen.queryByTestId('plan-live-border')).toBeNull();
});

it.each([
  ['All sets', 'all', 58],
  ['Must-see and Maybe', 'maybe', 26],
] as const)('fills a Maybe row under %s with the raised surface, with a dotted grey left edge the row\'s height, the same in every category', async (_filter, level, height) => {
  const style = await rowStyle(item('Paysage', '19:23', level));
  expect(style.backgroundColor).toBe(colors.surfaceRaised);
  expect(style.height).toBe(height);
  expect(rowEdge()).toEqual({ edge: 'dotted', color: GREY, dots: DOTS[height] });
});

it('keeps a live compact Maybe\'s dotted edge, with a red dot before its name', async () => {
  await rowStyle(item('Paysage', '20:30', 'maybe'));
  expect(rowEdge()?.edge).toBe('dotted');
  expect(StyleSheet.flatten(screen.getByTestId('plan-maybe-live-dot').props.style).backgroundColor).toBe(colors.danger);
});

it('gives a live Maybe under All sets the LIVE status line rather than a dot before its name', async () => {
  await rowStyle(item('Paysage', '20:30'));
  expect(rowEdge()?.edge).toBe('dotted');
  expect(screen.getByText('LIVE')).toBeTruthy();
  expect(screen.queryByTestId('plan-maybe-live-dot')).toBeNull();
});

it.each([
  ['a Must-see', 'Gojira', '19:23', 'all'],
  ['a compact Maybe', 'Paysage', '20:30', 'maybe'],
  ['an unpicked set', 'Ulcerate', '21:20', 'all'],
  ['a "don\'t go" set', 'Spectral', '22:10', 'all'],
] as const)('starts the progress bar of %s 3 pt in, past the left edge, while live', async (_kind, name, now, level) => {
  const row = item(name, now, level);
  expect(row.state).toBe('live');
  await rowStyle(row);
  expect(StyleSheet.flatten(screen.getByTestId('plan-live-progress').props.style).left).toBe(3);
});

it('writes a compact Maybe row in the muted text colour, readable in sunlight', async () => {
  await renderRow(item('Paysage', '19:23', 'maybe'));
  for (const text of ['20:10–21:00', 'Paysage', 'Octagon']) {
    expect(StyleSheet.flatten(screen.getByText(text).props.style).color).toBe(colors.textMuted);
  }
});

it('fills an unpicked row with the raised surface, with no left edge', async () => {
  const style = await rowStyle(item('Ulcerate', '19:23'));
  expect(style.backgroundColor).toBe(colors.surfaceRaised);
  expect(rowEdge()).toBeNull();
  expect(style.height).toBe(58);
});

it('gives a "don\'t go" row no background and no left edge, its texts in the muted grey', async () => {
  const style = await rowStyle(item('Spectral', '19:23'));
  expect(style.backgroundColor).toBeUndefined();
  expect(rowEdge()).toBeNull();
  expect(style.height).toBe(58);
  for (const text of ['21:50–22:30', 'Spectral', 'Octagon']) {
    expect(StyleSheet.flatten(screen.getByText(text).props.style).color).toBe(colors.muted);
  }
});

it('writes an unpicked row\'s name in the primary text colour, not the muted grey', async () => {
  await renderRow(item('Ulcerate', '19:23'));
  expect(StyleSheet.flatten(screen.getByText('Ulcerate').props.style).color).toBe(colors.textPrimary);
  expect(StyleSheet.flatten(screen.getByText('Octagon').props.style).color).toBe(colors.textSecondary);
});

it('falls back to the surface without category colours', async () => {
  await renderRow(item('Batushka', '19:23'));
  const style = StyleSheet.flatten(screen.getByRole('button').props.style);
  expect(style.backgroundColor).toBe(colors.surface);
});

// ── The star ──────────────────────────────────────────────────────────────────

it.each([
  ['a Must-see', 'Gojira', 'will_go'],
  ['a Maybe', 'Paysage', 'maybe'],
  ['an unpicked set', 'Ulcerate', 'none'],
  ['a "don\'t go" set', 'Spectral', 'dont_go'],
] as const)('puts the star of %s at the right end of its name line under All sets, the name taking the room before it', async (_kind, name, status) => {
  await renderRow(item(name, '19:23'));
  const text = screen.getByText(name);
  expect(within(text.parent!).getByTestId(`plan-star-${status}`)).toBeTruthy();
  expect(StyleSheet.flatten(text.props.style).flexGrow).toBe(1);
});

it.each(['maybe', 'must'] as const)('keeps the star on a Must-see under the %s filter', async (level) => {
  await renderRow(item('Gojira', '19:23', level));
  expect(within(screen.getByText('Gojira').parent!).getByTestId('plan-star-will_go')).toBeTruthy();
});

it('puts no star on the compact Maybe under Must-see and Maybe', async () => {
  await renderRow(item('Paysage', '19:23', 'maybe'));
  expect(screen.getByText('Paysage')).toBeTruthy();
  expect(screen.queryByTestId(/^plan-star/)).toBeNull();
});

it('cuts a long name off before the star, which never shrinks', async () => {
  await renderRow(item('Ulcerate', '19:23'));
  const name = screen.getByText('Ulcerate');
  expect(name.props.numberOfLines).toBe(1);
  expect(StyleSheet.flatten(name.props.style).flexShrink).toBe(1);
  expect(StyleSheet.flatten(screen.getByTestId('plan-star-none').props.style).flexShrink).toBe(0);
});

// ── A past row: slightly dimmed, with faint grey stripes ──────────────────────
//
// Readable in sunlight: 75 % rather than 45 %, the stripes falling ("\"), the
// other way from the red clash stripes, behind the text. Every row type; only
// past ones.

const rowOpacity = (): unknown => StyleSheet.flatten(screen.getByRole('button').props.style).opacity;

it.each([
  ['a Must-see', 'Mgła', '19:23'],
  ['a Maybe', 'Paysage', '21:30'],
  ['an unpicked set', 'Ulcerate', '22:00'],
  ['a "don\'t go" set', 'Spectral', '22:40'],
])('dims a past row, %s, only slightly and stripes it', async (_kind, name, now) => {
  const row = item(name, now);
  expect(row.state).toBe('past');
  await renderRow(row);
  expect(rowOpacity()).toBe(0.75);
  expect(within(screen.getByRole('button')).getByTestId('plan-past-stripes')).toBeTruthy();
});

it.each([
  ['live', 'Gojira'],
  ['upcoming', 'Batushka'],
])('leaves a %s row at full strength, without stripes', async (state, name) => {
  const row = item(name, '19:23');
  expect(row.state).toBe(state);
  await renderRow(row);
  expect(rowOpacity()).toBe(1);
  expect(screen.queryByTestId('plan-past-stripes')).toBeNull();
});

it('opens the artist detail when the row is tapped', async () => {
  const row = item('Gojira', '19:23');
  const { onPressArtist } = await renderRow(row);
  await fireEvent.press(screen.getByText('Gojira'));
  expect(onPressArtist).toHaveBeenCalledWith(row.artist);
});

// The group title is drawn by the cell above the clash group (a list cell
// cannot receive touches outside its own bounds on Android); which cell carries
// it is planUtils' business.
it('opens the conflict detail from the group title', async () => {
  const row = item('Gojira', '19:23');
  const onPress = jest.fn();
  await render(<ConflictGroupTitle event={row.event} onPress={onPress} />);
  await fireEvent.press(screen.getByText('Conflict'));
  expect(onPress).toHaveBeenCalledWith(row.event);
});
