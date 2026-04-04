import type { ScreenEllipse } from './projection'

export interface ScreenCircle {
  readonly kind: 'circle'
  readonly cx: number
  readonly cy: number
  readonly r: number
}

export interface ScreenEllipseObstacle extends ScreenEllipse {
  readonly kind: 'ellipse'
}

export type Obstacle = ScreenCircle | ScreenEllipseObstacle

/**
 * Returns the half-width of a circle's chord at a given screen y.
 * Returns 0 if y is outside the circle's vertical span.
 */
export function circleIntrusionAtY(circle: ScreenCircle, y: number): number {
  const dy = y - circle.cy
  if (Math.abs(dy) > circle.r) return 0
  return Math.sqrt(circle.r ** 2 - dy ** 2)
}

/**
 * Returns the half-width of an ellipse's chord at a given screen y.
 * Returns 0 if y is outside the ellipse's vertical span.
 */
export function ellipseIntrusionAtY(ellipse: ScreenEllipse, y: number): number {
  const dy = y - ellipse.cy
  if (Math.abs(dy) > ellipse.ry) return 0
  return ellipse.rx * Math.sqrt(1 - (dy / ellipse.ry) ** 2)
}

export interface Interval {
  left: number
  right: number
}

/**
 * Compute the horizontal interval a circle blocks within a line band [bandTop, bandBottom].
 * Samples top, middle, and bottom of the band, taking the widest extent.
 * Returns null if the circle doesn't intersect the band at all.
 */
export function circleIntervalAtBand(
  circle: ScreenCircle,
  bandTop: number,
  bandBottom: number,
  padding: number,
): Interval | null {
  const sampleYs = [bandTop, (bandTop + bandBottom) / 2, bandBottom]
  let left = Infinity
  let right = -Infinity

  for (const y of sampleYs) {
    const dy = y - circle.cy
    if (Math.abs(dy) >= circle.r) continue
    const halfChord = Math.sqrt(circle.r ** 2 - dy ** 2)
    const chordLeft = circle.cx - halfChord
    const chordRight = circle.cx + halfChord
    if (chordLeft < left) left = chordLeft
    if (chordRight > right) right = chordRight
  }

  if (!Number.isFinite(left) || !Number.isFinite(right)) return null
  return { left: left - padding, right: right + padding }
}

/**
 * Returns the maximum horizontal intrusion of all obstacles at a given screen y.
 * Subtract this from the text column's maxWidth for that line.
 */
export function maxIntrusionAtY(obstacles: Obstacle[], y: number): number {
  let max = 0
  for (const obs of obstacles) {
    const intrusion =
      obs.kind === 'circle'
        ? circleIntrusionAtY(obs, y)
        : ellipseIntrusionAtY(obs, y)
    if (intrusion > max) max = intrusion
  }
  return max
}
