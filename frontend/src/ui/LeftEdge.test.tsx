import React from 'react';
import { processColor, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { LeftEdge } from './LeftEdge';

// ── A row's left edge, as drawn ───────────────────────────────────────────────
//
// 3 pt wide, along the row's whole left side: solid, dotted (square dots where
// leftEdgeDots puts them), or nothing. The dimensions: each kind; the row height.

/** The grey #595959 as the SVG host gets it: processed for the platform (its ARGB number, signed on Android). */
const GREY = { type: 0, payload: processColor('#595959') };

it('draws a solid edge as a 3 pt bar the row\'s height, in the colour given', async () => {
  await render(<LeftEdge edge="solid" height={58} color="rgb(40, 50, 60)" />);
  const style = StyleSheet.flatten(screen.getByTestId('left-edge-solid').props.style);
  expect(style).toMatchObject({ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: 'rgb(40, 50, 60)' });
});

it('draws a dotted edge as 3 pt square dots, in the colour given', async () => {
  await render(<LeftEdge edge="dotted" height={26} color="#595959" />);
  expect(screen.getByTestId('left-edge-dotted')).toBeTruthy();
  const dots = screen.getByTestId('left-edge-dots');
  expect(dots.props.d).toBe('M0 2h3v3h-3zM0 8h3v3h-3zM0 14h3v3h-3zM0 20h3v3h-3z');
  expect(dots.props.fill).toEqual(GREY);
});

it('places the dots by the row\'s own height', async () => {
  await render(<LeftEdge edge="dotted" height={58} color="#595959" />);
  expect(screen.getByTestId('left-edge-dots').props.d).toBe('M0 3h3v3h-3zM0 9h3v3h-3zM0 15h3v3h-3zM0 21h3v3h-3zM0 27h3v3h-3zM0 33h3v3h-3zM0 39h3v3h-3zM0 45h3v3h-3zM0 51h3v3h-3z');
});

it('draws nothing for no edge', async () => {
  await render(<LeftEdge edge={null} height={58} color="#595959" />);
  expect(screen.queryByTestId(/^left-edge/)).toBeNull();
});
