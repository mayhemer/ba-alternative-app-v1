import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenUI } from './ScreenUIContext';
import { toastPlacement } from './FeedbackToast.model';
import { FeedbackToastCard } from '../ui/FeedbackToastCard';
import { feedbackToastModel } from '../ui/FeedbackToastCard.model';
import { useLayoutMode } from '../hooks/useLayoutMode';

// ── The feedback toast ────────────────────────────────────────────────────────
//
// Places the toast card (ui/FeedbackToastCard) under the top bar
// (FeedbackToast.model.ts). A message anchored to a section is drawn by that
// section instead (SectionFeedbackToast).

export function FeedbackToast() {
  const { state, dismissFeedback } = useScreenUI();
  const { feedback } = state;
  const insets = useSafeAreaInsets();
  const { width: screenWidth, isShort } = useLayoutMode();

  if (feedback === null) { return null; }
  const placement = toastPlacement(feedback.anchor, { screenWidth, insets, topBarShown: !isShort });
  const model = feedbackToastModel(feedback);

  switch (placement.kind) {
    case 'in-section':
      return null;

    case 'top':
      // The band's row pushes its one child to the right edge. That child is at
      // least centeredWidth wide and centres the toast in itself, so a toast that
      // fits sits centred on the screen; a wider one grows the child leftwards and
      // ends at the band's edge. No measuring, so no extra render.
      return (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: placement.top,
            left: placement.left,
            width: placement.width,
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <View
            pointerEvents="box-none"
            style={{ minWidth: placement.centeredWidth, maxWidth: placement.width, alignItems: 'center' }}
          >
            <FeedbackToastCard model={model} onDismiss={dismissFeedback} maxWidth={placement.width} />
          </View>
        </View>
      );
  }
}
