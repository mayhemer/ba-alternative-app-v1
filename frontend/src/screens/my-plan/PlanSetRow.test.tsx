import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { PlanSetRow } from './PlanSetRow';
import { ConflictGroupTitle, NowArrow } from './PlanListItems';
import { buildPlanDay, type PlanInputs } from './planUtils';
import type { PlanSetModel } from './PlanSetRow.model';
import { getFestivalDayStart } from '../../utils/festivalTime';
import { colors } from '../../styling/tokens';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── A set in the plan ─────────────────────────────────────────────────────────
//
// Built through buildPlanDay rather than by hand, so the row is tested against
// the items the screen really gets.

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

function item(name: string, now: string): PlanSetModel {
  const { inputs, interests } = setup();
  const items = buildPlanDay(interests, inputs, { dayStart: THU, now: at(now), duringFestival: true, level: 'all' });
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

it('draws the now arrow red, outlined in white', () => {
  const arrow = NowArrow({ y: 20 }) as React.ReactElement<{ children: React.ReactElement<{ fill?: string; stroke?: string; strokeWidth?: number }> }>;
  const shape = arrow.props.children;
  expect(shape.props.fill).toBe(colors.danger);
  expect(shape.props.stroke).toBe(colors.white);
  expect(shape.props.strokeWidth).toBe(1);
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

// ── Category colours ──────────────────────────────────────────────────────────
//
// A row takes its category's colours from the timeline (categoryBlockColors):
// a Must-see its background and border, a Maybe its border only.

const BG = 'rgb(10, 20, 30)';
const BORDER = 'rgb(40, 50, 60)';

async function rowStyle(row: PlanSetModel, colours: { background?: string; border?: string }) {
  await render(<PlanSetRow item={row} onPressArtist={jest.fn()} {...colours} />);
  return StyleSheet.flatten(screen.getByRole('button').props.style);
}

it('gives a Must-see row its category\'s background and border', async () => {
  const style = await rowStyle(item('Batushka', '19:23'), { background: BG, border: BORDER });
  expect(style.backgroundColor).toBe(BG);
  expect(style.borderColor).toBe(BORDER);
});

it('gives a live Must-see row the full accent border, over its category\'s', async () => {
  const style = await rowStyle(item('Gojira', '19:23'), { background: BG, border: BORDER });
  expect(style.backgroundColor).toBe(BG);
  expect(style.borderColor).toBe(colors.accent);
});

it('gives a Maybe row its category\'s border and no background', async () => {
  const style = await rowStyle(item('Paysage', '19:23'), { background: BG, border: BORDER });
  expect(style.borderColor).toBe(BORDER);
  expect(style.borderStyle).toBe('dashed');
  expect(style.backgroundColor).toBeUndefined();
  expect(screen.queryByTestId('plan-maybe-live-dot')).toBeNull();
});

it('gives a live Maybe row a solid full accent border and a red dot before its name', async () => {
  const style = await rowStyle(item('Paysage', '20:30'), { background: BG, border: BORDER });
  expect(style.borderColor).toBe(colors.accent);
  expect(style.borderStyle).toBe('solid');
  expect(StyleSheet.flatten(screen.getByTestId('plan-maybe-live-dot').props.style).backgroundColor).toBe(colors.danger);
});

it('writes a Maybe row in the muted text colour, readable in sunlight', async () => {
  await renderRow(item('Paysage', '19:23'));
  for (const text of ['20:10–21:00', 'Paysage', 'Octagon']) {
    expect(StyleSheet.flatten(screen.getByText(text).props.style).color).toBe(colors.textMuted);
  }
});

it('falls back to the surface and a grey border without category colours', async () => {
  const style = await rowStyle(item('Batushka', '19:23'), {});
  expect(style.backgroundColor).toBe(colors.surface);
  expect(style.borderColor).toBe(colors.borderMid);
});

it('gives an unpicked row its category\'s border and no background', async () => {
  await render(<PlanSetRow item={item('Ulcerate', '19:23')} onPressArtist={jest.fn()} background="rgb(10, 20, 30)" border="rgb(40, 50, 60)" />);
  const style = StyleSheet.flatten(screen.getByRole('button').props.style);
  expect(style.borderColor).toBe('rgb(40, 50, 60)');
  expect(style.borderStyle ?? 'solid').toBe('solid');
  expect(style.backgroundColor).toBeUndefined();
  expect(style.height).toBe(58);
});

it('puts a full star right after a Must-see\'s name, in the name\'s line', async () => {
  await renderRow(item('Gojira', '19:23'));
  const line = screen.getByText('Gojira').parent!;
  expect(within(line).getByTestId('plan-star-will_go')).toBeTruthy();
  expect(screen.queryByTestId('plan-star-maybe')).toBeNull();
});

it('puts a half star right after a Maybe\'s name, in the name\'s line', async () => {
  await renderRow(item('Paysage', '19:23'));
  const line = screen.getByText('Paysage').parent!;
  expect(within(line).getByTestId('plan-star-maybe')).toBeTruthy();
});

it('puts no star on an unpicked set', async () => {
  await renderRow(item('Ulcerate', '19:23'));
  expect(screen.queryByTestId('plan-star-will_go')).toBeNull();
  expect(screen.queryByTestId('plan-star-maybe')).toBeNull();
});

it('cuts a long name off before the star, which never shrinks', async () => {
  await renderRow(item('Gojira', '19:23'));
  const name = screen.getByText('Gojira');
  expect(name.props.numberOfLines).toBe(1);
  expect(StyleSheet.flatten(name.props.style).flexShrink).toBe(1);
  expect(StyleSheet.flatten(screen.getByTestId('plan-star-will_go').props.style).flexShrink).toBe(0);
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
