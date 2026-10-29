import { feedbackToastModel } from './FeedbackToast.model';

// ── The toast's content, as a model ───────────────────────────────────────────
//
// Where it goes (toastBand) is tested in FeedbackToast.test.tsx.

describe('feedbackToastModel', () => {
  it('shows the interest strip after a star tap, and cannot be tapped away while saving', () => {
    expect(feedbackToastModel({ text: 'Maybe', variant: 'progress', interest: 'maybe' }))
      .toEqual({ content: { kind: 'interest', status: 'maybe', failed: false }, tappable: false });
  });

  it('marks the strip when saving the star failed', () => {
    expect(feedbackToastModel({ text: 'Maybe', variant: 'warning', interest: 'maybe' }).content)
      .toEqual({ kind: 'interest', status: 'maybe', failed: true });
  });

  it('shows any other message with its icon, and can be tapped away once done', () => {
    expect(feedbackToastModel({ text: 'Link copied', variant: 'confirmation' }))
      .toEqual({ content: { kind: 'text', text: 'Link copied', icon: 'confirmation' }, tappable: true });
  });
});
