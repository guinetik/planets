import { describe, it, expect } from 'vitest'
import {
  circleIntrusionAtY,
  ellipseIntrusionAtY,
  maxIntrusionAtY,
  circleIntervalAtBand,
  carveTextLineSlots,
  type ScreenCircle,
  type ScreenEllipseObstacle,
  type Obstacle,
  type Interval,
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
  const ellipse: ScreenEllipseObstacle = { kind: 'ellipse', cx: 800, cy: 300, rx: 150, ry: 80 }

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

describe('circleIntervalAtBand', () => {
  const circle: ScreenCircle = { kind: 'circle', cx: 500, cy: 400, r: 100 }

  it('returns null when band is entirely above the circle', () => {
    expect(circleIntervalAtBand(circle, 100, 120, 0)).toBeNull()
  })

  it('returns null when band is entirely below the circle', () => {
    expect(circleIntervalAtBand(circle, 600, 620, 0)).toBeNull()
  })

  it('returns full diameter interval at the equator', () => {
    const result = circleIntervalAtBand(circle, 395, 405, 0)
    expect(result).not.toBeNull()
    expect(result!.left).toBeCloseTo(400, 0)
    expect(result!.right).toBeCloseTo(600, 0)
  })

  it('returns narrower interval near the top of the circle', () => {
    const result = circleIntervalAtBand(circle, 310, 320, 0)
    expect(result).not.toBeNull()
    // widest sample at y=320: dy=-80, halfChord=60, width=120; well below full diameter (200)
    expect(result!.right - result!.left).toBeLessThan(121)
    expect(result!.right - result!.left).toBeGreaterThan(80)
  })

  it('applies padding to expand the interval', () => {
    const withoutPad = circleIntervalAtBand(circle, 395, 405, 0)!
    const withPad = circleIntervalAtBand(circle, 395, 405, 20)!
    expect(withPad.left).toBeCloseTo(withoutPad.left - 20, 0)
    expect(withPad.right).toBeCloseTo(withoutPad.right + 20, 0)
  })

  it('returns interval when band partially overlaps circle top', () => {
    const result = circleIntervalAtBand(circle, 295, 310, 0)
    expect(result).not.toBeNull()
    expect(result!.left).toBeLessThan(500)
    expect(result!.right).toBeGreaterThan(500)
  })
})

describe('carveTextLineSlots', () => {
  it('returns the full base when there are no blocked intervals', () => {
    const base: Interval = { left: 0, right: 800 }
    const result = carveTextLineSlots(base, [])
    expect(result).toEqual([{ left: 0, right: 800 }])
  })

  it('carves a single blocked interval from the middle', () => {
    const base: Interval = { left: 0, right: 800 }
    const blocked: Interval[] = [{ left: 300, right: 500 }]
    const result = carveTextLineSlots(base, blocked)
    expect(result).toEqual([
      { left: 0, right: 300 },
      { left: 500, right: 800 },
    ])
  })

  it('carves blocked interval from the right edge', () => {
    const base: Interval = { left: 0, right: 800 }
    const blocked: Interval[] = [{ left: 600, right: 900 }]
    const result = carveTextLineSlots(base, blocked)
    expect(result).toEqual([{ left: 0, right: 600 }])
  })

  it('carves multiple blocked intervals', () => {
    const base: Interval = { left: 0, right: 1000 }
    const blocked: Interval[] = [
      { left: 200, right: 350 },
      { left: 600, right: 750 },
    ]
    const result = carveTextLineSlots(base, blocked)
    expect(result).toEqual([
      { left: 0, right: 200 },
      { left: 350, right: 600 },
      { left: 750, right: 1000 },
    ])
  })

  it('filters out slots narrower than minWidth', () => {
    const base: Interval = { left: 0, right: 800 }
    const blocked: Interval[] = [{ left: 20, right: 500 }]
    const result = carveTextLineSlots(base, blocked)
    expect(result).toEqual([{ left: 500, right: 800 }])
  })

  it('returns empty when everything is blocked', () => {
    const base: Interval = { left: 0, right: 100 }
    const blocked: Interval[] = [{ left: -10, right: 110 }]
    const result = carveTextLineSlots(base, blocked)
    expect(result).toEqual([])
  })

  it('handles blocked interval entirely outside base', () => {
    const base: Interval = { left: 100, right: 800 }
    const blocked: Interval[] = [{ left: 900, right: 1000 }]
    const result = carveTextLineSlots(base, blocked)
    expect(result).toEqual([{ left: 100, right: 800 }])
  })
})
