# Planets — Design Spec
**Date:** 2026-03-30
**URL:** planets.guinetik.com
**Stack:** Vue 3 + Three.js + Pretext (`@chenglou/pretext`)

---

## Concept

A single-page digital magazine hotsite for the solar system. The driving constraint: every typographic decision runs through Pretext, and the Three.js canvas is always visible — it *is* the page. No browser scroll. The UI is a set of state transitions.

---

## Visual Language

**Keplerian Haute couture wireframe.** No texture maps. No photorealism. Each planet is a near-black sphere rendered with a custom GLSL `ShaderMaterial` that draws sparse meridian lines + one equatorial line procedurally. Rotation is legible from line movement. Each planet has one accent color — that same color is used for the shader lines, the typography, and the section palette.

**Planet accent colors:**
| Planet | Color | Hex |
|--------|-------|-----|
| Mercury | warm silver-gray | `#B0A898` |
| Venus | sulfur gold | `#D4B96A` |
| Earth | cool blue | `#6AA4D4` |
| Mars | amber rust | `#C87840` |
| Jupiter | warm ochre | `#C8A878` |
| Saturn | dusty gold | `#D4C890` |
| Uranus | icy cyan | `#78C8D4` |
| Neptune | deep cobalt | `#5068C8` |

**Background:** `#06060c` — near-black with a slight blue-purple bias.
**Typography:** Serif (Georgia or equivalent). Extreme letter-spacing for labels and headings. Muted body copy at ~70% opacity.

---

## Architecture

### Single fullscreen Three.js canvas

One WebGL context. One Three.js scene. The `<canvas>` is `position: fixed; inset: 0; z-index: 0`. The Vue app mounts HTML over it at `z-index: 1`. There is no page scroll — everything is CSS transitions and Three.js camera/object animation.

### Vue app (overlay layer)

Vue manages UI state: `{ view: 'overview' | 'detail', activePlanet: string | null }`. The canvas and scene are initialized once in a composable (`useScene`) and never torn down. Vue components are transparent overlays — they show/hide based on state.

### Pretext integration

The headline feature. In the detail view, Pretext runs **every animation frame** — not just once on planet settle. This enables all 3D geometry (planet sphere, rings, orbiting moons) to dynamically shape the text in real time.

**Generalized obstacle system.** Any 3D feature of the active planet registers as a screen-space obstacle. The system collects obstacles each frame and feeds them to the layout pass:

- **Planet sphere** → circular obstacle: `Vector3.project()` gives screen center; world-space radius projected to screen pixels gives `r`.
- **Moons** → circular obstacles, same projection. A moon only registers as an obstacle when its screen x-position falls within the text column's x-range.
- **Saturn's rings** → elliptical obstacle: the torus is projected by sampling points along its circumference, computing the screen-space bounding ellipse, and treating each scan line's intersection with that ellipse as the intrusion width.

**Per-frame layout pass:**
1. Collect all active screen-space obstacles (circles + ellipses).
2. For each line `i`, compute `lineY` (vertical screen position of that line).
3. For each obstacle, compute horizontal intrusion at `lineY`: `sqrt(r² - (lineY - cy)²)` for circles; ellipse intersection formula for rings.
4. `maxWidth` for line `i` = `textColumnWidth - max(all intrusions at lineY)`.
5. Call Pretext `layoutNextLine()` iteratively with per-line `maxWidth` values.
6. Commit the resulting line array to a Vue `ref` — Vue re-renders `<span>` elements.

Since Pretext's layout hot path is ~0.09ms for a full prose block, this runs cleanly at 60fps.

---

## UX Flow

### State 1 — Overview

A fully interactive 3D solar system. OrbitControls are active — the user can freely orbit, zoom, and pan with the mouse to explore the scene. All 8 planets float in simplified circular orbits around the Sun with their moons orbiting around them. Orbit rings are gossamer (`0.5px`, `rgba(255,255,255,0.06)`). All planet and moon shaders run continuously (meridians spinning). Hovering a planet highlights it and shows its name. Clicking a planet triggers the transition to detail view. Moons are not selectable — they are visual elements only.

A fixed header shows the wordmark "PLANETS" and a minimal nav listing all 8 planet names as jump links.

### State 2 — Detail view

Triggered by clicking a planet in the overview or nav.

1. **Three.js transition:** Selected planet scales up to fill the full viewport height and moves to the right side of the viewport. Other planets scale down and fade (opacity on their mesh materials). The planet's moons appear and begin orbiting. Duration ~800ms, eased via GSAP.
2. **Text fade-in:** Left half of the screen fades in: planet number, planet name (large, tracked, accent color), then the Pretext-wrapped prose block.
3. **Live Pretext loop begins:** Every rAF, the prose is re-laid-out accounting for the planet sphere + any moons currently overlapping the text column. Text visibly parts around a passing moon and closes again behind it.

Clicking a different planet name in the nav: text fades out, Three.js transitions to new planet, text fades back in with new prose.

### No overview return button at MVP — the wordmark "PLANETS" in the header returns to overview.

---

## Planetary Data Model

Each planet entry in `planets.ts`:

```ts
type Moon = {
  name: string
  orbitRadius: number   // relative to planet radius = 1
  orbitSpeed: number    // radians/second
  size: number          // relative to planet radius
  orbitTilt: number     // radians, for visual variation
}

type Planet = {
  id: string
  name: string
  order: number
  accentColor: string
  prose: string[]       // array of paragraphs
  moons: Moon[]
}
```

**Moon roster (display subset — not exhaustive):**
| Planet | Moons shown |
|--------|-------------|
| Mercury | — |
| Venus | — |
| Earth | Moon |
| Mars | Phobos, Deimos |
| Jupiter | Io, Europa, Ganymede, Callisto |
| Saturn | Titan, Enceladus |
| Uranus | Titania, Oberon |
| Neptune | Triton |

Moon meshes: same wireframe shader at smaller scale (`size * planetRadius`), same accent color at 50% opacity. Their orbital paths visible as faint rings around the planet in the detail view.

---

## Component Structure

```
App.vue
├── SceneCanvas.vue          — mounts <canvas>, owns Three.js lifecycle
├── HeroOverlay.vue          — overview state: wordmark, "select a planet" prompt
├── PlanetDetail.vue         — detail state: planet name, Pretext prose block
│   └── PretextBlock.vue     — receives prose string + live obstacle list → renders lines per-frame
└── SiteNav.vue              — fixed header, planet nav links + wordmark home
```

**Composables:**
- `useScene()` — Three.js scene, camera, renderer, animation loop
- `usePlanets()` — planet mesh + moon mesh creation, shader uniforms, per-planet config
- `useObstacles()` — projects all active 3D geometry (planet sphere, moons, rings) to screen-space obstacles each frame; exposes obstacle list to Pretext
- `useSceneState()` — overview ↔ detail transitions, GSAP timelines
- `usePretextLayout()` — consumes obstacle list from `useObstacles()` each frame, calls `layoutNextLine()`, returns reactive line array

---

## Three.js / Shader Notes

**Planet geometry:** `SphereGeometry(1, 64, 64)` with a custom `ShaderMaterial`.

**Fragment shader logic (per planet):**
- Sample UV coordinates on sphere surface
- Compute distance to nearest meridian line (4–6 equally spaced longitude lines)
- Compute distance to equatorial line
- Use `smoothstep` for anti-aliased line width (~0.008 in UV space)
- Meridians: accent color at 35% opacity
- Equatorial: accent color at 60% opacity
- Fill: `vec3(0.02, 0.02, 0.04)` — near-black

**Rotation:** driven by `uniform float uTime` incremented in the animation loop. Slow — ~0.05 rad/s.

**Moon geometry:** same shader, `SphereGeometry(moonSize, 32, 32)`. Orbits computed in the animation loop via `sin/cos` on `uTime * orbitSpeed + orbitOffset`.

**Saturn special case:** flat torus ring mesh (`TorusGeometry`) in the same accent color, `MeshBasicMaterial`, tilted ~27°.

**Overview scene:** planets positioned on circular paths at compressed (not to-scale) distances from a central Sun mesh (small sphere, `#FFF8E0`, faint glow via `PointLight`). Moons orbit their planets in the overview. `OrbitControls` enabled — full mouse orbit, zoom, pan. Raycasting on planet meshes only (not moons) for hover and click detection.

---

## Source Layout

```
src/
├── lib/           — domain logic and math (obstacle projection, orbit math, planet data)
├── three/         — all Three.js code (scene, meshes, shaders, controls, transitions)
├── typography/    — all Pretext code (layout, line computation, PretextBlock component)
└── components/    — Vue UI components (App, SiteNav, HeroOverlay, PlanetDetail)
```

---

## Content

8 planet sections. Each has:
- Planet number (e.g. "No. 04 — Fourth Planet")
- Planet name
- 3–4 paragraphs of short editorial prose (impressionistic, not encyclopedic)

Prose is hardcoded in `src/data/planets.ts` — no CMS, no API.

---

## Build & Deploy

- **Bundler:** Vite
- **Hosting:** Static — deploy `dist/` to planets.guinetik.com (Netlify / Vercel / Cloudflare Pages)
- **Dependencies:** `vue`, `three`, `@chenglou/pretext`, `gsap`

---

## Out of Scope (MVP)

- The Sun as a selectable content target
- Dwarf planets
- Mobile/touch (desktop first)
- CMS or dynamic content
- Sound
- Realistic orbital mechanics or to-scale sizes
