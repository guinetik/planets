# Prose Along Planet Curve — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display editorial prose in the detail view, right-aligned with each line's right edge following the planet's circular silhouette — no obstacle tracking, just circle math against the projected planet.

**Architecture:** Project the active planet's sphere to screen-space to get a circle `(cx, cy, r)`. For each text line at vertical position `y`, compute the planet's left edge at that `y` using the circle equation. Use Pretext's `layoutNextLine()` with variable width per line. Render as right-aligned DOM spans via `PretextBlock.vue`, positioned so each line's right edge sits at the planet's curvature minus a small padding.

**Tech Stack:** Vue 3, `@chenglou/pretext`, Three.js (for projection only)

---

### Task 1: Add `layoutProseAlongCurve` to typography/layout.ts

**Files:**
- Modify: `src/typography/layout.ts:1-93`

This function takes prose text, a screen-space circle (the projected planet), line height, and a left margin. For each line, it computes the available width from the left margin to the planet's left edge at that y, then uses `layoutNextLine()` to break text.

- [ ] **Step 1: Add the ScreenCircle import and new function**

Add to `src/typography/layout.ts` after the existing `layoutProseWithObstacles` function:

```typescript
import type { ScreenCircle } from '@/lib/obstacles'

export interface CurveLayoutConfig {
  /** Screen-space circle of the projected planet */
  planet: ScreenCircle
  /** Pixel padding between text right edge and planet silhouette */
  padding: number
  /** Left margin in pixels */
  leftX: number
}

/**
 * Lays out prose with each line's right edge following the planet's circular silhouette.
 * Lines start at the planet's top edge and flow downward.
 */
export function layoutProseAlongCurve(
  prose: string,
  config: CurveLayoutConfig,
): LayoutLine[] {
  const { planet, padding, leftX } = config

  if (prose !== _cachedProse || !_cachedPrepared) {
    _cachedPrepared = prepareWithSegments(prose, PROSE_FONT)
    _cachedProse = prose
  }

  const lines: LayoutLine[] = []
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  // Start at the top of the planet circle
  const startY = planet.cy - planet.r
  let lineIndex = 0

  while (true) {
    const lineY = startY + lineIndex * PROSE_LINE_HEIGHT
    // How far from center is this line?
    const dy = lineY - planet.cy
    // If we've passed the bottom of the planet, stop
    if (Math.abs(dy) > planet.r) break

    // Planet's left edge at this y (circle equation)
    const planetLeftAtY = planet.cx - Math.sqrt(planet.r ** 2 - dy ** 2)
    const maxWidth = planetLeftAtY - padding - leftX
    if (maxWidth < MIN_LINE_WIDTH) {
      // Near the very top/bottom of the circle, lines are too narrow — skip
      lineIndex++
      continue
    }

    const result = layoutNextLine(_cachedPrepared, cursor, maxWidth)
    if (result === null) break

    lines.push({ text: result.text, width: result.width, availableWidth: maxWidth })
    cursor = result.end
    lineIndex++
  }

  return lines
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /d/Developer/planets && npx vue-tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/typography/layout.ts
git commit -m "feat: add layoutProseAlongCurve for text following planet silhouette"
```

---

### Task 2: Add planet projection helper to useObstacles.ts

**Files:**
- Modify: `src/composables/useObstacles.ts:1-99`

Export the existing `projectSphere` function so the layout composable can project the active planet to screen space without duplicating projection logic.

- [ ] **Step 1: Export `projectSphere`**

In `src/composables/useObstacles.ts`, change line 17 from:

```typescript
function projectSphere(
```

to:

```typescript
export function projectSphere(
```

- [ ] **Step 2: Verify build**

Run: `cd /d/Developer/planets && npx vue-tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/composables/useObstacles.ts
git commit -m "feat: export projectSphere for reuse by layout composable"
```

---

### Task 3: Update usePretextLayout to support curve layout mode

**Files:**
- Modify: `src/composables/usePretextLayout.ts:1-20`

Add a new `updateCurveLayout` function that projects the active planet and calls `layoutProseAlongCurve`. The composable also returns the `startY` so the renderer knows where to position the text block.

- [ ] **Step 1: Rewrite the composable**

Replace `src/composables/usePretextLayout.ts` with:

```typescript
// src/composables/usePretextLayout.ts
import * as THREE from 'three'
import { ref, type Ref } from 'vue'
import { layoutProseAlongCurve, type LayoutLine, type CurveLayoutConfig } from '@/typography/layout'
import { projectSphere } from './useObstacles'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'
import { PLANETS } from '@/lib/planets'
import { SIZE_SCALE, TEXT_COLUMN_LEFT_PX } from '@/lib/constants'

const CURVE_PADDING = 20 // px between text and planet edge

export function usePretextLayout(
  sceneObjects: Ref<SceneObjects | null>,
) {
  const lines = ref<LayoutLine[]>([])
  const startY = ref(0)
  const leftX = TEXT_COLUMN_LEFT_PX

  function updateCurveLayout(prose: string, entry: PlanetEntry): void {
    const objs = sceneObjects.value
    if (!objs) return

    const planetData = PLANETS.find(p => p.id === entry.id)
    if (!planetData) return

    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const worldPos = entry.planetGroup.position.clone()
    const geomRadius = (entry.planetMeshRef.mesh.geometry as THREE.SphereGeometry).parameters.radius
    const planetWorldRadius = geomRadius * entry.planetGroup.scale.x

    const circle = projectSphere(worldPos, planetWorldRadius, objs.camera, viewport)

    const config: CurveLayoutConfig = {
      planet: circle,
      padding: CURVE_PADDING,
      leftX,
    }

    lines.value = layoutProseAlongCurve(prose, config)
    startY.value = circle.cy - circle.r
  }

  function clearLayout(): void {
    lines.value = []
  }

  return {
    lines,
    startY,
    leftX,
    updateCurveLayout,
    clearLayout,
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd /d/Developer/planets && npx vue-tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/composables/usePretextLayout.ts
git commit -m "feat: usePretextLayout with curve layout against projected planet"
```

---

### Task 4: Update PretextBlock.vue for curve-aligned rendering

**Files:**
- Modify: `src/typography/PretextBlock.vue:1-37`

Each line needs its own right-edge position. Since `availableWidth` varies per line and text is right-aligned, each span's `width` is set to `availableWidth` and the block is positioned at `leftX`. The existing `text-align: right` CSS already handles right-alignment within each span.

- [ ] **Step 1: Update PretextBlock.vue template and props**

Replace `src/typography/PretextBlock.vue` with:

```vue
<!-- src/typography/PretextBlock.vue -->
<template>
  <Transition name="prose-fade">
    <div
      v-if="lines.length > 0"
      class="pretext-block"
      :style="{ top: `${topY}px`, left: `${leftX}px` }"
    >
      <span
        v-for="(line, i) in lines"
        :key="i"
        class="pretext-line"
        :style="{ width: `${line.availableWidth}px` }"
      >{{ line.text }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { LayoutLine } from './layout'

defineProps<{
  lines: LayoutLine[]
  topY: number
  leftX: number
}>()
</script>

<style scoped>
.pretext-block {
  position: fixed;
  z-index: 2;
  pointer-events: none;
}
.pretext-line {
  display: block;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 26px;
  line-height: 46px;
  color: rgba(200, 192, 180, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-align: right;
}
.prose-fade-enter-active { transition: opacity 0.4s ease 0.6s; }
.prose-fade-leave-active { transition: opacity 0.3s ease; }
.prose-fade-enter-from, .prose-fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: Verify build**

Run: `cd /d/Developer/planets && npx vue-tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/typography/PretextBlock.vue
git commit -m "feat: update PretextBlock with fade transition and fixed positioning"
```

---

### Task 5: Wire PlanetDetail.vue to show prose with PretextBlock

**Files:**
- Modify: `src/components/PlanetDetail.vue:1-59`
- Modify: `src/components/App.vue:1-170`

PlanetDetail needs access to the layout composable. Since the composable needs `sceneObjects` (owned by App.vue), and the layout must update per-frame, the wiring happens in App.vue which passes computed lines down.

- [ ] **Step 1: Add PretextBlock and per-frame layout to App.vue**

In `src/components/App.vue`, add the imports after the existing imports (around line 28):

```typescript
import PretextBlock from '@/typography/PretextBlock.vue'
import { usePretextLayout } from '@/composables/usePretextLayout'
import { getPlanet } from '@/lib/planets'
```

After the `useSceneState` call (after line 45), add:

```typescript
const { lines: proseLines, startY: proseStartY, leftX: proseLeftX, updateCurveLayout, clearLayout } = usePretextLayout(sceneObjects)
```

In the existing `onFrame` callback (around line 156), add the layout update after `tickPlanets`:

```typescript
onFrame((simTime, delta) => {
  if (view.value === 'overview') {
    controls.update()
  }
  tickPlanets(planetEntries.value, simTime, sunUniformsRef.value, sunMeshRef.value, activePlanetId.value)

  // Update prose layout each frame (planet position may shift during transition)
  if (view.value === 'detail' && activePlanetId.value) {
    const entry = planetEntries.value.find(e => e.id === activePlanetId.value)
    if (entry) {
      const planet = getPlanet(entry.id)
      updateCurveLayout(planet.prose.join('\n\n'), entry)
    }
  } else {
    clearLayout()
  }
})
```

In the template, add `PretextBlock` after `<router-view />`:

```html
<PretextBlock
  :lines="proseLines"
  :top-y="proseStartY"
  :left-x="proseLeftX"
/>
```

- [ ] **Step 2: Verify build**

Run: `cd /d/Developer/planets && npx vue-tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Manually verify in browser**

Run: `cd /d/Developer/planets && npx vite`

1. Navigate to `localhost:9955/earth`
2. Verify prose text appears on the left, right-aligned against the planet's curvature
3. Lines near the planet's equator should be shorter than lines near the top/bottom
4. Text should fade in after the camera transition completes
5. Navigate to other planets — prose should update
6. Return to overview — prose should disappear

- [ ] **Step 4: Commit**

```bash
git add src/components/App.vue src/components/PlanetDetail.vue
git commit -m "feat: wire prose layout into detail view with per-frame curve tracking"
```

---

### Task 6: Run existing tests to verify no regressions

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd /d/Developer/planets && npx vitest run`
Expected: All 22 tests pass

- [ ] **Step 2: Run type check**

Run: `cd /d/Developer/planets && npx vue-tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Final commit if any fixups needed**

If any tests or types needed fixing, commit those fixes.
