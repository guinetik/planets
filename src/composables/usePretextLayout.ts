// src/composables/usePretextLayout.ts
import { ref } from 'vue'
import { layoutProseWithObstacles, type LayoutLine } from '@/typography/layout'
import type { Obstacle } from '@/lib/obstacles'
import { TEXT_COLUMN_LEFT_PX, PROSE_TOP_Y_PX } from '@/lib/constants'

export function usePretextLayout() {
  const lines = ref<LayoutLine[]>([])

  function updateLayout(prose: string, obstacles: Obstacle[]): void {
    lines.value = layoutProseWithObstacles(prose, PROSE_TOP_Y_PX, obstacles)
  }

  return {
    lines,
    leftX: TEXT_COLUMN_LEFT_PX,
    topY: PROSE_TOP_Y_PX,
    updateLayout,
  }
}
