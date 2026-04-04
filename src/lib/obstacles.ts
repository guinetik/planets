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

const MIN_SLOT_WIDTH = 60

/**
 * Given a base horizontal interval and a set of blocked intervals,
 * return the remaining usable text slots. Discards slots narrower
 * than MIN_SLOT_WIDTH. Ported from Pretext's editorial-engine demo.
 */
export function carveTextLineSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots: Interval[] = [base]

  for (const block of blocked) {
    const next: Interval[] = []
    for (const slot of slots) {
      if (block.right <= slot.left || block.left >= slot.right) {
        next.push(slot)
        continue
      }
      if (block.left > slot.left) {
        next.push({ left: slot.left, right: block.left })
      }
      if (block.right < slot.right) {
        next.push({ left: block.right, right: slot.right })
      }
    }
    slots = next
  }

  return slots.filter(slot => slot.right - slot.left >= MIN_SLOT_WIDTH)
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
