// src/typography/layout.ts
import { prepareWithSegments, layoutNextLine, type LayoutCursor } from '@chenglou/pretext'
import type { Obstacle, ScreenCircle } from '@/lib/obstacles'
import { circleIntervalAtBand, carveTextLineSlots, type Interval } from '@/lib/obstacles'
import {
  proseFont,
  proseLineHeight,
  textColumnLeftPx,
} from '@/lib/constants'

export interface LayoutFragment {
  text: string
  width: number        // actual measured text width
  slotLeft: number     // absolute screen X position
  slotWidth: number    // available width of this slot
}

export interface LayoutLine {
  fragments: LayoutFragment[]
  availableWidth: number   // total available width across all slots (for animation sizing)
  offsetX?: number         // per-line horizontal offset (used by circular mobile layout)
  centered?: boolean       // if true, text is centered within availableWidth
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

    lines.push({
      fragments: [{ text: result.text, width: result.width, slotLeft: leftX, slotWidth: maxWidth }],
      availableWidth: maxWidth,
    })
    cursor = result.end
    lineIndex++
  }

  return lines
}

export interface CurveLayoutConfig {
  planet: ScreenCircle
  padding: number
  leftX: number
  minStartY?: number
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
 * Compute blocked intervals at a given line band from planet + moons.
 * The planet blocks everything to the right of its left limb.
 * Each moon blocks its chord width at that Y.
 */
function blockedIntervalsAtBand(
  bandTop: number,
  bandBottom: number,
  planet: ScreenCircle,
  planetPadding: number,
  viewportRight: number,
  moons?: ScreenCircle[],
  moonPadding?: number,
): Interval[] {
  const blocked: Interval[] = []

  // Planet: block from its left limb (minus padding) to the right edge of screen
  const planetInterval = circleIntervalAtBand(planet, bandTop, bandBottom, 0)
  if (planetInterval) {
    blocked.push({ left: planetInterval.left - planetPadding, right: viewportRight })
  }

  // Moons: each blocks its chord width
  if (moons) {
    const mPad = moonPadding ?? 0
    for (const moon of moons) {
      const moonInterval = circleIntervalAtBand(moon, bandTop, bandBottom, mPad)
      if (moonInterval) {
        blocked.push(moonInterval)
      }
    }
  }

  return blocked
}

/**
 * Count lines in pass 1 (measuring pass) — uses planet only, no moons.
 * Returns the number of text lines that fit.
 */
function measurePass(
  prepared: ReturnType<typeof prepareWithSegments>,
  startY: number,
  lineH: number,
  planet: ScreenCircle,
  planetPadding: number,
  leftX: number,
  viewportRight: number,
): { lineCount: number } {
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineCount = 0
  let lineIndex = 0

  while (true) {
    const bandTop = startY + lineIndex * lineH
    const bandBottom = bandTop + lineH
    if (bandTop > planet.cy + planet.r) break

    const blocked = blockedIntervalsAtBand(bandTop, bandBottom, planet, planetPadding, viewportRight)
    const base: Interval = { left: leftX, right: viewportRight }
    const slots = carveTextLineSlots(base, blocked)

    if (slots.length === 0) {
      lineIndex++
      continue
    }

    // Use the widest slot for measuring
    let widest = slots[0]!
    for (let i = 1; i < slots.length; i++) {
      if (slots[i]!.right - slots[i]!.left > widest.right - widest.left) {
        widest = slots[i]!
      }
    }

    const result = layoutNextLine(prepared, cursor, widest.right - widest.left)
    if (result === null) break
    cursor = result.end
    lineCount++
    lineIndex++
  }

  return { lineCount }
}

/**
 * Lays out prose text alongside a planet's projected screen circle.
 * Text is vertically centered on the planet. Each line's available slots
 * are carved from blocked intervals (planet edge + moon silhouettes).
 * Text flows left-to-right across slots like a newspaper.
 *
 * Two-pass: first counts lines from the top to measure total text height,
 * then re-lays out from a centered startY.
 */
export function layoutProseAlongCurve(
  prose: string,
  config: CurveLayoutConfig,
): CurveLayoutResult {
  const { planet, padding, leftX, minStartY, moons, moonPadding, verticalBias = 0 } = config
  const prepared = getPrepared(prose)
  const lineH = proseLineHeight()
  const fontSize = parseFloat(proseFont())
  const viewportRight = typeof window !== 'undefined' ? window.innerWidth : 1920

  // Pass 1: measure from top of circle (no moons — they're transient)
  const topStartY = planet.cy - planet.r
  const { lineCount } = measurePass(prepared, topStartY, lineH, planet, padding, leftX, viewportRight)

  // Pass 2: lay out centered on planet, with moons
  const textHeight = lineCount * lineH
  let startY = planet.cy - textHeight / 2 + verticalBias
  if (minStartY !== undefined && startY < minStartY) {
    startY = minStartY
  }

  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  const lines: LayoutLine[] = []
  let lineIndex = 0

  while (true) {
    const bandTop = startY + lineIndex * lineH
    const bandBottom = bandTop + lineH
    if (bandTop > planet.cy + planet.r) break

    const blocked = blockedIntervalsAtBand(bandTop, bandBottom, planet, padding, viewportRight, moons, moonPadding)
    const base: Interval = { left: leftX, right: viewportRight }
    const slots = carveTextLineSlots(base, blocked)

    if (slots.length === 0) {
      lineIndex++
      continue
    }

    // Layout text into each slot left-to-right
    const fragments: LayoutFragment[] = []
    let totalSlotWidth = 0
    for (const slot of slots) {
      const slotWidth = slot.right - slot.left
      const result = layoutNextLine(prepared, cursor, slotWidth)
      if (result === null) break
      fragments.push({
        text: result.text,
        width: result.width,
        slotLeft: slot.left,
        slotWidth,
      })
      cursor = result.end
      totalSlotWidth += slotWidth
    }

    if (fragments.length > 0) {
      lines.push({ fragments, availableWidth: totalSlotWidth })
    }

    // If layoutNextLine returned null mid-line, we're out of text
    if (fragments.length < slots.length) break

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
      fragments: [{ text: result.text, width: result.width, slotLeft: chord.left, slotWidth: chord.width }],
      availableWidth: chord.width,
      offsetX,
      centered: true,
    })
    cursor = result.end
    lineIndex++
  }

  return { lines, startY, fontSize: fontSizePx, lineHeight: lineHeightPx }
}
