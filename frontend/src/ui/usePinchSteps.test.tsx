import React from 'react';
import { View } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController, type GestureController } from 'react-native-gesture-handler/jest-utils';
import { usePinchSteps } from './usePinchSteps';
import type { PinchDirection } from './PinchStep.model';

// ── A pinch as steps, like a zoom ─────────────────────────────────────────────
//
// A step each time the scale passes 0.71× (in) or 1.41× (out) of where the last
// step was taken (the pinch's start for the first), at once, while the fingers
// are down. Dimensions: how far one gesture goes (short of a threshold, past
// one, past several, turning back), one update jumping far, a second gesture.

let steps: PinchDirection[] = [];
let focals: { x: number; y: number }[] = [];

function Subject() {
  const pinch = usePinchSteps((direction, focal) => { steps.push(direction); focals.push(focal); }, 'pinch');
  return (
    <GestureDetector gesture={pinch}>
      <View style={{ flex: 1 }} />
    </GestureDetector>
  );
}

type Controller = GestureController<{ scale: number; focalX: number; focalY: number }>;

async function start(): Promise<Controller> {
  const controller = createGestureController<{ scale: number; focalX: number; focalY: number }>('pinch');
  await act(async () => {
    controller.begin({ scale: 1 });
    controller.activate({ scale: 1 });
  });
  return controller;
}

async function move(controller: Controller, scale: number, focal = { x: 0, y: 0 }): Promise<void> {
  await act(async () => { controller.update({ scale, focalX: focal.x, focalY: focal.y }); });
}

async function lift(controller: Controller, scale: number): Promise<void> {
  await act(async () => { controller.end({ scale }); });
}

async function pinch(scales: number[]): Promise<void> {
  const controller = await start();
  for (const scale of scales) {
    await move(controller, scale);
  }
  await lift(controller, scales[scales.length - 1]);
}

beforeEach(async () => {
  steps = [];
  focals = [];
  await render(<GestureHandlerRootView style={{ flex: 1 }}><Subject /></GestureHandlerRootView>);
});

it('takes no step for a pinch short of either threshold', async () => {
  await pinch([0.95, 0.75, 1.1, 1.3]);
  expect(steps).toEqual([]);
});

it('steps while the fingers are still down', async () => {
  const controller = await start();
  await move(controller, 0.65);
  expect(steps).toEqual(['in']);
  await lift(controller, 0.65);
  expect(steps).toEqual(['in']);
});

it('steps again each time the pinch goes on a further 0.71× in', async () => {
  // 0.7 (from 1) · 0.49 past 0.71× of 0.7 (0.497) · 0.36 short of 0.71× of
  // 0.49 (0.3479) · 0.34 past it.
  await pinch([0.7, 0.49, 0.36, 0.34]);
  expect(steps).toEqual(['in', 'in', 'in']);
});

it('steps again each time the pinch goes on a further 1.41× out', async () => {
  // 1.45 (from 1) · 2 short of 1.41× of 1.45 (2.0445) · 2.05 past it · 2.9 past
  // 1.41× of 2.05 (2.8905).
  await pinch([1.45, 2, 2.05, 2.9]);
  expect(steps).toEqual(['out', 'out', 'out']);
});

it('steps back when the pinch turns', async () => {
  // In at 0.6, then out at 0.85 (1.41× of 0.6 is 0.846), then in again at 0.6.
  await pinch([0.6, 0.8, 0.85, 0.6]);
  expect(steps).toEqual(['in', 'out', 'in']);
});

it('takes one step for an update that jumps past several thresholds', async () => {
  await pinch([0.3]);
  expect(steps).toEqual(['in']);
});

it('starts the next pinch from its own start', async () => {
  await pinch([0.6]);
  // From 1 again: 0.75 is short of 0.71.
  await pinch([0.75]);
  await pinch([1.5]);
  expect(steps).toEqual(['in', 'out']);
});

it("passes the pinch's centre at each step, in the view's coordinates", async () => {
  const controller = await start();
  await move(controller, 0.6, { x: 120, y: 340 });
  await move(controller, 0.4, { x: 125, y: 300 });
  await lift(controller, 0.4);
  expect(focals).toEqual([{ x: 120, y: 340 }, { x: 125, y: 300 }]);
});
