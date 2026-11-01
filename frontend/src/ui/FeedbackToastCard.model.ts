import type { FeedbackMessage, FeedbackVariant } from '../shell/ScreenUIContext';

// ── What the feedback toast's card shows ──────────────────────────────────────

export type FeedbackToastModel = { content: { text: string; icon: FeedbackVariant }; tappable: boolean };

export function feedbackToastModel(feedback: FeedbackMessage): FeedbackToastModel {
  return {
    content: { text: feedback.text, icon: feedback.variant },
    tappable: feedback.variant !== 'progress',
  };
}
