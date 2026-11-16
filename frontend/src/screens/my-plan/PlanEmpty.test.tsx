import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanEmpty } from './PlanEmpty';
import { planEmptyModel, type PlanEmptyAction } from './PlanEmpty.model';
import { colors } from '../../styling/tokens';

// ── An empty day ──────────────────────────────────────────────────────────────
//
// Dimension: the filter. All sets and Only conflicts say it in one sentence;
// the two filters of picks say nothing is picked, that the filter is why (a
// line of its own), and link the ways out on the next line: the artist list,
// and the filter panel, its glyph drawn as the top bar's filter button draws
// it. Centred.

const SENTENCE = 'The filter shows only your picks. Pick artists, or change the filter';

describe('planEmptyModel', () => {
  it('says nothing is planned, or with only conflicts shown, that there are none', () => {
    expect(planEmptyModel('all').text).toBe('Nothing planned for this day');
    expect(planEmptyModel('conflicts').text).toBe('No conflicts on this day');
  });

  it('under All sets and Only conflicts: no title, no intro line and no links', () => {
    for (const level of ['all', 'conflicts'] as const) {
      const model = planEmptyModel(level);
      expect(model.title).toBeNull();
      expect(model.intro).toBeNull();
      expect(model.parts).toEqual([{ text: model.text, action: null, glyph: null }]);
    }
  });

  it('under a filter of picks: says nothing is picked, and links the artist list and the filter, with its glyph', () => {
    expect(planEmptyModel('must')).toMatchObject({
      title: 'Nothing picked for this day',
      intro: 'The filter shows only your picks.',
      text: SENTENCE,
      parts: [
        { text: 'Pick artists', action: 'artists', glyph: null },
        { text: ', or ', action: null, glyph: null },
        { text: 'change the filter', action: 'filter', glyph: { icon: 'star', color: colors.accent } },
      ],
    });
    expect(planEmptyModel('maybe').parts[2].glyph).toEqual({ icon: 'star-half', color: colors.accent });
    expect(planEmptyModel('maybe').title).toBe('Nothing picked for this day');
  });

  it('under a filter of picks: taller than a plain empty day, to hold the title and the sentence', () => {
    expect(planEmptyModel('all').height).toBe(90);
    expect(planEmptyModel('must').height).toBe(150);
  });
});

describe('PlanEmpty', () => {
  it('shows its model\'s text, centred', async () => {
    await render(<PlanEmpty item={planEmptyModel('conflicts')} onAction={() => undefined} />);
    expect(screen.getByText('No conflicts on this day')).toHaveStyle({ textAlign: 'center' });
  });

  it('under a filter of picks: the intro is a line of its own, the links start the next one, all centred', async () => {
    await render(<PlanEmpty item={planEmptyModel('must')} onAction={() => undefined} />);
    expect(screen.getByText('Nothing picked for this day')).toHaveStyle({ textAlign: 'center' });
    expect(screen.getByText('The filter shows only your picks.')).toHaveStyle({ textAlign: 'center' });
    expect(screen.getByText('Pick artists, or change the filter', { exact: false })).toHaveStyle({ textAlign: 'center' });
  });

  it('under a filter of picks: shows the title and the filter glyph, and each link reports its action', async () => {
    const actions: PlanEmptyAction[] = [];
    await render(<PlanEmpty item={planEmptyModel('maybe')} onAction={(a) => { actions.push(a); }} />);
    expect(screen.getByText('Nothing picked for this day')).toBeTruthy();
    // The filter button's glyph, then its dots, as the top bar draws them.
    expect(screen.getByTestId('plan-empty-glyph-star-half')).toHaveStyle({ color: colors.accent });
    expect(screen.getByTestId('plan-empty-glyph-dots')).toHaveStyle({ color: colors.textPrimary });
    await fireEvent.press(screen.getByRole('link', { name: 'Pick artists' }));
    await fireEvent.press(screen.getByRole('link', { name: 'change the filter' }));
    expect(actions).toEqual(['artists', 'filter']);
  });
});
