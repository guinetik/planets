# Pretext Moon Obstacle Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make prose text flow around moon silhouettes like a newspaper wrapping around inline images, using band-based slot carving.

**Architecture:** Replace per-line right-bound narrowing in `layoutProseAlongCurve` with interval-based slot carving ported from Pretext's editorial-engine demo. Each line computes blocked intervals from the planet edge and all moons, carves remaining slots, and calls `layoutNextLine` per slot. `PretextBlock.vue` renders multi-fragment lines with absolute positioning per fragment.

**Tech Stack:** Vue 3, TypeScript, `@chenglou/pretext` (prepareWithSegments, layoutNextLine), Vitest

**Spec:** `docs/superpowers/specs/2026-04-03-pretext-moon-obstacle-routing-design.md`

---

### Task 1: Add interval types and `circleIntervalAtBand` to obstacles.ts

**Files:**
- Modify: `src/lib/obstacles.ts`
- Modify: `src/lib/obstacles.test.ts`

- [ ] **Step 1: Write failing tests for `circleIntervalAtBand`**

Add to `src/lib/obstacles.test.ts`:

```ts
import {
  circleIntrusionAtY,
  ellipseIntrusionAtY,
  maxIntrusionAtY,
  circleIntervalAtBand,
  type ScreenCircle,
  type ScreenEllipseObstacle,
  type Obstacle,
  type Interval,
} from './obstacles'

// ... existing tests ...

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
    // At cy=400, chord spans [400, 600], band samples near equator
    expect(result!.left).toBeCloseTo(400, 0)
    expect(result!.right).toBeCloseTo(600, 0)
  })

  it('returns narrower interval near the top of the circle', () => {
    // Band near top: y=310..320, dy from cy ~= 85
    // chord half = sqrt(100^2 - 85^2) = sqrt(2775) ≈ 52.7
    const result = circleIntervalAtBand(circle, 310, 320, 0)
    expect(result).not.toBeNull()
    expect(result!.right - result!.left).toBeLessThan(120) // much less than diameter
    expect(result!.right - result!.left).toBeGreaterThan(80)
  })

  it('applies padding to expand the interval', () => {
    const withoutPad = circleIntervalAtBand(circle, 395, 405, 0)!
    const withPad = circleIntervalAtBand(circle, 395, 405, 20)!
    expect(withPad.left).toBeCloseTo(withoutPad.left - 20, 0)
    expect(withPad.right).toBeCloseTo(withoutPad.right + 20, 0)
  })

  it('returns interval when band partially overlaps circle top', () => {
    // Band straddles circle top edge (cy - r = 300)
    const result = circleIntervalAtBand(circle, 295, 310, 0)
    expect(result).not.toBeNull()
    expect(result!.left).toBeLessThan(500)
    expect(result!.right).toBeGreaterThan(500)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/obstacles.test.ts`
Expected: FAIL — `circleIntervalAtBand` is not exported

- [ ] **Step 3: Implement `Interval` type and `circleIntervalAtBand`**

Add to `src/lib/obstacles.ts`:

```ts
export interface Interval {
  left: number
  right: number
}

/**
 * Compute the horizontal interval a circle blocks within a line band [bandTop, bandBottom].
 * Samples top, middle, and bottom of the band, taking the widest extent.
 * Returns null if the circle doesn't intersect the band at all.
 */
export function circleIntervalAtBand(
  circle: ScreenCircle,
  bandTop: number,
  bandBottom: number,
  padding: number,
): Interval | null {
  const sampleYs = [bandTop, (bandTop + bandBottom) / 2, bandBottom]
  let left = Infinity
  let right = -Infinity

  for (const y of sampleYs) {
    const dy = y - circle.cy
    if (Math.abs(dy) >= circle.r) continue
    const halfChord = Math.sqrt(circle.r ** 2 - dy ** 2)
    const chordLeft = circle.cx - halfChord
    const chordRight = circle.cx + halfChord
    if (chordLeft < left) left = chordLeft
    if (chordRight > right) right = chordRight
  }

  if (!Number.isFinite(left) || !Number.isFinite(right)) return null
  return { left: left - padding, right: right + padding }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/obstacles.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/obstacles.ts src/lib/obstacles.test.ts
git commit -m "feat: add Interval type and circleIntervalAtBand to obstacles"
```

---

### Task 2: Add `carveTextLineSlots` to obstacles.ts

**Files:**
- Modify: `src/lib/obstacles.ts`
- Modify: `src/lib/obstacles.test.ts`

- [ ] **Step 1: Write failing tests for `carveTextLineSlots`**

Add to `src/lib/obstacles.test.ts`:

```ts
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

// ... existing tests ...

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
    // Blocked interval leaves a 20px gap on the left — too narrow (< 60)
    const blocked: Interval[] = [{ left: 20, right: 500 }]
    const result = carveTextLineSlots(base, blocked)
    // Only the right slot (500..800 = 300px) survives
    expect(result).toEqual([{ left: 500, right: 800 }])
  })

  it('returns empty when everything is blocked', () => {
    const base: Interval = { left: 0, right: 100 }
    const blocked: Interval[] = [{ left: -10, right: 110 }]
    const result = carveTextLineSlots(base, [])
    // Base itself is 100px which is >= 60, but with the block:
    const result2 = carveTextLineSlots(base, blocked)
    expect(result2).toEqual([])
  })

  it('handles blocked interval entirely outside base', () => {
    const base: Interval = { left: 100, right: 800 }
    const blocked: Interval[] = [{ left: 900, right: 1000 }]
    const result = carveTextLineSlots(base, blocked)
    expect(result).toEqual([{ left: 100, right: 800 }])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/obstacles.test.ts`
Expected: FAIL — `carveTextLineSlots` is not exported

- [ ] **Step 3: Implement `carveTextLineSlots`**

Add to `src/lib/obstacles.ts`:

```ts
const MIN_SLOT_WIDTH = 60

/**
 * Given a base horizontal interval and a set of blocked intervals,
 * return the remaining usable text slots. Discards slots narrower
 * than MIN_SLOT_WIDTH. Ported from Pretext's editorial-engine demo.
 */
export function carveTextLineSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots: Interval[] = [base]

  for (const block of blocked) {
    const next: Interval[] = []
    for (const slot of slots) {
      // No overlap — keep slot as-is
      if (block.right <= slot.left || block.left >= slot.right) {
        next.push(slot)
        continue
      }
      // Left remainder
      if (block.left > slot.left) {
        next.push({ left: slot.left, right: block.left })
      }
      // Right remainder
      if (block.right < slot.right) {
        next.push({ left: block.right, right: slot.right })
      }
    }
    slots = next
  }

  return slots.filter(slot => slot.right - slot.left >= MIN_SLOT_WIDTH)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/obstacles.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/obstacles.ts src/lib/obstacles.test.ts
git commit -m "feat: add carveTextLineSlots for band-based obstacle routing"
```

---

### Task 3: Update LayoutLine type and add LayoutFragment

**Files:**
- Modify: `src/typography/layout.ts`

- [ ] **Step 1: Add `LayoutFragment` type and update `LayoutLine`**

In `src/typography/layout.ts`, replace the existing `LayoutLine` interface:

```ts
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
```

- [ ] **Step 2: Fix `layoutProseWithObstacles` to use new type**

Update the return in `layoutProseWithObstacles` (the unused function — keep it compiling):

```ts
lines.push({
  fragments: [{ text: result.text, width: result.width, slotLeft: leftX, slotWidth: maxWidth }],
  availableWidth: maxWidth,
})
```

- [ ] **Step 3: Fix `layoutProseInsideCircle` to use new type**

Update the line push in `layoutProseInsideCircle`:

```ts
lines.push({
  fragments: [{ text: result.text, width: result.width, slotLeft: chord.left, slotWidth: chord.width }],
  availableWidth: chord.width,
  offsetX,
  centered: true,
})
```

- [ ] **Step 4: Fix `layoutProseAlongCurve` to use new type (single-fragment for now)**

Update the line push in `layoutProseAlongCurve` — we'll replace this with slot carving in Task 4, but keep it compiling:

```ts
lines.push({
  fragments: [{ text: result.text, width: result.width, slotLeft: leftX, slotWidth: maxWidth }],
  availableWidth: maxWidth,
})
```

- [ ] **Step 5: Verify the project compiles**

Run: `npx vitest run src/lib/obstacles.test.ts`
Expected: All existing tests PASS (layout.ts has no tests of its own, but compilation must succeed)

- [ ] **Step 6: Commit**

```bash
git add src/typography/layout.ts
git commit -m "refactor: update LayoutLine to support multi-fragment lines"
```

---

### Task 4: Rewrite `layoutProseAlongCurve` with slot carving

**Files:**
- Modify: `src/typography/layout.ts`

This is the core algorithm change. The function signature stays the same (`CurveLayoutConfig` unchanged), but internally it uses `circleIntervalAtBand` and `carveTextLineSlots` instead of `curveWidthAtLine`.

- [ ] **Step 1: Add imports for the new obstacle functions**

At the top of `src/typography/layout.ts`, update the import from `@/lib/obstacles`:

```ts
import type { Obstacle, ScreenCircle } from '@/lib/obstacles'
import { circleIntervalAtBand, carveTextLineSlots, type Interval } from '@/lib/obstacles'
```

- [ ] **Step 2: Rewrite `layoutProseAlongCurve`**

Replace the entire `layoutProseAlongCurve` function (and remove `curveWidthAtLine` which is no longer used):

```ts
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
  } else {
    // Band is above/below the planet — block nothing for planet
    // But if bandTop is below the planet center (past equator), the planet
    // still occupies the right side. Check if band is within planet's vertical span
    // by testing individual edges.
    const dyTop = bandTop - planet.cy
    const dyBot = bandBottom - planet.cy
    if (dyTop < planet.r && dyBot > -planet.r) {
      // Band partially overlaps — use the widest point visible
      // This case is already handled by circleIntervalAtBand's 3-sample approach,
      // so reaching here means the band is truly outside the circle.
    }
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
 * Returns the number of text lines that fit, and the final cursor position.
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
```

- [ ] **Step 3: Remove the now-unused `curveWidthAtLine` function**

Delete the entire `curveWidthAtLine` function from `src/typography/layout.ts` (approximately lines 124-153 in the current file). It is fully replaced by `blockedIntervalsAtBand` + `carveTextLineSlots`.

- [ ] **Step 4: Verify compilation**

Run: `npx vitest run src/lib/obstacles.test.ts`
Expected: PASS — the layout module compiles and obstacle tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/typography/layout.ts
git commit -m "feat: rewrite layoutProseAlongCurve with band-based slot carving"
```

---

### Task 5: Update PretextBlock.vue for multi-fragment lines

**Files:**
- Modify: `src/typography/PretextBlock.vue`

- [ ] **Step 1: Update template to render fragments**

Replace the entire `<template>` section of `src/typography/PretextBlock.vue`:

```vue
<template>
  <div
    v-if="lines.length > 0"
    class="pretext-block"
  >
    <div
      v-for="(line, i) in lines"
      :key="i"
      class="pretext-line-row"
      :class="{ 'is-visible': visible }"
      :style="{
        top: `${topY + i * lineHeight}px`,
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}px`,
        height: `${lineHeight}px`,
        transitionDelay: visible
          ? `${i * 40}ms`
          : `${(lines.length - 1 - i) * 25}ms`,
      }"
    >
      <span
        v-if="line.centered"
        class="pretext-fragment"
        :style="{
          left: `${leftX + (line.offsetX || 0)}px`,
          width: `${line.availableWidth}px`,
          textAlign: 'center',
        }"
      >{{ line.fragments[0]?.text }}</span>
      <span
        v-else
        v-for="(frag, fi) in line.fragments"
        :key="fi"
        class="pretext-fragment"
        :style="{
          left: `${frag.slotLeft}px`,
          width: `${frag.slotWidth}px`,
          textAlign: fragmentAlign(line, fi),
        }"
      >{{ frag.text }}</span>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Update script to add fragment alignment logic**

Replace the `<script setup>` section:

```vue
<script setup lang="ts">
import type { LayoutLine } from './layout'

defineProps<{
  lines: LayoutLine[]
  topY: number
  leftX: number
  fontSize: number
  lineHeight: number
  visible: boolean
}>()

function fragmentAlign(line: LayoutLine, fragmentIndex: number): string {
  if (line.fragments.length === 1) return 'right'
  if (fragmentIndex === line.fragments.length - 1) return 'right'
  if (fragmentIndex === 0) return 'right'
  return 'center'
}
</script>
```

- [ ] **Step 3: Update styles for the new structure**

Replace the `<style scoped>` section:

```vue
<style scoped>
.pretext-block {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}
.pretext-line-row {
  position: absolute;
  left: 0;
  width: 100%;
  opacity: 0;
  transform: translateX(-20px);
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.pretext-line-row.is-visible {
  opacity: 1;
  transform: translateX(0);
}
.pretext-fragment {
  position: absolute;
  font-family: Georgia, 'Times New Roman', serif;
  color: rgba(200, 192, 180, 0.75);
  white-space: nowrap;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .pretext-fragment {
    text-shadow:
      0 0 4px rgba(0, 0, 0, 0.9),
      0 0 8px rgba(0, 0, 0, 0.7),
      0 1px 2px rgba(0, 0, 0, 0.8);
    color: rgba(220, 215, 205, 0.85);
  }
}
</style>
```

- [ ] **Step 4: Verify compilation**

Run: `npx vitest run`
Expected: All tests PASS, no compilation errors.

- [ ] **Step 5: Commit**

```bash
git add src/typography/PretextBlock.vue
git commit -m "feat: update PretextBlock to render multi-fragment lines"
```

---

### Task 6: Update usePretextLayout.ts for new LayoutLine shape

**Files:**
- Modify: `src/composables/usePretextLayout.ts`

The composable needs minor changes — the projection logic stays the same, but references to `line.text` or `line.width` in animation timing need to work with the new fragment-based structure.

- [ ] **Step 1: Update the composable**

In `src/composables/usePretextLayout.ts`, the only change needed is removing the `leftX` positioning logic for the desktop path since fragments now carry absolute positions. Change the desktop path's final assignments (around line 157-162):

Replace:

```ts
    const result = layoutProseAlongCurve(prose, config)
    lines.value = result.lines
    startY.value = result.startY
    leftX.value = divX
    fontSize.value = result.fontSize
    lineHeight.value = result.lineHeight
```

With:

```ts
    const result = layoutProseAlongCurve(prose, config)
    lines.value = result.lines
    startY.value = result.startY
    leftX.value = 0  // fragments carry absolute screen positions
    fontSize.value = result.fontSize
    lineHeight.value = result.lineHeight
```

The mobile path (`isMobile()` branch) keeps its `leftX` calculation unchanged since mobile uses `offsetX` + `centered` on the LayoutLine, not fragment positioning.

- [ ] **Step 2: Verify with dev server**

Run: `npx vite` and navigate to a planet with moons (e.g., Jupiter at `/jupiter`). Verify:
- Text renders and follows the planet's curvature
- When a moon passes through the text area, text carves around it
- Lines split into multiple fragments when a moon is in the middle
- Stagger animation still works

- [ ] **Step 3: Commit**

```bash
git add src/composables/usePretextLayout.ts
git commit -m "feat: adapt usePretextLayout for fragment-based layout lines"
```

---

### Task 7: Visual verification and cleanup

**Files:**
- Possibly modify: `src/typography/layout.ts` (tuning)
- Possibly modify: `src/composables/usePretextLayout.ts` (tuning)

- [ ] **Step 1: Test Jupiter**

Run `npx vite`, navigate to `/jupiter`. Jupiter has 4 Galilean moons. Wait for moons to orbit into the text area. Verify:
- Text flows around each moon's circular silhouette
- When a moon is in the middle of the text column, text splits into two fragments (left of moon, right of moon)
- Text on both sides hugs the moon's curvature
- No text overlaps any moon

- [ ] **Step 2: Test Saturn**

Navigate to `/saturn`. Saturn has moons + rings. Verify:
- Text follows the planet's curvature (the red-circle issue from the screenshot should be fixed by band sampling)
- Moons that cross the text area cause proper text deformation

- [ ] **Step 3: Test planets without moons**

Navigate to `/mercury` and `/venus`. Verify:
- Single-fragment lines still render correctly
- Text-align right is preserved
- No visual regression from the current behavior

- [ ] **Step 4: Test mobile layout**

Resize the browser to mobile width (< 1024px) or use devtools responsive mode. Navigate to any planet. Verify:
- Mobile circular layout still works (uses `layoutProseInsideCircle`, untouched)
- No rendering issues

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 6: Commit any tuning adjustments**

If any padding values or alignment logic needed tweaking during visual verification:

```bash
git add -u
git commit -m "fix: tune moon obstacle padding and fragment alignment"
```

Skip this step if no changes were needed.
