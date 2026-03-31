import { describe, it, expect } from 'vitest'
import {
  ndcToScreen,
  screenRadius,
  fitEllipseToNDCPoints,
  type NDCPoint,
  type Viewport,
} from './projection'

const viewport: Viewport = { width: 1000, height: 600 }

describe('ndcToScreen', () => {
  it('maps NDC (-1, 1) to top-left screen corner', () => {
    const p = ndcToScreen({ x: -1, y: 1 }, viewport)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
  })

  it('maps NDC (1, -1) to bottom-right screen corner', () => {
    const p = ndcToScreen({ x: 1, y: -1 }, viewport)
    expect(p.x).toBeCloseTo(1000)
    expect(p.y).toBeCloseTo(600)
  })

  it('maps NDC (0, 0) to screen center', () => {
    const p = ndcToScreen({ x: 0, y: 0 }, viewport)
    expect(p.x).toBeCloseTo(500)
    expect(p.y).toBeCloseTo(300)
  })
})

describe('screenRadius', () => {
  it('returns screen-pixel distance between center and edge NDC points', () => {
    // center at NDC (0,0) = screen (500,300)
    // edge at NDC (0.2,0) — moves 0.1 * 1000 = 100px right
    const center: NDCPoint = { x: 0, y: 0 }
    const edge: NDCPoint = { x: 0.2, y: 0 }
    const r = screenRadius(center, edge, viewport)
    expect(r).toBeCloseTo(100)
  })
})

describe('fitEllipseToNDCPoints', () => {
  it('returns bounding ellipse that contains all projected points', () => {
    const points: NDCPoint[] = [
      { x: -0.2, y: 0 },
      { x:  0.2, y: 0 },
      { x:  0,   y: -0.1 },
      { x:  0,   y:  0.1 },
    ]
    const ellipse = fitEllipseToNDCPoints(points, viewport)
    expect(ellipse.cx).toBeCloseTo(500)
    expect(ellipse.cy).toBeCloseTo(300)
    expect(ellipse.rx).toBeGreaterThanOrEqual(100)
    expect(ellipse.ry).toBeGreaterThanOrEqual(30)
  })
})
