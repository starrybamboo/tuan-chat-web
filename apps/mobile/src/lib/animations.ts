import type { WithSpringConfig } from "react-native-reanimated";

export const SPRING_CONFIG: WithSpringConfig = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

export const SPRING_SNAPPY: WithSpringConfig = {
  damping: 28,
  stiffness: 300,
  mass: 0.6,
};

export function snapPoint(
  value: number,
  velocity: number,
  points: readonly number[],
): number {
  "worklet";
  const point = value + 0.2 * velocity;
  const deltas = points.map(p => Math.abs(point - p));
  const minDelta = Math.min(...deltas);
  return points[deltas.indexOf(minDelta)];
}

export function clamp(value: number, min: number, max: number): number {
  "worklet";
  return Math.min(Math.max(value, min), max);
}
