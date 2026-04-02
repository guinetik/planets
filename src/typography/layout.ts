// src/typography/layout.ts
import { prepareWithSegments, layoutNextLine, type LayoutCursor } from '@chenglou/pretext'
import type { Obstacle, ScreenCircle } from '@/lib/obstacles'
import {
  proseFont,
  proseLineHeight,
  textColumnLeftPx,
} from '@/lib/constants'

export interface LayoutLine {
  text: string
  width: number
  availableWidth: number  // max width at this line's Y — used for right-alignment
}

const MIN_LINE_WIDTH = 60  // never collapse lines below this

/**
 * Computes available text width at a given y, accounting for obstacle
 * screen positions relative to the text column.
 */
function availableWidthAtY(
  obstacles: Obstacle[],
  y: number,
  leftX: number,
  baseWidth: number,
): number {
  const rightEdge = leftX + baseWidth
  let minRightBound = rightEdge

  for (const obs of obstacles) {
    let hw: number
    if (obs.kind === 'circle') {
      const dy = y - obs.cy
      if (Math.abs(dy) > obs.r) continue
      hw = Math.sqrt(obs.r ** 2 - dy ** 2)
    } else {
      const dy = y - obs.cy
      if (Math.abs(dy) > obs.ry) continue
      hw = obs.rx * Math.sqrt(1 - (dy / obs.ry) ** 2)
    }

    const obsLeft = obs.cx - hw
    if (obsLeft > leftX && obsLeft < rightEdge) {
      minRightBound = Math.min(minRightBound, obsLeft)
    }
  }

  return Math.max(minRightBound - leftX, MIN_LINE_WIDTH)
}

// Cache prepared text — invalidates when prose or font changes
let _cachedProse = ''
let _cachedFont = ''
let _cachedPrepared: ReturnType<typeof prepareWithSegments> | null = null

function getPrepared(prose: string): ReturnType<typeof prepareWithSegments> {
  const font = proseFont()
  if (prose !== _cachedProse || font !== _cachedFont || !_cachedPrepared) {
    _cachedPrepared = prepareWithSegments(prose, font)
    _cachedProse = prose
    _cachedFont = font
  }
  return _cachedPrepared
}

/**
 * Lays out prose text into lines, with maxWidth per line reduced by
 * screen-space obstacles at that line's vertical position.
 */
export function layoutProseWithObstacles(
  prose: string,
  topY: number,
  obstacles: Obstacle[],
  columnWidth?: number,
): LayoutLine[] {
  const leftX = textColumnLeftPx()
  const baseWidth = columnWidth || (typeof window !== 'undefined' ? window.innerWidth - leftX * 2 : 800)
  const prepared = getPrepared(prose)
  const lineH = proseLineHeight()

  const lines: LayoutLine[] = []
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineIndex = 0

  while (true) {
    const lineY = topY + lineIndex * lineH
    const maxWidth = availableWidthAtY(obstacles, lineY, leftX, baseWidth)

    const result = layoutNextLine(prepared, cursor, maxWidth)
    if (result === null) break

    lines.push({ text: result.text, width: result.width, availableWidth: maxWidth })
    cursor = result.end
    lineIndex++
  }

  return lines
}

export interface CurveLayoutConfig {
  planet: ScreenCircle
  padding: number
  leftX: number
  moons?: ScreenCircle[]
  moonPadding?: number
  verticalBias?: number
}

export interface CurveLayoutResult {
  lines: LayoutLine[]
  startY: number
  fontSize: number
  lineHeight: number
}

/**
 * Helper: compute per-line maxWidth for a given startY against the planet circle.
 * Returns null for lines that are too narrow or outside the circle.
 */
function curveWidthAtLine(
  lineIndex: number,
  startY: number,
  lineH: number,
  planet: ScreenCircle,
  padding: number,
  leftX: number,
  moons?: ScreenCircle[],
  moonPadding?: number,
): number | null {
  const lineY = startY + lineIndex * lineH
  const dy = lineY - planet.cy
  if (Math.abs(dy) > planet.r) return null
  const planetLeftAtY = planet.cx - Math.sqrt(planet.r ** 2 - dy ** 2)
  let rightBound = planetLeftAtY - padding

  // Check if any moon further narrows the line at this Y
  if (moons) {
    const mPad = moonPadding ?? padding * 0.5
    for (const moon of moons) {
      const mdy = lineY - moon.cy
      if (Math.abs(mdy) > moon.r) continue
      const moonLeftAtY = moon.cx - Math.sqrt(moon.r ** 2 - mdy ** 2)
      rightBound = Math.min(rightBound, moonLeftAtY - mPad)
    }
  }

  const maxWidth = rightBound - leftX
  return maxWidth >= MIN_LINE_WIDTH ? maxWidth : null
}

/**
 * Lays out prose text alongside a planet's projected screen circle.
 * Text is vertically centered on the planet. Each line's right edge
 * follows the planet's curvature.
 *
 * Two-pass: first counts lines from the top to measure total text height,
 * then re-lays out from a centered startY.
 */
export function layoutProseAlongCurve(
  prose: string,
  config: CurveLayoutConfig,
): CurveLayoutResult {
  const { planet, padding, leftX, moons, moonPadding, verticalBias = 0 } = config
  const prepared = getPrepared(prose)
  const lineH = proseLineHeight()
  const fontSize = parseFloat(proseFont())

  // Pass 1: lay out from top of circle to count lines (ignoring moons — they're transient)
  const topStartY = planet.cy - planet.r
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineCount = 0
  let lineIndex = 0

  while (true) {
    const maxWidth = curveWidthAtLine(lineIndex, topStartY, lineH, planet, padding, leftX)
    if (maxWidth === null) {
      if (topStartY + lineIndex * lineH > planet.cy) break
      lineIndex++
      continue
    }
    const result = layoutNextLine(prepared, cursor, maxWidth)
    if (result === null) break
    cursor = result.end
    lineCount++
    lineIndex++
  }

  // Pass 2: lay out centered on the planet, with optional vertical bias
  // (e.g. ringed planets shift text upward to avoid ring crossing zone)
  const textHeight = lineCount * lineH
  const startY = planet.cy - textHeight / 2 + verticalBias

  cursor = { segmentIndex: 0, graphemeIndex: 0 }
  const lines: LayoutLine[] = []
  lineIndex = 0

  while (true) {
    const maxWidth = curveWidthAtLine(lineIndex, startY, lineH, planet, padding, leftX, moons, moonPadding)
    if (maxWidth === null) {
      if (startY + lineIndex * lineH > planet.cy + planet.r) break
      lineIndex++
      continue
    }
    const result = layoutNextLine(prepared, cursor, maxWidth)
    if (result === null) break
    lines.push({ text: result.text, width: result.width, availableWidth: maxWidth })
    cursor = result.end
    lineIndex++
  }

  return { lines, startY, fontSize, lineHeight: lineH }
}
