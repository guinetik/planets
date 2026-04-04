# Pretext Moon Obstacle Routing — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Problem

In the desktop detail view, moons that pass through the text column overlap the prose text instead of the text deforming around them. The current layout (`layoutProseAlongCurve`) treats moons as simple right-bound constraints — narrowing lines from the right. When a moon sits IN the text area, text should flow around it like a newspaper wrapping around an inline image, splitting into two (or more) columns around the moon's circular silhouette.

Secondary issue: the planet edge curvature isn't tracked accurately at some Y positions because the current code samples a single Y point per line rather than the full line band.

## Approach

Port the **band-based slot carving** pattern from Pretext's editorial-engine demo (`wrap-geometry.ts` / `carveTextLineSlots`). For each text line:

1. Compute the base horizontal interval: `[leftX, viewportRight]`
2. Compute blocked intervals: planet body (everything right of its left limb) + each moon's chord at that Y band
3. Carve: subtract blocked intervals from the base, yielding 1+ usable text slots
4. Call `layoutNextLine` once per slot (left to right) — text flows continuously across slots
5. Each slot becomes a positioned fragment in the rendered output

## Data Model

### New types

```ts
interface Interval {
  left: number
  right: number
}

interface LayoutFragment {
  text: string
  width: number        // actual measured text width
  slotLeft: number     // absolute screen X position
  slotWidth: number    // available width of this slot
}
```

### Changed type

```ts
interface LayoutLine {
  fragments: LayoutFragment[]
  availableWidth: number   // total available width across all slots (for animation sizing)
  offsetX?: number         // kept for mobile circular layout
  centered?: boolean       // kept for mobile circular layout
}
```

For lines with no moon interference, `fragments` has a single entry. When a moon splits the line, 2+ fragments appear. The mobile `layoutProseInsideCircle` path is unchanged.

## Slot Carving Algorithm

### `circleIntervalAtBand(circle, bandTop, bandBottom, padding): Interval | null`

For a circle obstacle (moon or planet edge), compute the horizontal interval it blocks at a given line band. Samples the circle chord at bandTop, bandBottom, and midpoint, taking the widest horizontal extent. Returns null if the circle doesn't intersect the band.

### `carveTextLineSlots(base, blocked[]): Interval[]`

Ported from the editorial-engine's `wrap-geometry.ts`. Takes one base interval and an array of blocked intervals. Iteratively subtracts each blocked interval from all remaining slots. Filters out slots narrower than `MIN_LINE_WIDTH` (60px).

### Per-line flow in `layoutProseAlongCurve`

```
for each line Y:
  1. base = [leftX, viewportRightEdge]

  2. blocked intervals:
     - planet: [planetLeftLimbAtY - padding, viewportRightEdge]
     - each moon: [moonLeftAtY - moonPadding, moonRightAtY + moonPadding]

  3. slots = carveTextLineSlots(base, blocked)

  4. for each slot (left to right):
     - result = layoutNextLine(prepared, cursor, slot.width)
     - push fragment { text, width, slotLeft: slot.left, slotWidth: slot.width }
     - advance cursor

  5. push LayoutLine { fragments }
```

The planet is no longer a "right boundary" — it's a blocked interval like everything else. Band sampling (top + bottom of line height) tracks the planet's curvature more accurately than the current single-Y approach.

## 3D-to-2D Projection

No changes to the projection pipeline. `usePretextLayout.ts` already projects planet and moons to `ScreenCircle { cx, cy, r }` with perspective correction. The only change is internal to the layout function — circles are converted to blocked intervals via `circleIntervalAtBand` instead of being used as right-bound constraints.

The `CurveLayoutConfig` interface shape stays the same: `planet: ScreenCircle, moons: ScreenCircle[]`.

## Rendering (PretextBlock.vue)

### Structure

```html
<!-- One container per line, one span per fragment -->
<div class="pretext-line-row">
  <span
    v-for="frag in line.fragments"
    class="pretext-fragment"
    :style="{ left: frag.slotLeft, width: frag.slotWidth }"
  >{{ frag.text }}</span>
</div>
```

- Line row: positioned vertically, carries the stagger transition delay (40ms in / 25ms out)
- Fragment span: positioned absolutely at `frag.slotLeft` with `width: frag.slotWidth`
- The `PretextBlock` container uses `left: 0` — fragments position themselves with absolute screen coordinates

### Text alignment per fragment

- **Leftmost fragment:** `text-align: right` (text hugs the moon from the left)
- **Rightmost fragment (touching planet edge):** `text-align: right` (text hugs the planet curve)
- **Middle fragments** (rare, 2+ moons same line): `text-align: center`
- **Single-fragment lines:** `text-align: right` (preserving current behavior)

## Edge Cases

- **Multiple moons on same line:** Works naturally — N moons create up to N+1 slots
- **Moon fully covers line:** All slots narrower than MIN_LINE_WIDTH → line skipped, text continues on next Y band
- **Moon partially outside text column:** Blocked interval only affects the overlapping portion; carving handles it
- **Moon moving between frames:** Layout recomputes every frame (existing behavior), slot carving replaces the simpler right-bound math at same performance cost
- **Performance:** `layoutNextLine` is ~0.0002ms per call; doubling calls for split lines is negligible at 60fps

## Files Changed

| File | Change |
|------|--------|
| `src/lib/obstacles.ts` | Add `Interval` type, `circleIntervalAtBand()`, `carveTextLineSlots()` |
| `src/typography/layout.ts` | New `LayoutFragment` type, rework `LayoutLine`, rewrite `layoutProseAlongCurve` to use slot carving |
| `src/typography/PretextBlock.vue` | Line row + fragment span structure, per-fragment absolute positioning |
| `src/composables/usePretextLayout.ts` | Adapt to new `LayoutLine` shape (fragments) |
| `src/lib/obstacles.test.ts` | Tests for `circleIntervalAtBand` and `carveTextLineSlots` |

## Files Unchanged

- `layoutProseInsideCircle` (mobile path)
- `layoutProseWithObstacles` (unused, kept as-is)
- All Three.js code, shaders, planet data, constants
- `usePlanets.ts`, `useObstacles.ts`, `useSceneState.ts`
