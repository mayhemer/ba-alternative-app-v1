import React, { Profiler } from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { DrawerButton } from './DrawerButton';
import { colors } from '../styling/tokens';

// ── The hamburger's label follows the drawer ─────────────────────────────────
//
// Dimensions:
//   - drawer: closed, open;
//   - the navigation container: ready at mount, or ready later with a restored
//     state (the button renders above the navigator, before it is ready);
//   - a state change: one that opens or closes the drawer, one that only
//     switches screens.

type HistoryEntry = { type: 'route'; key: string } | { type: 'drawer'; status: 'open' };

const ROUTE: HistoryEntry = { type: 'route', key: 'ArtistList' };
const DRAWER: HistoryEntry = { type: 'drawer', status: 'open' };

const mockNav = {
  ready: true,
  history: [] as HistoryEntry[],
  listeners: new Map<string, Set<() => void>>(),
};

jest.mock('../navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => mockNav.ready,
    dispatch: () => undefined,
    getRootState: () => ({ history: mockNav.history }),
    addListener: (event: string, callback: () => void) => {
      const set = mockNav.listeners.get(event) ?? new Set<() => void>();
      set.add(callback);
      mockNav.listeners.set(event, set);
      return () => { set.delete(callback); };
    },
  },
}));

jest.mock('../hooks/useLayoutMode', () => ({
  useLayoutMode: () => ({ isWide: false }),
}));

/** The container announcing an event, with the history it now holds. */
async function emit(event: 'ready' | 'state', history: HistoryEntry[]): Promise<void> {
  await act(async () => {
    mockNav.history = history;
    mockNav.listeners.get(event)?.forEach((callback) => { callback(); });
  });
}

let commits: number;

async function renderButton(): Promise<void> {
  await render(
    <Profiler id="hamburger" onRender={() => { commits += 1; }}>
      <DrawerButton />
    </Profiler>,
  );
}

beforeEach(() => {
  mockNav.ready = true;
  mockNav.history = [ROUTE];
  mockNav.listeners.clear();
  commits = 0;
});

describe('DrawerButton label', () => {
  it('reads "Open menu" while the drawer is closed', async () => {
    await renderButton();
    expect(screen.getByLabelText('Open menu')).toBeTruthy();
  });

  it('reads "Close menu" while the drawer is open', async () => {
    mockNav.history = [ROUTE, DRAWER];
    await renderButton();
    expect(screen.getByLabelText('Close menu')).toBeTruthy();
  });

  it('follows the drawer as it opens and closes', async () => {
    await renderButton();

    await emit('state', [ROUTE, DRAWER]);
    expect(screen.getByLabelText('Close menu')).toBeTruthy();

    await emit('state', [ROUTE]);
    expect(screen.getByLabelText('Open menu')).toBeTruthy();
  });

  it('picks up a drawer restored open once the container is ready', async () => {
    mockNav.ready = false;
    mockNav.history = [];
    await renderButton();
    expect(screen.getByLabelText('Open menu')).toBeTruthy();

    mockNav.ready = true;
    await emit('ready', [ROUTE, DRAWER]);
    expect(screen.getByLabelText('Close menu')).toBeTruthy();
  });
});

// ── The hamburger shows the drawer open ──────────────────────────────────────
//
// While the drawer is open the hamburger is drawn open, as the lens and filter
// chips are for their panels: black on an accent background with rounded
// corners, reaching 4 pt past the icon without moving it.

type ButtonStyle = { backgroundColor?: unknown; borderRadius?: unknown; paddingHorizontal?: unknown; marginHorizontal?: unknown };

function buttonStyle(): ButtonStyle {
  return StyleSheet.flatten(screen.getByRole('button').props.style);
}

function iconColor(): unknown {
  return StyleSheet.flatten(screen.getByTestId('drawer-button-icon').props.style).color;
}

describe('DrawerButton look', () => {
  it('is black on an accent, rounded background while the drawer is open', async () => {
    mockNav.history = [ROUTE, DRAWER];
    await renderButton();
    expect(buttonStyle()).toMatchObject({ backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 4, marginHorizontal: -4 });
    expect(iconColor()).toBe(colors.black);
  });

  it('is a bare light icon in the same place while the drawer is closed', async () => {
    await renderButton();
    const style = buttonStyle();
    expect(style.backgroundColor ?? 'transparent').toBe('transparent');
    expect(style).toMatchObject({ paddingHorizontal: 4, marginHorizontal: -4 });
    expect(iconColor()).toBe('#f0f0f0');
  });
});

describe('DrawerButton renders', () => {
  it('a screen switch with the drawer closed does not re-render it', async () => {
    await renderButton();
    const afterMount = commits;

    await emit('state', [{ type: 'route', key: 'Timeline' }]);

    expect(commits).toBe(afterMount);
  });

  it('opening the drawer re-renders it once', async () => {
    await renderButton();
    const afterMount = commits;

    await emit('state', [ROUTE, DRAWER]);

    expect(commits).toBe(afterMount + 1);
  });
});
