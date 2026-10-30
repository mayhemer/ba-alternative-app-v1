import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ArtistBlock } from './ArtistBlock';
import { artistBlockModel } from './ArtistBlock.model';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── A set's block, as drawn: muted or not ─────────────────────────────────────
//
// Dimension: muted (not the lens's pick under My picks or a friend's lens) or
// not. The component draws its model (ArtistBlock.model.ts, tested there).

const at = (hm: string): number => Date.parse(`2025-08-06T${hm}:00+02:00`);
const EVENT: DbEvent = { slug: 't', eventId: 'e1', artistId: 'a1', stageId: 's', categoryId: 'c', dateFrom: at('14:30'), dateTo: at('15:05') };
const ARTIST: DbArtist = { slug: 't', artistId: 'a1', name: 'GOJIRA', isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };

async function renderBlock(muted: boolean) {
  await render(
    <ArtistBlock
      item={artistBlockModel({ event: EVENT, artist: ARTIST, dayStart: at('06:00'), status: 'none', categoryColor: 'rgb(255, 0, 0)', labelRepeat: 400, subRow: 0, overlaps: undefined, muted })}
      onPress={jest.fn()}
    />,
  );
}

const box = () => StyleSheet.flatten(screen.getByTestId('block-box').props.style);
const label = () => StyleSheet.flatten(screen.getByTestId('block-label').props.style);

it('draws a muted block unfilled, in a dotted grey 1 pt frame all round with no stage colour, its text at 60 %', async () => {
  await renderBlock(true);
  // The same width on every side: Android draws a dotted border only then.
  expect(box()).toMatchObject({
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderLeftWidth: 1,
    borderStyle: 'dotted',
    borderColor: '#4d4d4d',
    borderLeftColor: '#4d4d4d',
  });
  expect(label().opacity).toBe(0.6);
});

it('draws an unmuted block filled, with only its left bar, its text at full strength', async () => {
  await renderBlock(false);
  expect(box()).toMatchObject({ backgroundColor: 'rgb(78, 30, 30)', borderLeftWidth: 3, borderLeftColor: 'rgb(158, 30, 30)' });
  expect(box().borderTopWidth ?? 0).toBe(0);
  expect(label().opacity).toBe(1);
});
