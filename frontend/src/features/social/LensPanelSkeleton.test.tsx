import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { LensPanelSkeletonView } from './LensPanelSkeleton';
import { lensPanelModel } from './LensPanel.model';
import { myScheduleShareModel } from './MyScheduleShare.model';
import { colors } from '../../styling/tokens';

// ── The lens panel's preview, pulled down from the top of a list ──────────────
//
// The panel itself, as a mock: the same card, rows and texts, laid out by the
// panel's own elements (LensScopeRow, MyScheduleShareView), every text and icon
// in the mock's grey (colors.skeleton), a friend's avatar a disc. Armed or
// not, the card looks the same for now.
//
// Dimensions: the sources (my two, a followed friend); the session (signed out;
// signed in, with a share or not); armed or not.

const FRIENDS = [{ token: 'eva', label: 'Eva' }];

type Inputs = { friends?: typeof FRIENDS; isLoggedIn?: boolean; hasShare?: boolean; armed?: boolean };

async function renderSkeleton({ friends = [], isLoggedIn = false, hasShare = false, armed = false }: Inputs = {}) {
  const { rows } = lensPanelModel({ scope: { kind: 'all' }, friends, pendingRemove: null });
  await render(<LensPanelSkeletonView rows={rows} share={myScheduleShareModel({ isLoggedIn, hasShare })} armed={armed} />);
}

const grey = (text: string): boolean => StyleSheet.flatten(screen.getByText(text).props.style).color === colors.skeleton;
const cardBorder = () => StyleSheet.flatten(screen.getByTestId('lens-panel-skeleton').props.style).borderColor;

it('shows the panel\'s texts in grey: Show, my two sources, My schedule and the sign-in line', async () => {
  await renderSkeleton();
  for (const text of ['Show', 'Everything', 'My picks', 'My schedule', 'Sign in', ' to share your schedule.']) {
    expect(grey(text)).toBe(true);
  }
  expect(screen.queryAllByTestId('skeleton-avatar')).toHaveLength(0);
});

it('adds a followed friend\'s row, with a disc for the avatar', async () => {
  await renderSkeleton({ friends: FRIENDS });
  expect(grey('Eva')).toBe(true);
  expect(screen.getAllByTestId('skeleton-avatar')).toHaveLength(1);
});

it('signed in with no share, ends with the share row', async () => {
  await renderSkeleton({ isLoggedIn: true });
  expect(grey('Share my schedule')).toBe(true);
  expect(screen.queryByText('Copy link')).toBeNull();
  expect(screen.queryByText('Sign in')).toBeNull();
});

it('signed in with a share, ends with Share again, Copy link and Revoke', async () => {
  await renderSkeleton({ isLoggedIn: true, hasShare: true });
  expect(grey('Share again')).toBe(true);
  expect(grey('Copy link')).toBe(true);
  expect(grey('Revoke')).toBe(true);
});

it('outlines the card in the mock\'s grey, armed too', async () => {
  await renderSkeleton();
  expect(cardBorder()).toBe(colors.skeleton);
  await renderSkeleton({ armed: true });
  expect(cardBorder()).toBe(colors.skeleton);
});
