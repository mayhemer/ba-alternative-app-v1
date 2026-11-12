import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SearchResultRow } from './SearchResultRow';
import { searchResultRowModel } from './SearchResultRow.model';
import { colors } from '../../styling/tokens';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── A search result row, as drawn ─────────────────────────────────────────────
//
// Dimensions: pressed or not; a widening tag or none. What the row shows is its model's
// (SearchResultRow.model.ts, tested there); this is how it is drawn: no fill of
// its own and nothing left of the text, the name in the regular weight.

const at = (iso: string): number => Date.parse(`${iso}+02:00`);
const GOJIRA: DbArtist = { slug: 't', artistId: 'gojira', name: 'GOJIRA', isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
const SET: DbEvent = { slug: 't', eventId: 'gojira-1', artistId: 'gojira', stageId: 's1', categoryId: 'c1', dateFrom: at('2025-08-07T21:50:00'), dateTo: at('2025-08-07T23:10:00') };

async function renderRow(tag: string | null = null) {
  await render(
    <SearchResultRow
      item={searchResultRowModel({ hit: { artist: GOJIRA, event: SET, match: { rank: 0, start: 1, end: 3 } }, status: 'will_go', stage: undefined, tag })}
      onPress={jest.fn()}
    />,
  );
}

const row = () => screen.getByTestId('search-row-gojira-1');
const style = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) ?? {};

it('has no fill of its own, so the list shows through, and fills while pressed', async () => {
  await renderRow();
  expect(style(row()).backgroundColor).toBeUndefined();
  await fireEvent(row(), 'pressIn');
  expect(style(row()).backgroundColor).toBe(colors.surfacePressed);
  await fireEvent(row(), 'pressOut');
  expect(style(row()).backgroundColor).toBeUndefined();
});

it('starts with the text, 14 from the row\'s edge, with no bar before it', async () => {
  await renderRow();
  const first = row().children[0] as unknown as { props: { style?: unknown } };
  expect(style(first).paddingLeft).toBe(14);
  expect(screen.getByText('GOJIRA')).toBeTruthy();
});

it('writes the name in the regular weight, its matched part too, in the accent colour', async () => {
  await renderRow();
  expect(style(screen.getByText('GOJIRA')).fontFamily).toBe('Regular-Default');
  const match = style(screen.getByText('OJ'));
  expect(match.fontFamily).toBe('Regular-Default');
  expect(match.color).toBe(colors.accent);
});

it('writes the widening tag in blue, with no frame around it', async () => {
  await renderRow('Filter → All sets');
  const tag = style(screen.getByText('Filter → All sets'));
  expect(tag.color).toBe(colors.breakBlue);
  expect(tag.borderWidth ?? 0).toBe(0);
  expect(tag.paddingHorizontal ?? 0).toBe(0);
});
