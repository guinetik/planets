import { describe, it, expect } from 'vitest'
import {
  circleIntrusionAtY,
  ellipseIntrusionAtY,
  maxIntrusionAtY,
  type ScreenCircle,
  type ScreenEllipse,
  type Obstacle,
} from './obstacles'

describe('circleIntrusionAtY', () => {
  const circle: ScreenCircle = { kind: 'circle', cx: 800, cy: 300, r: 100 }

  it('returns 0 when y is above the circle', () => {
    expect(circleIntrusionAtY(circle, 100)).toBe(0)
  })

  it('returns 0 when y is below the circle', () => {
    expect(circleIntrusionAtY(circle, 500)).toBe(0)
  })

  it('returns full radius at the equator (y = cy)', () => {
    expect(circleIntrusionAtY(circle, 300)).toBeCloseTo(100)
  })

  it('returns correct chord half-width at arbitrary y', () => {
    // At y = 240: dy = 60, chord = sqrt(100²-60²) = sqrt(7500) ≈ 86.6
    expect(circleIntrusionAtY(circle, 240)).toBeCloseTo(Math.sqrt(100 ** 2 - 60 ** 2))
  })
})

describe('ellipseIntrusionAtY', () => {
  const ellipse: ScreenEllipse = { kind: 'ellipse', cx: 800, cy: 300, rx: 150, ry: 80 }

  it('returns 0 when y is outside the ellipse vertically', () => {
    expect(ellipseIntrusionAtY(ellipse, 100)).toBe(0)
  })

  it('returns rx at the center y', () => {
    expect(ellipseIntrusionAtY(ellipse, 300)).toBeCloseTo(150)
  })

  it('returns correct half-width at arbitrary y', () => {
    // At y = cy + ry/2 = 340: x_half = rx * sqrt(1 - (ry/2/ry)²) = 150 * sqrt(0.75) ≈ 129.9
    expect(ellipseIntrusionAtY(ellipse, 340)).toBeCloseTo(150 * Math.sqrt(0.75))
  })
})

describe('maxIntrusionAtY', () => {
  it('returns 0 for empty obstacles', () => {
    expect(maxIntrusionAtY([], 300)).toBe(0)
  })

  it('returns max of all obstacle intrusions at y', () => {
    const obstacles: Obstacle[] = [
      { kind: 'circle', cx: 800, cy: 300, r: 60 },
      { kind: 'circle', cx: 800, cy: 300, r: 100 },
    ]
    expect(maxIntrusionAtY(obstacles, 300)).toBeCloseTo(100)
  })

  it('handles mixed circle and ellipse obstacles', () => {
    const obstacles: Obstacle[] = [
      { kind: 'circle',  cx: 800, cy: 300, r: 60 },
      { kind: 'ellipse', cx: 800, cy: 300, rx: 90, ry: 50 },
    ]
    expect(maxIntrusionAtY(obstacles, 300)).toBeCloseTo(90)
  })
})
