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
  offsetX?: number        // per-line horizontal offset from block's leftX (used by circular layout)
  centered?: boolean      // if true, text is centered within availableWidth
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

export interface CircleLayoutConfig {
  cx: number
  cy: number
  r: number
  padding: number       // inset from circle edge
  fontSizePx: number    // explicit font size for mobile
  lineHeightPx: number
  moons?: ScreenCircle[]
  moonPadding?: number
}

/**
 * Compute the available width inside the planet circle at a given Y,
 * subtracting any moon intrusions. Returns the left edge, right edge,
 * and width of the widest clear span, or null if too narrow.
 */
function circleChordAtY(
  y: number,
  cx: number,
  cy: number,
  insetR: number,
  moons?: ScreenCircle[],
  moonPadding?: number,
): { left: number; right: number; width: number } | null {
  const dy = y - cy
  if (Math.abs(dy) >= insetR) return null
  const halfChord = Math.sqrt(insetR ** 2 - dy ** 2)
  let left = cx - halfChord
  let right = cx + halfChord

  if (moons) {
    const mPad = moonPadding ?? 0
    for (const moon of moons) {
      const mdy = y - moon.cy
      if (Math.abs(mdy) >= moon.r + mPad) continue
      const effectiveR = moon.r + mPad
      if (Math.abs(mdy) >= effectiveR) continue
      const moonHalf = Math.sqrt(effectiveR ** 2 - mdy ** 2)
      const moonLeft = moon.cx - moonHalf
      const moonRight = moon.cx + moonHalf

      // Moon must overlap our chord
      if (moonRight <= left || moonLeft >= right) continue

      // Pick the wider remaining segment (left of moon vs right of moon)
      const leftSegment = Math.max(0, Math.min(moonLeft, right) - left)
      const rightSegment = Math.max(0, right - Math.max(moonRight, left))

      if (leftSegment >= rightSegment) {
        right = Math.min(moonLeft, right)
      } else {
        left = Math.max(moonRight, left)
      }
    }
  }

  const width = right - left
  return width >= MIN_LINE_WIDTH ? { left, right, width } : null
}

/**
 * Lays out prose text INSIDE a circle — each line's width is the chord
 * at that Y minus padding. Text is centered within each chord.
 * Moons carve gaps: lines narrow or shift to avoid moon silhouettes.
 * Two-pass: measure line count, then center vertically.
 */
export function layoutProseInsideCircle(
  prose: string,
  config: CircleLayoutConfig,
): CurveLayoutResult {
  const { cx, cy, r, padding, fontSizePx, lineHeightPx, moons, moonPadding } = config
  const font = `${fontSizePx}px Georgia, serif`
  const prepared = prepareWithSegments(prose, font)
  const insetR = r - padding

  if (insetR < MIN_LINE_WIDTH / 2) {
    return { lines: [], startY: cy, fontSize: fontSizePx, lineHeight: lineHeightPx }
  }

  // Pass 1: lay out from top to count lines (ignore moons — they're transient)
  const topY = cy - insetR
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineCount = 0
  let lineIndex = 0

  while (true) {
    const lineY = topY + lineIndex * lineHeightPx
    const chord = circleChordAtY(lineY, cx, cy, insetR)
    if (chord === null) {
      if (lineY > cy) break
      lineIndex++
      continue
    }
    if (chord.width < MIN_LINE_WIDTH) { lineIndex++; continue }
    const result = layoutNextLine(prepared, cursor, chord.width)
    if (result === null) break
    cursor = result.end
    lineCount++
    lineIndex++
  }

  // Pass 2: lay out centered vertically, with moon avoidance
  const textHeight = lineCount * lineHeightPx
  const startY = cy - textHeight / 2
  const blockLeftX = cx - insetR

  cursor = { segmentIndex: 0, graphemeIndex: 0 }
  const lines: LayoutLine[] = []
  lineIndex = 0

  while (true) {
    const lineY = startY + lineIndex * lineHeightPx
    const chord = circleChordAtY(lineY, cx, cy, insetR, moons, moonPadding)
    if (chord === null) {
      if (lineY > cy + insetR) break
      lineIndex++
      continue
    }
    if (chord.width < MIN_LINE_WIDTH) { lineIndex++; continue }
    const result = layoutNextLine(prepared, cursor, chord.width)
    if (result === null) break

    const offsetX = chord.left - blockLeftX

    lines.push({
      text: result.text,
      width: result.width,
      availableWidth: chord.width,
      offsetX,
      centered: true,
    })
    cursor = result.end
    lineIndex++
  }

  return { lines, startY, fontSize: fontSizePx, lineHeight: lineHeightPx }
}
