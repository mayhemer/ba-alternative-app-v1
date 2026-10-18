import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanSetRow } from './PlanSetRow';
import { ConflictGroupTitle } from './PlanListItems';
import { buildPlanDay, type PlanInputs, type PlanSetItem } from '../../utils/planUtils';
import { getFestivalDayStart } from '../timeline/timelineLayout';
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

function item(name: string, now: string): PlanSetItem {
  const { inputs, interests } = setup();
  const items = buildPlanDay(interests, inputs, { dayStart: THU, now: at(now), duringFestival: true, showMaybe: true, conflictsOnly: false });
  const found = items.find((i): i is PlanSetItem => i.kind === 'set' && i.artist.name === name);
  if (found === undefined) {
    throw new Error(`no ${name}`);
  }
  return found;
}

async function renderRow(row: PlanSetItem, handlers = { onPressArtist: jest.fn() }) {
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

it('counts down to a set that clashes with one live now', async () => {
  await renderRow(item('Batushka', '19:23'));
  expect(screen.getByText('START')).toBeTruthy();
  expect(screen.getByText('−17 min')).toBeTruthy();
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

it('opens the artist detail when the row is tapped', async () => {
  const row = item('Gojira', '19:23');
  const { onPressArtist } = await renderRow(row);
  await fireEvent.press(screen.getByText('Gojira'));
  expect(onPressArtist).toHaveBeenCalledWith(row.artist);
});

// The group title is drawn by the cell above the clash group (a FlatList cell
// cannot receive touches outside its own bounds on Android); which set carries
// it is planUtils' conflictHead.
it('opens the conflict detail from the group title', async () => {
  const row = item('Gojira', '19:23');
  const onPress = jest.fn();
  await render(<ConflictGroupTitle event={row.event} onPress={onPress} />);
  await fireEvent.press(screen.getByText('Conflict'));
  expect(onPress).toHaveBeenCalledWith(row.event);
});
