import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MyScheduleShareView } from './MyScheduleShare';
import { myScheduleShareModel } from './MyScheduleShare.model';

// ── "My schedule", drawn ──────────────────────────────────────────────────────
//
// The section both the lens panel and My plan's filter panel end with. Draws
// its model (MyScheduleShare.model.ts, tested there). Dimensions: signed in or
// out; a share made or not; a share or revoke in progress.

type Inputs = { isLoggedIn?: boolean; hasShare?: boolean; busy?: boolean };

async function renderSection({ isLoggedIn = true, hasShare = false, busy = false }: Inputs = {}) {
  const handlers = { onSignIn: jest.fn(), onShare: jest.fn(), onCopy: jest.fn(), onRevoke: jest.fn() };
  await render(<MyScheduleShareView item={myScheduleShareModel({ isLoggedIn, hasShare })} busy={busy} {...handlers} />);
  return handlers;
}

describe('MyScheduleShareView', () => {
  it('is headed "My schedule"', async () => {
    await renderSection();
    expect(screen.getByText('My schedule')).toBeTruthy();
  });

  it('asks to sign in while signed out, and offers no share', async () => {
    const { onSignIn } = await renderSection({ isLoggedIn: false });
    expect(screen.queryByText('Share my schedule')).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('shares, with no Copy or Revoke before a share exists', async () => {
    const { onShare } = await renderSection();
    await fireEvent.press(screen.getByText('Share my schedule'));
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Copy link')).toBeNull();
    expect(screen.queryByText('Revoke')).toBeNull();
  });

  it('once shared, shares again, copies and revokes', async () => {
    const { onShare, onCopy, onRevoke } = await renderSection({ hasShare: true });
    await fireEvent.press(screen.getByText('Share again'));
    await fireEvent.press(screen.getByText('Copy link'));
    await fireEvent.press(screen.getByText('Revoke'));
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onRevoke).toHaveBeenCalledTimes(1);
  });

  it('takes no second share while one is in progress', async () => {
    const { onShare } = await renderSection({ busy: true });
    await fireEvent.press(screen.getByText('Share my schedule'));
    expect(onShare).not.toHaveBeenCalled();
  });
});
