import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useJumpToTimeline } from './useJumpToTimeline';
import { useTimelineFilter } from '../screens/timeline/TimelineFilterContext';
import { FeatureProviders } from '../../tests/setup/PerfProviders';
import type { DbEvent } from '../types/backend';

// ── A jump names the set it lands on ──────────────────────────────────────────
//
// The scroll-to request carries the set's id, so the timeline can highlight the
// set it lands on; a scroll to now names none, so it never highlights.

jest.mock('../store/AppContext', () => {
  const actual = jest.requireActual('../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'jumptest' };
});

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: false, isRestoringSession: false, userId: null, email: null, name: null, getAccessToken: async () => null, signIn: async () => undefined, signOut: async () => undefined }),
}));

const event: DbEvent = {
  slug: 'jumptest', eventId: 'gojira-1', artistId: 'gojira', stageId: 's1', categoryId: 'c1',
  dateFrom: Date.parse('2025-08-07T21:50:00+02:00'), dateTo: Date.parse('2025-08-07T23:10:00+02:00'),
};

let jump: ReturnType<typeof useJumpToTimeline>;
let filter: ReturnType<typeof useTimelineFilter>;

function Probe() {
  jump = useJumpToTimeline();
  filter = useTimelineFilter();
  return null;
}

it('carries the set\'s id with a jump to it', async () => {
  await render(<FeatureProviders><Probe /></FeatureProviders>);
  await act(async () => { jump(event, { support: true, day: 0 }); });
  expect(filter.scrollToTimeSignal).toMatchObject({ screenKey: 'support', eventId: 'gojira-1', categoryId: 'c1' });
});

it('names no set for a scroll to now', async () => {
  await render(<FeatureProviders><Probe /></FeatureProviders>);
  await act(async () => { filter.requestScrollToNow('timeline'); });
  expect(filter.scrollToTimeSignal.eventId).toBeUndefined();
});
