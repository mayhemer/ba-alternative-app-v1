import React from 'react';
import { processColor, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ArtistBlock } from './ArtistBlock';
import { artistBlockModel } from './ArtistBlock.model';
import type { InterestStatus } from '../../cache/cacheService';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── A set's block, as drawn: by my pick ───────────────────────────────────────
//
// Dimension: my pick — Must-see, Maybe, none, don't go. The component draws its
// model (ArtistBlock.model.ts, tested there); the edge is ui/LeftEdge's.

const at = (hm: string): number => Date.parse(`2025-08-06T${hm}:00+02:00`);
const EVENT: DbEvent = { slug: 't', eventId: 'e1', artistId: 'a1', stageId: 's', categoryId: 'c', dateFrom: at('14:30'), dateTo: at('15:05') };
const ARTIST: DbArtist = { slug: 't', artistId: 'a1', name: 'GOJIRA', isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };

async function renderBlock(status: InterestStatus) {
  await render(
    <ArtistBlock
      item={artistBlockModel({ event: EVENT, artist: ARTIST, dayStart: at('06:00'), status, categoryColor: 'rgb(255, 0, 0)', labelRepeat: 400, subRow: 0, overlaps: undefined, abutsNext: false })}
      onPress={jest.fn()}
    />,
  );
}

const box = () => StyleSheet.flatten(screen.getByTestId('block-box').props.style);
const label = () => StyleSheet.flatten(screen.getByTestId('block-label').props.style);
const edges = () => screen.queryAllByTestId(/^left-edge-(solid|dotted)$/).map((n) => n.props.testID as string);

it('draws a Must-see filled, with a solid 3 pt left edge in the stage\'s brighter colour', async () => {
  await renderBlock('will_go');
  expect(box().backgroundColor).toBe('rgb(78, 30, 30)');
  expect(box().borderLeftWidth ?? 0).toBe(0);
  expect(edges()).toEqual(['left-edge-solid']);
  expect(StyleSheet.flatten(screen.getByTestId('left-edge-solid').props.style)).toMatchObject({ width: 3, backgroundColor: 'rgb(158, 30, 30)' });
  expect(label().opacity).toBe(1);
});

it('draws a Maybe filled, with a dotted left edge the block\'s height, in the stage\'s brighter colour', async () => {
  await renderBlock('maybe');
  expect(box().backgroundColor).toBe('rgb(78, 30, 30)');
  expect(edges()).toEqual(['left-edge-dotted']);
  // 68 tall: 11 dots, (68 − 63) / 2 = 2.5, down to 2.
  expect(screen.getByTestId('left-edge-dotted').props.height).toBe(68);
  const dots = screen.getByTestId('left-edge-dots');
  expect(dots.props.d).toMatch(/^M0 2h3v3h-3z/);
  expect(dots.props.d).toMatch(/M0 62h3v3h-3z$/);
  expect(dots.props.fill).toEqual({ type: 0, payload: processColor('rgb(158, 30, 30)') });
});

it('draws an unpicked set filled, with no left edge and no border', async () => {
  await renderBlock('none');
  expect(box().backgroundColor).toBe('rgb(78, 30, 30)');
  expect(box().borderLeftWidth ?? 0).toBe(0);
  expect(box().borderWidth ?? 0).toBe(0);
  expect(edges()).toEqual([]);
  expect(label().opacity).toBe(1);
});

it('keeps the label in the same place with or without an edge', async () => {
  await renderBlock('none');
  const unpicked = box().paddingLeft;
  await renderBlock('will_go');
  expect(box().paddingLeft).toBe(unpicked);
  // The 3 pt edge and the 8 pt padding.
  expect(unpicked).toBe(11);
});

it('draws a "don\'t go" unfilled, in a dotted grey 1 pt frame all round with no stage colour, its text at 30 %', async () => {
  await renderBlock('dont_go');
  // The same width on every side: Android draws a dotted border only then.
  expect(box()).toMatchObject({
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dotted',
    borderColor: '#4d4d4d',
  });
  expect(box().borderLeftWidth ?? 1).toBe(1);
  expect(edges()).toEqual([]);
  expect(label().opacity).toBe(0.3);
});
