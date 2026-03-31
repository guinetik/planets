// src/typography/layout.ts
import { prepareWithSegments, layoutNextLine, type LayoutCursor } from '@chenglou/pretext'
import type { Obstacle } from '@/lib/obstacles'
import { maxIntrusionAtY } from '@/lib/obstacles'
import {
  PROSE_FONT,
  PROSE_LINE_HEIGHT,
  TEXT_COLUMN_WIDTH,
} from '@/lib/constants'

export interface LayoutLine {
  text: string
  width: number
}

const MIN_LINE_WIDTH = 60  // never collapse lines below this

/**
 * Lays out prose text into lines, with maxWidth per line reduced by
 * screen-space obstacles at that line's vertical position.
 */
export function layoutProseWithObstacles(
  prose: string,
  topY: number,
  obstacles: Obstacle[],
): LayoutLine[] {
  const prepared = prepareWithSegments(prose, PROSE_FONT)
  const lines: LayoutLine[] = []
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineIndex = 0

  while (true) {
    const lineY = topY + lineIndex * PROSE_LINE_HEIGHT
    const intrusion = maxIntrusionAtY(obstacles, lineY)
    const maxWidth = Math.max(TEXT_COLUMN_WIDTH - intrusion, MIN_LINE_WIDTH)

    const result = layoutNextLine(prepared, cursor, maxWidth)
    if (result === null) break

    lines.push({ text: result.text, width: result.width })
    cursor = result.end
    lineIndex++
  }

  return lines
}
