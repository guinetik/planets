# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server
npx vite

# Production build (runs vue-tsc type check first)
npm run build

# Run all tests
npx vitest run

# Run a single test file
npx vitest run src/lib/orbit.test.ts

# Run tests with coverage (src/lib/** only)
npx vitest run --coverage
```

There is no `npm test` script — use `npx vitest run` directly.

## Architecture

This is a Vue 3 + Three.js + Pretext typography solar system single-page site. The codebase is split into three strict layers with no cross-contamination:

### `src/lib/` — Pure math, zero dependencies on Three.js or Vue
All named constants live in `constants.ts`. No magic numbers anywhere else.
- `orbit.ts` — circular orbit position, moon angle calculation
- `projection.ts` — NDC → screen-space conversion, sphere/ellipse projection helpers
- `obstacles.ts` — per-scanline intrusion calculation for circle and ellipse obstacles
- `planets.ts` — Planet/Moon data types and the editorial prose content for all 8 planets

**All lib modules are unit-tested** (`*.test.ts`). 22 tests total.

### `src/three/` — Three.js only, may import `src/lib/`
- `scene.ts` — `SceneObjects` interface (`scene`, `camera`, `renderer`), `createScene(canvas)`
- `planetMesh.ts`, `moonMesh.ts`, `sunMesh.ts`, `ringMesh.ts` — mesh factories with procedural GLSL shader
- `shaders/planet.frag.glsl` — fragment shader drawing meridians + equatorial line per planet accent color. `ROTATION_SPEED` and `FILL_COLOR` constants here mirror `PLANET_ROTATION_SPEED` and `PLANET_FILL_COLOR` in `constants.ts` — keep them in sync manually.
- `controls.ts` — OrbitControls setup, Raycaster for hover/click on planet meshes
- `transitions.ts` — GSAP tweens for overview↔detail transitions (receives pre-computed values, does no math)

### `src/composables/` — Vue 3 composables, bridge between Three.js and Vue
- `useScene` — rAF loop, `onFrame(callback)` registration. Uses **`shallowRef`** (not `ref`) for `SceneObjects` to prevent Vue from deep-unwrapping Three.js objects.
- `usePlanets` — builds planet/moon/ring scene graph, `tickPlanets(entries, time, delta)` + `tickOverviewOrbits`
- `useSceneState` — view state (`'overview'` | `'detail'`), `selectPlanet(id)` triggers GSAP transition
- `useObstacles` — per-frame projects 3D geometry to screen-space `Obstacle[]`
- `usePretextLayout` — calls `layoutProseWithObstacles` each frame in detail view

### `src/typography/` — Pretext text layout
- `layout.ts` — `layoutProseWithObstacles(prose, topY, obstacles)` — uses `@chenglou/pretext` API: `prepareWithSegments(text, font)` then `layoutNextLine(prepared, cursor, maxWidth)` in a loop. `cursor` is `{ segmentIndex: 0, graphemeIndex: 0 }`, advanced via `result.end`.

### Data flow in detail view (per frame)
```
onFrame(time, delta)
  → tickPlanets(entries, time, delta)       // update shader uniforms + moon positions
  → updateObstacles()                        // project planet/moons/ring to ScreenCircle/ScreenEllipse
  → updateLayout(prose, obstacles)           // Pretext re-lays out text around obstacles at 60fps
```

## Key constraints

- **`src/lib/`** must never import from `three`, Vue, or composables
- **`shallowRef`** is required for any ref holding Three.js objects — `ref` causes structural type errors via Vue's deep unwrap inference
- Pretext install: `@chenglou/pretext` from npm (not a local path)
- Three.js types: `three@0.183.0` + `@types/three@0.183.1` (pinned — `@types/three@0.183.2` does not exist on npm); `skipLibCheck: true` is set in `tsconfig.json`
- Build target: `es2020`, output to `dist/`, deploy via `netlify.toml`
