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
npx vitest run src/lib/kepler.test.ts

# Run tests with coverage (src/lib/** only)
npx vitest run --coverage
```

There is no `npm test` script — use `npx vitest run` directly.

## Architecture

This is a Vue 3 + Three.js + Pretext typography solar system single-page site. The codebase is split into three strict layers with no cross-contamination:

### `src/lib/` — Pure math, zero dependencies on Three.js or Vue
All named constants live in `constants.ts`. No magic numbers anywhere else.
- `kepler.ts` — Keplerian orbital mechanics: `solveKeplerEquation()` (Newton-Raphson), `meanAnomaly()`, `trueAnomalyFromEccentric()`, `keplerRadius()`, `orbitalPosition3D()`, `orbitPathPoints()`
- `orbit.ts` — re-exports from `kepler.ts`
- `projection.ts` — NDC → screen-space conversion, sphere projection, ellipse fitting for tilted rings
- `obstacles.ts` — per-scanline intrusion calculation for circle and ellipse obstacles (used by typography layout)
- `planets.ts` — `Planet`, `Moon`, `ShaderConfig`, `OrbitalElements` types; `PLANETS[]` array with orbital elements, shader uniforms, moons, prose content, and `SUN` constant
- `constants.ts` — feature toggles (`ENABLE_GLB_PLANETS`), scene parameters (`SIZE_SCALE=50`, `ORBIT_SCALE=0.02`), bloom settings, typography config (`PROSE_FONT_SIZE_VW=1.0`, `TEXT_COLUMN_LEFT_VW=12`), animation timings

**All lib modules are unit-tested** (`*.test.ts`). 49 tests total (kepler: 46, projection: 5, obstacles: 15).

### `src/three/` — Three.js only, may import `src/lib/`
- `scene.ts` — `SceneObjects` interface (`scene`, `camera`, `renderer`), `createScene(canvas)` with bloom post-processing (EffectComposer), tone mapping, starfield (1200 particles)
- `simplePlanetMesh.ts` — NASA-textured spheres via `MeshStandardMaterial`. Earth special case: night-side city lights using emissive map + `onBeforeCompile` shader injection with `nightMask = smoothstep(sunFacing)`
- `planetMesh.ts` — `createPlanetMesh()` factory, delegates to `simplePlanetMesh.ts` (or GLB loader behind `ENABLE_GLB_PLANETS` flag)
- `moonMesh.ts` — moon sphere factory (rocky planet shader, 32 segments)
- `sunMesh.ts` — sun mesh + `PointLight` + corona sprite (radial gradient canvas texture, additive blending)
- `ringMesh.ts` — shader-based planetary rings with `bandDensity()` simulating Saturn's C/B/A rings + Cassini/Encke/Keeler gaps
- `controls.ts` — OrbitControls setup, Raycaster for hover/click on planet meshes
- `transitions.ts` — GSAP tweens for overview↔detail transitions (receives pre-computed values, does no math)

#### GLSL shaders (`src/three/shaders/`)
- `common.glsl` — shared `noise3D()`, `fbm()`, `fresnel()`, `rotateY()`
- `sphere.vert.glsl` — shared vertex shader outputting `vModelNormal`, `vModelPosition`, `vViewNormal`, `vViewPosition`
- `rockyPlanet.frag.glsl` — FBM terrain noise, height-based coloring, sun lighting, optional atmosphere fresnel rim
- `gasGiant.frag.glsl` — banded atmosphere (15x/25x/40x latitude waves), FBM turbulence, animated storms (Great Red Spot style)
- `star.frag.glsl` — 5-octave plasma noise, 3-layer hot bubbles, 4-octave boiling turbulence, corona flames, limb darkening

### `src/composables/` — Vue 3 composables, bridge between Three.js and Vue
- `useScene` — rAF loop, `onFrame(callback)` registration, `timeScale`, `paused`. Uses **`shallowRef`** (not `ref`) for `SceneObjects` to prevent Vue from deep-unwrapping Three.js objects.
- `usePlanets` — builds planet/moon/ring scene graph, `tickPlanets(entries, time, delta)` updates shader uniforms + Keplerian positions per frame
- `useSceneState` — view state (`'overview'` | `'detail'`), `selectPlanet(id)` triggers GSAP transition, URL routing integration
- `useObstacles` — per-frame projects 3D geometry to screen-space `Obstacle[]` (circles for planets/moons, ellipses for rings)
- `usePretextLayout` — calls `layoutProseAlongCurve()` each frame in detail view, manages line entry/exit animations

### `src/typography/` — Pretext text layout
- `layout.ts` — `layoutProseWithObstacles()` and `layoutProseAlongCurve()` — uses `@chenglou/pretext` API: `prepareWithSegments(text, font)` then `layoutNextLine(prepared, cursor, maxWidth)` in a loop. Two-pass curve layout: measure total height, then center vertically on planet.
- `PretextBlock.vue` — renders `LayoutLine[]` as staggered `<span>` elements with opacity/transform fade-in transitions

### `src/components/` — Vue components
- `App.vue` — root component, orchestrates composables, watches `route.params.planetId`
- `SceneCanvas.vue` — canvas element wrapper
- `SiteNav.vue` — navigation bar with planet selector
- `PlanetLabels.vue` — screen-space labels projected from 3D positions
- `PlanetDetail.vue` — detail view panel
- `HeroOverlay.vue` — initial hero section

### Data flow in detail view (per frame)
```
onFrame(time, delta)
  → tickPlanets(entries, time, delta)       // Keplerian positions + shader uniforms
  → updateObstacles()                        // project planet/moons/ring to ScreenCircle/ScreenEllipse
  → updateLayout(prose, obstacles)           // Pretext re-lays out text around obstacles at 60fps
```

## Key constraints

- **`src/lib/`** must never import from `three`, Vue, or composables
- **`shallowRef`** is required for any ref holding Three.js objects — `ref` causes structural type errors via Vue's deep unwrap inference
- Pretext install: `@chenglou/pretext` from npm (not a local path)
- Three.js types: `three@0.183.0` + `@types/three@0.183.1` (pinned — `@types/three@0.183.2` does not exist on npm); `skipLibCheck: true` is set in `tsconfig.json`
- Build target: `es2020`, output to `dist/`, deploy via `netlify.toml`
- Planet textures: NASA imagery at `public/textures/{planetId}.jpg` + `earth-night.jpg` for city lights
- Shader constants: `ROTATION_SPEED` and `FILL_COLOR` in GLSL must stay in sync with `PLANET_ROTATION_SPEED` and `PLANET_FILL_COLOR` in `constants.ts`
- `ENABLE_GLB_PLANETS` flag in `constants.ts` controls whether to use GLB models (false by default — uses NASA-textured shader spheres)
