export interface NDCPoint {
  readonly x: number
  readonly y: number
}

export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

export interface Viewport {
  readonly width: number
  readonly height: number
}

export interface ScreenEllipse {
  readonly cx: number
  readonly cy: number
  readonly rx: number
  readonly ry: number
}

/**
 * Converts a WebGL NDC point to screen pixel coordinates.
 * NDC: x in [-1,1] left→right, y in [-1,1] bottom→top.
 * Screen: x in [0,width] left→right, y in [0,height] top→bottom.
 */
export function ndcToScreen(ndc: NDCPoint, viewport: Viewport): ScreenPoint {
  return {
    x: (ndc.x + 1) / 2 * viewport.width,
    y: (-ndc.y + 1) / 2 * viewport.height,
  }
}

/**
 * Returns the screen-pixel distance between a projected center and edge NDC point.
 * Use this to convert a world-space sphere radius into screen pixels.
 */
export function screenRadius(centerNDC: NDCPoint, edgeNDC: NDCPoint, viewport: Viewport): number {
  const c = ndcToScreen(centerNDC, viewport)
  const e = ndcToScreen(edgeNDC, viewport)
  return Math.sqrt((e.x - c.x) ** 2 + (e.y - c.y) ** 2)
}

/**
 * Fits a bounding ellipse to a set of NDC points.
 * Used to find the screen-space bounding ellipse of Saturn's projected ring torus.
 */
export function fitEllipseToNDCPoints(points: NDCPoint[], viewport: Viewport): ScreenEllipse {
  const screen = points.map(p => ndcToScreen(p, viewport))
  const xs = screen.map(p => p.x)
  const ys = screen.map(p => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: (maxX - minX) / 2,
    ry: (maxY - minY) / 2,
  }
}
