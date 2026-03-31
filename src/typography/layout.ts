// src/typography/layout.ts
import { prepareWithSegments, layoutNextLine, type LayoutCursor } from '@chenglou/pretext'
import type { Obstacle } from '@/lib/obstacles'
import {
  PROSE_FONT,
  PROSE_LINE_HEIGHT,
  TEXT_COLUMN_LEFT_PX,
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
 *
 * For each obstacle that vertically intersects this y, find its left edge.
 * If that edge intrudes into the text column, shorten the available width.
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
    // Only shorten text if obstacle's left edge intrudes into the text column
    if (obsLeft > leftX && obsLeft < rightEdge) {
      minRightBound = Math.min(minRightBound, obsLeft)
    }
  }

  return Math.max(minRightBound - leftX, MIN_LINE_WIDTH)
}

// Cache prepared text to avoid re-shaping every frame
let _cachedProse = ''
let _cachedPrepared: ReturnType<typeof prepareWithSegments> | null = null

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
  const baseWidth = columnWidth || (typeof window !== 'undefined' ? window.innerWidth - TEXT_COLUMN_LEFT_PX * 2 : 800)
  if (prose !== _cachedProse || !_cachedPrepared) {
    _cachedPrepared = prepareWithSegments(prose, PROSE_FONT)
    _cachedProse = prose
  }

  const lines: LayoutLine[] = []
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineIndex = 0

  while (true) {
    const lineY = topY + lineIndex * PROSE_LINE_HEIGHT
    const maxWidth = availableWidthAtY(obstacles, lineY, TEXT_COLUMN_LEFT_PX, baseWidth)

    const result = layoutNextLine(_cachedPrepared, cursor, maxWidth)
    if (result === null) break

    lines.push({ text: result.text, width: result.width, availableWidth: maxWidth })
    cursor = result.end
    lineIndex++
  }

  return lines
}
