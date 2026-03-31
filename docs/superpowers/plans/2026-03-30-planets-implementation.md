# Planets Hotsite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page interactive solar system magazine hotsite using Vue 3, Three.js, and Pretext — with per-frame text layout that wraps prose around 3D geometry obstacles (planet sphere, orbiting moons, Saturn's rings).

**Architecture:** A fullscreen Three.js canvas is always visible. Overview mode uses OrbitControls. Detail mode transitions the selected planet to fill the viewport height; Pretext re-lays out prose every animation frame using screen-projected 3D obstacles. All math lives in `src/lib` (pure, tested). Three.js code in `src/three` does only scene/mesh management — it calls lib for any computation. Pretext integration lives entirely in `src/typography`.

**Tech Stack:** Vue 3, Three.js r170+, @chenglou/pretext (local file dep), GSAP 3, Vite 6, Vitest, TypeScript

---

## File Map

```
src/
├── lib/
│   ├── constants.ts          — all named constants (no magic numbers anywhere else)
│   ├── planets.ts            — Planet/Moon types + full data (colors, prose, moon roster)
│   ├── orbit.ts              — pure orbit math: position from angle/radius/tilt
│   ├── orbit.test.ts
│   ├── projection.ts         — NDC→screen pixel math, screen radius, torus ellipse fit
│   ├── projection.test.ts
│   ├── obstacles.ts          — ScreenCircle/ScreenEllipse types, intrusion-at-Y functions
│   └── obstacles.test.ts
│
├── three/
│   ├── shaders/
│   │   ├── planet.vert.glsl  — pass uv/normal to fragment
│   │   └── planet.frag.glsl  — procedural meridians + equatorial line, uTime rotation
│   ├── scene.ts              — create renderer, camera, scene, resize handler
│   ├── planetMesh.ts         — factory: SphereGeometry + ShaderMaterial per planet
│   ├── moonMesh.ts           — factory: smaller sphere, same shader at lower opacity
│   ├── sunMesh.ts            — small emissive sphere + PointLight
│   ├── ringMesh.ts           — Saturn torus, MeshBasicMaterial, accent color
│   ├── controls.ts           — OrbitControls setup, raycaster, hover/click detection
│   └── transitions.ts        — GSAP timelines for overview↔detail
│
├── composables/
│   ├── useScene.ts           — owns renderer/camera/scene lifecycle, exposes rAF hook
│   ├── usePlanets.ts         — builds all meshes, drives orbit animation each frame
│   ├── useSceneState.ts      — state machine (overview|detail), triggers transitions
│   ├── useObstacles.ts       — projects active planet geometry to screen obstacles each frame
│   └── usePretextLayout.ts   — calls typography/layout.ts each frame, returns reactive lines
│
├── typography/
│   ├── layout.ts             — wraps Pretext layoutNextLine(); takes prose + obstacles → lines
│   └── PretextBlock.vue      — renders computed line array as <span> elements
│
└── components/
    ├── App.vue               — root: owns view state, wires composables
    ├── SceneCanvas.vue       — mounts <canvas>, initializes useScene
    ├── SiteNav.vue           — fixed header, wordmark, planet nav links
    ├── HeroOverlay.vue       — overview UI: title + "select a planet" prompt
    └── PlanetDetail.vue      — detail UI: planet name + PretextBlock
```

---

## Task 1: Build Pretext + Scaffold Project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.ts`

- [ ] **Step 1: Scaffold Vite + Vue project**

```bash
cd /d/Developer/planets
npm create vite@latest . -- --template vue-ts
# When prompted: select "Vue" and "TypeScript"
```

- [ ] **Step 2: Install dependencies**

```bash
npm install three gsap @chenglou/pretext
npm install --save-dev vitest @vitest/coverage-v8 jsdom @types/three
```

- [ ] **Step 3: Configure Vite**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/lib/**'] }
  }
})
```

- [ ] **Step 4: Configure TypeScript**

Replace `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "lib": ["ES2020", "DOM"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "vite.config.ts"]
}
```

- [ ] **Step 5: Stub index.html**

Replace `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Planets</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #app { width: 100%; height: 100%; overflow: hidden; background: #06060c; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #c8c0b4; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Stub main.ts**

```ts
// src/main.ts
import { createApp } from 'vue'
import App from './components/App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
# Expected: server running at http://localhost:5173
```

- [ ] **Step 8: Commit**

```bash
git init
echo "node_modules/\ndist/\n.superpowers/" > .gitignore
git add -A
git commit -m "feat: scaffold Vite + Vue project with pretext local dep"
```

---

## Task 2: Constants

**Files:**
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Write constants**

```ts
// src/lib/constants.ts

// ── Scene background ──────────────────────────────────────────────
export const BACKGROUND_COLOR = 0x06060c

// ── Typography ───────────────────────────────────────────────────
export const PROSE_FONT = '14px Georgia, serif'
export const PROSE_LINE_HEIGHT = 28        // px
export const TEXT_COLUMN_WIDTH = 520       // px, max prose column width
export const TEXT_COLUMN_LEFT_PX = 80      // px from left edge of viewport

// ── Transition timings ───────────────────────────────────────────
export const TRANSITION_DURATION_S = 0.8
export const TEXT_FADE_DURATION_S = 0.4
export const TEXT_FADE_DELAY_S = 0.5

// ── Planet rendering ─────────────────────────────────────────────
export const PLANET_SPHERE_SEGMENTS = 64
export const PLANET_ROTATION_SPEED = 0.05          // rad/s
export const PLANET_MERIDIAN_COUNT = 5
export const PLANET_LINE_WIDTH_UV = 0.008          // UV-space line thickness
export const PLANET_MERIDIAN_OPACITY = 0.35
export const PLANET_EQUATOR_OPACITY = 0.60
export const PLANET_FILL_COLOR = { r: 0.02, g: 0.02, b: 0.04 }

// ── Moon rendering ───────────────────────────────────────────────
export const MOON_SPHERE_SEGMENTS = 32
export const MOON_OPACITY = 0.5
export const MOON_ROTATION_SPEED = 0.12            // rad/s

// ── Saturn ring ──────────────────────────────────────────────────
export const RING_TUBE_SEGMENTS = 64
export const RING_RADIAL_SEGMENTS = 8
export const RING_TILT_RADIANS = 0.47              // ~27°
export const RING_INNER_RATIO = 1.4                // inner radius as × planet radius
export const RING_OUTER_RATIO = 2.2                // outer radius as × planet radius
export const RING_TUBE_RATIO = 0.06                // tube radius as × planet radius
export const RING_OPACITY = 0.4

// ── Overview scene ───────────────────────────────────────────────
export const SUN_RADIUS = 0.6
export const SUN_COLOR = 0xfff8e0
export const SUN_LIGHT_INTENSITY = 0.4
export const ORBIT_LINE_OPACITY = 0.06
export const OVERVIEW_CAMERA_FOV = 60
export const OVERVIEW_CAMERA_Z = 22
export const OVERVIEW_CAMERA_NEAR = 0.1
export const OVERVIEW_CAMERA_FAR = 1000

// ── Detail scene ─────────────────────────────────────────────────
export const DETAIL_PLANET_SCREEN_HEIGHT_RATIO = 0.85   // planet fills 85% of viewport height
export const DETAIL_PLANET_X_RATIO = 0.28               // planet center at 28% from right edge
export const DETAIL_CAMERA_Z = 5

// ── Raycasting ───────────────────────────────────────────────────
export const RAYCAST_HOVER_SCALE = 1.08
export const RAYCAST_HOVER_TRANSITION_S = 0.2

// ── Overview planet layout (orbit radii in world units) ──────────
export const OVERVIEW_ORBITS: Record<string, number> = {
  mercury: 2.2,
  venus:   3.2,
  earth:   4.4,
  mars:    5.6,
  jupiter: 7.4,
  saturn:  9.2,
  uranus:  11.0,
  neptune: 12.6,
}

// ── Overview planet sizes (world-space radius) ───────────────────
export const OVERVIEW_SIZES: Record<string, number> = {
  mercury: 0.12,
  venus:   0.18,
  earth:   0.20,
  mars:    0.16,
  jupiter: 0.40,
  saturn:  0.34,
  uranus:  0.26,
  neptune: 0.24,
}

// ── Detail planet sizes (world-space radius at detail camera Z) ──
export const DETAIL_SIZES: Record<string, number> = {
  mercury: 1.0,
  venus:   1.0,
  earth:   1.0,
  mars:    1.0,
  jupiter: 1.0,
  saturn:  1.0,
  uranus:  1.0,
  neptune: 1.0,
}

// ── Accent colors (hex strings) ───────────────────────────────────
export const ACCENT_COLORS: Record<string, string> = {
  mercury: '#B0A898',
  venus:   '#D4B96A',
  earth:   '#6AA4D4',
  mars:    '#C87840',
  jupiter: '#C8A878',
  saturn:  '#D4C890',
  uranus:  '#78C8D4',
  neptune: '#5068C8',
}

// ── Torus sample count for ring screen-ellipse fitting ───────────
export const RING_PROJECTION_SAMPLES = 32

// ── Overview animation ───────────────────────────────────────────
export const OVERVIEW_ORBIT_SPEED = 0.008      // world-orbit angular drift, rad/s

// ── Detail text layout ───────────────────────────────────────────
export const PROSE_TOP_Y_PX = 220              // px from top of viewport where prose begins
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add named constants (no magic numbers)"
```

---

## Task 3: Planet Data

**Files:**
- Create: `src/lib/planets.ts`

- [ ] **Step 1: Write types and data**

```ts
// src/lib/planets.ts

export interface Moon {
  readonly name: string
  readonly orbitRadius: number   // world units, relative to planet detail radius = 1
  readonly orbitSpeed: number    // radians/second
  readonly size: number          // world units
  readonly orbitTilt: number     // radians
  readonly orbitOffset: number   // initial angle offset, radians
}

export interface Planet {
  readonly id: string
  readonly name: string
  readonly order: number
  readonly accentColor: string
  readonly prose: readonly string[]   // editorial paragraphs
  readonly moons: readonly Moon[]
}

export const PLANETS: readonly Planet[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    order: 1,
    accentColor: '#B0A898',
    prose: [
      'It is the smallest of the eight, and the fastest — a world that completes its year in eighty-eight of ours, yet turns so slowly that its day outlasts its year. Mercury does not so much orbit the sun as flee it, racing along an ellipse so eccentric that the sun swells and shrinks visibly in its sky.',
      'The surface is a record of early violence: craters upon craters, cliffs hundreds of kilometres long where the planet's crust buckled as the interior cooled and contracted. There is no atmosphere to speak of, no wind to smooth the ancient scars. What the sun strikes blazes at four hundred degrees; what hides in shadow drops to negative one hundred and eighty. No other world spans so extreme a range within a single rotation.',
      'Radar maps have found ice inside permanently shadowed craters at the poles — water that has not seen sunlight in perhaps four billion years, preserved by the same darkness that makes those places the coldest locations in the inner solar system.',
    ],
    moons: [],
  },
  {
    id: 'venus',
    name: 'Venus',
    order: 2,
    accentColor: '#D4B96A',
    prose: [
      'Venus is the planet that went wrong. From the outside it is the most beautiful object in the night sky after the moon — brilliant, steady, arriving before the stars. From the inside it is a furnace: surface pressure ninety times that of Earth's atmosphere, temperatures that melt lead, clouds of sulfuric acid cycling endlessly in winds that never stop.',
      'It rotates backwards relative to almost every other body in the solar system, and so slowly that the sun rises in the west and sets in the east over the course of a Venusian day longer than its year. The mechanism behind this retrograde crawl remains debated — a relic of an ancient collision, perhaps, or the tidal drag of that immense atmosphere over geological time.',
      'Beneath the clouds, radar mapping has revealed a world reshaped relatively recently — five hundred million years ago at most, by geological standards almost yesterday. Something reset the surface. The planet exhaled, turned itself inside out, and began again.',
    ],
    moons: [],
  },
  {
    id: 'earth',
    name: 'Earth',
    order: 3,
    accentColor: '#6AA4D4',
    prose: [
      'Seen from the right distance it is unremarkable: a blue marble, third stone from an ordinary star, one of eight in a solar system unremarkable among four hundred billion in this galaxy alone. But it is the one we know from inside, which changes everything.',
      'The atmosphere is a thin, improbable skin — less than two percent of the planet's radius — and it is kept in its present chemical state entirely by life. Without biology, the oxygen would vanish into rust and carbonate within a few million years. The sky stays blue because something keeps exhaling.',
      'The Moon is too large for coincidence. It stabilises the axial tilt that gives us seasons rather than chaos. It drives tides that may have stirred the first chemistry. At this moment in geological time it appears, from Earth's surface, almost precisely the size of the sun — a coincidence that produces total eclipses, and that will end as the Moon slowly spirals outward, one centimetre per year, away from us.',
    ],
    moons: [
      { name: 'Moon', orbitRadius: 2.4, orbitSpeed: 0.18, size: 0.27, orbitTilt: 0.09, orbitOffset: 0 },
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    order: 4,
    accentColor: '#C87840',
    prose: [
      'It is a cold world, rust-coloured and still, where the wind carves canyons over millennia and frost retreats each morning from the shadows of ancient calderas. The sky at noon is the colour of a bruise — a pale butterscotch haze of iron dust suspended in an atmosphere less than one percent as thick as ours.',
      'Olympus Mons is a volcano three times the height of Everest and wide enough that if you stood at its base, the summit would be below the horizon. Valles Marineris is a canyon system that would span North America. Mars achieves its record scales partly because it has no plate tectonics — volcanism pours into the same spot for billions of years, building without interruption.',
      'Two moons too small to cast a proper shadow: Phobos rises in the west and sets in the east, orbiting so low that the horizon cuts across it. Deimos drifts so slowly it is barely distinguishable from a slow star. Both are probably captured asteroids, and Phobos is spiralling inward — in thirty million years it will either crash into Mars or break apart into a brief, thin ring.',
    ],
    moons: [
      { name: 'Phobos', orbitRadius: 2.0, orbitSpeed: 0.72, size: 0.08, orbitTilt: 0.02, orbitOffset: 0 },
      { name: 'Deimos', orbitRadius: 3.2, orbitSpeed: 0.31, size: 0.05, orbitTilt: 0.06, orbitOffset: 2.1 },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    order: 5,
    accentColor: '#C8A878',
    prose: [
      'Jupiter is not quite a planet in the ordinary sense — it is a failed star, a world so massive that it radiates more heat than it receives from the sun, still contracting slowly from the energy of its own formation four and a half billion years ago. Had it been eighty times heavier it would have ignited.',
      'The Great Red Spot is a storm that has been observed continuously for over three hundred and fifty years. It is currently shrinking; in the time of the first telescopic astronomers it was three times the diameter of Earth. What it will look like in another century is unknown. Beneath it, and beneath all the visible bands and belts, the planet grades without any distinct surface from gas to liquid to metallic hydrogen conducting electricity like a wire, generating a magnetic field fourteen times stronger than Earth's.',
      'The four Galilean moons are worlds in themselves. Io is the most volcanically active body in the solar system, resurfaced continuously by tidal heating. Europa conceals a liquid ocean beneath its ice. Ganymede is larger than Mercury. Callisto is a record of four billion years of impacts, unchanged.',
    ],
    moons: [
      { name: 'Io',       orbitRadius: 2.2, orbitSpeed: 0.60, size: 0.16, orbitTilt: 0.00, orbitOffset: 0.0 },
      { name: 'Europa',   orbitRadius: 3.0, orbitSpeed: 0.42, size: 0.14, orbitTilt: 0.01, orbitOffset: 1.6 },
      { name: 'Ganymede', orbitRadius: 4.0, orbitSpeed: 0.28, size: 0.20, orbitTilt: 0.02, orbitOffset: 3.1 },
      { name: 'Callisto', orbitRadius: 5.2, orbitSpeed: 0.18, size: 0.18, orbitTilt: 0.03, orbitOffset: 4.7 },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    order: 6,
    accentColor: '#D4C890',
    prose: [
      'The rings are the first thing anyone notices, and the last thing they forget. They are almost entirely water ice — fragments ranging from grains of frost to boulders the size of houses — arranged into a structure nearly three hundred thousand kilometres wide but averaging only ten metres thick. Seen edge-on they nearly vanish.',
      'Saturn is the least dense planet in the solar system. Given a large enough ocean, it would float. Its winds reach eighteen hundred kilometres per hour at the equator; its poles host persistent hexagonal storm systems whose geometry has no clear explanation. The planet hums with radio emissions; its magnetic field is almost perfectly aligned with its rotation axis, which is itself unusual and unexplained.',
      'Titan is the only moon with a dense atmosphere and the only world other than Earth with stable surface liquids — seas of liquid methane and ethane, fed by methane rain, draining into rivers that flow into hydrocarbon coastlines. Beneath Titan's surface, and beneath the smooth ice of Enceladus, liquid water waits in the dark.',
    ],
    moons: [
      { name: 'Titan',     orbitRadius: 4.5, orbitSpeed: 0.14, size: 0.22, orbitTilt: 0.02, orbitOffset: 0.0 },
      { name: 'Enceladus', orbitRadius: 2.8, orbitSpeed: 0.38, size: 0.09, orbitTilt: 0.01, orbitOffset: 2.4 },
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    order: 7,
    accentColor: '#78C8D4',
    prose: [
      'Uranus rolls around the sun on its side, its axis tilted ninety-eight degrees from the plane of its orbit. One pole spends forty-two years in continuous sunlight; the other spends the same period in total darkness. Something struck it long ago, hard enough to knock it sideways, and it has been tipped ever since.',
      'It is the coldest planetary atmosphere in the solar system, despite being closer to the sun than Neptune — a fact that remains unexplained. The methane in its upper atmosphere absorbs red light and reflects blue-green back into space, giving it its characteristic colour. Beneath the gas lies what planetary scientists call an ice giant interior: a dense, hot fluid of water, methane, and ammonia under pressures high enough to produce diamond rain.',
      'Uranus has a faint system of rings, discovered only in 1977 when it passed in front of a star and the starlight winked out before and after the planet itself blocked it. The rings are dark as coal, narrow, and shepherded by small moons. Its larger moons are named for characters from Shakespeare and Pope.',
    ],
    moons: [
      { name: 'Titania', orbitRadius: 3.6, orbitSpeed: 0.22, size: 0.15, orbitTilt: 1.57, orbitOffset: 0.0 },
      { name: 'Oberon',  orbitRadius: 4.6, orbitSpeed: 0.16, size: 0.14, orbitTilt: 1.57, orbitOffset: 2.0 },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    order: 8,
    accentColor: '#5068C8',
    prose: [
      'Neptune was found by mathematics before it was found by telescope. Irregularities in the orbit of Uranus implied something unseen pulling at it from beyond; the position was calculated, the telescope turned, and there it was — exactly where it was predicted to be, in 1846, the first planet discovered by pure prediction.',
      'It is a world of wind. The fastest sustained winds in the solar system move at over two thousand kilometres per hour in Neptune's atmosphere, in the opposite direction to the planet's rotation. A storm system called the Great Dark Spot, analogous to Jupiter's Great Red Spot, was observed by Voyager 2 in 1989 and had disappeared by 1994, replaced by another in the northern hemisphere by 1995. Neptune's weather is dynamic in a way that suggests a significant internal heat source, for a world so far from the sun.',
      'Triton orbits backwards. Of all the large moons in the solar system, only Triton revolves in the direction opposite to its planet's rotation — a strong indication that it was captured from the outer solar system, perhaps from the same reservoir that gave us Pluto. The tidal forces generated by this retrograde orbit are slowly spiralling Triton inward. In perhaps three and a half billion years it will cross the Roche limit and shatter into a ring.',
    ],
    moons: [
      { name: 'Triton', orbitRadius: 2.8, orbitSpeed: -0.24, size: 0.18, orbitTilt: 0.50, orbitOffset: 0.0 },
    ],
  },
]

export const PLANET_IDS = PLANETS.map(p => p.id)

export function getPlanet(id: string): Planet {
  const planet = PLANETS.find(p => p.id === id)
  if (!planet) throw new Error(`Unknown planet id: ${id}`)
  return planet
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/planets.ts
git commit -m "feat: add planet + moon data model with editorial prose"
```

---

## Task 4: Orbit Math

**Files:**
- Create: `src/lib/orbit.ts`
- Create: `src/lib/orbit.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/orbit.test.ts
import { describe, it, expect } from 'vitest'
import { orbitPosition, moonOrbitAngle } from './orbit'

describe('orbitPosition', () => {
  it('places object at (radius, 0, 0) when angle=0 and tilt=0', () => {
    const pos = orbitPosition(5, 0, 0)
    expect(pos.x).toBeCloseTo(5)
    expect(pos.y).toBeCloseTo(0)
    expect(pos.z).toBeCloseTo(0)
  })

  it('places object at (0, 0, -radius) when angle=PI/2 and tilt=0', () => {
    const pos = orbitPosition(5, Math.PI / 2, 0)
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(0)
    expect(pos.z).toBeCloseTo(-5)
  })

  it('applies tilt by rotating the orbit plane around the x-axis', () => {
    const pos = orbitPosition(5, Math.PI / 2, Math.PI / 2)
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(5)
    expect(pos.z).toBeCloseTo(0)
  })

  it('returns origin for radius=0', () => {
    const pos = orbitPosition(0, 1.23, 0.5)
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(0)
    expect(pos.z).toBeCloseTo(0)
  })
})

describe('moonOrbitAngle', () => {
  it('returns offset when time=0', () => {
    expect(moonOrbitAngle(0.5, 0, 1.2)).toBeCloseTo(1.2)
  })

  it('advances by speed * time', () => {
    expect(moonOrbitAngle(0.5, 4, 0)).toBeCloseTo(2.0)
  })

  it('supports negative speed (retrograde orbit)', () => {
    expect(moonOrbitAngle(-0.3, 2, 0)).toBeCloseTo(-0.6)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/orbit.test.ts
# Expected: FAIL — orbit.ts not found
```

- [ ] **Step 3: Implement orbit.ts**

```ts
// src/lib/orbit.ts

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/**
 * Computes a position on a circular orbit in the XZ plane, tilted around X.
 * angle=0 places the object at (radius, 0, 0).
 * tilt rotates the orbit plane around the X axis.
 */
export function orbitPosition(radius: number, angle: number, tilt: number): Vec3 {
  const flatX = radius * Math.cos(angle)
  const flatZ = -radius * Math.sin(angle)
  return {
    x: flatX,
    y: flatZ * Math.sin(tilt),
    z: flatZ * Math.cos(tilt),
  }
}

/**
 * Returns the current orbit angle for a moon given its speed, elapsed time, and initial offset.
 * Negative speed = retrograde orbit.
 */
export function moonOrbitAngle(speed: number, time: number, offset: number): number {
  return speed * time + offset
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/orbit.test.ts
# Expected: PASS (4 tests)
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/orbit.ts src/lib/orbit.test.ts
git commit -m "feat: add orbit math with tests"
```

---

## Task 5: Projection Math

**Files:**
- Create: `src/lib/projection.ts`
- Create: `src/lib/projection.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/projection.test.ts
import { describe, it, expect } from 'vitest'
import {
  ndcToScreen,
  screenRadius,
  fitEllipseToNDCPoints,
  type NDCPoint,
  type Viewport,
} from './projection'

const viewport: Viewport = { width: 1000, height: 600 }

describe('ndcToScreen', () => {
  it('maps NDC (-1,-1) to top-left screen corner', () => {
    const p = ndcToScreen({ x: -1, y: 1 }, viewport)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
  })

  it('maps NDC (1,-1) to bottom-right screen corner', () => {
    const p = ndcToScreen({ x: 1, y: -1 }, viewport)
    expect(p.x).toBeCloseTo(1000)
    expect(p.y).toBeCloseTo(600)
  })

  it('maps NDC (0,0) to screen center', () => {
    const p = ndcToScreen({ x: 0, y: 0 }, viewport)
    expect(p.x).toBeCloseTo(500)
    expect(p.y).toBeCloseTo(300)
  })
})

describe('screenRadius', () => {
  it('returns half the screen-space distance between center and edge NDC points', () => {
    // center at NDC (0,0) = screen (500,300)
    // edge at NDC (0.2,0) — moves right by 0.2 NDC units = 0.1 * 1000 = 100px
    const center: NDCPoint = { x: 0, y: 0 }
    const edge: NDCPoint = { x: 0.2, y: 0 }
    const r = screenRadius(center, edge, viewport)
    expect(r).toBeCloseTo(100)
  })
})

describe('fitEllipseToNDCPoints', () => {
  it('returns bounding ellipse that contains all projected points', () => {
    // A horizontal ring of NDC points: x varies, y=0
    const points: NDCPoint[] = [
      { x: -0.2, y: 0 },
      { x:  0.2, y: 0 },
      { x:  0,   y: -0.1 },
      { x:  0,   y:  0.1 },
    ]
    const ellipse = fitEllipseToNDCPoints(points, viewport)
    expect(ellipse.cx).toBeCloseTo(500)
    expect(ellipse.cy).toBeCloseTo(300)
    expect(ellipse.rx).toBeGreaterThanOrEqual(100)
    expect(ellipse.ry).toBeGreaterThanOrEqual(30)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/projection.test.ts
# Expected: FAIL — projection.ts not found
```

- [ ] **Step 3: Implement projection.ts**

```ts
// src/lib/projection.ts

export interface NDCPoint {
  readonly x: number
  readonly y: number
}

export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

export interface Viewport {
  readonly width: number
  readonly height: number
}

export interface ScreenEllipse {
  readonly cx: number
  readonly cy: number
  readonly rx: number
  readonly ry: number
}

/**
 * Converts a WebGL NDC point to screen pixel coordinates.
 * NDC: x in [-1,1] left→right, y in [-1,1] bottom→top.
 * Screen: x in [0,width] left→right, y in [0,height] top→bottom.
 */
export function ndcToScreen(ndc: NDCPoint, viewport: Viewport): ScreenPoint {
  return {
    x: (ndc.x + 1) / 2 * viewport.width,
    y: (-ndc.y + 1) / 2 * viewport.height,
  }
}

/**
 * Returns the screen-pixel distance between a projected center and edge NDC point.
 * Use this to convert a world-space sphere radius into screen pixels.
 */
export function screenRadius(centerNDC: NDCPoint, edgeNDC: NDCPoint, viewport: Viewport): number {
  const c = ndcToScreen(centerNDC, viewport)
  const e = ndcToScreen(edgeNDC, viewport)
  return Math.sqrt((e.x - c.x) ** 2 + (e.y - c.y) ** 2)
}

/**
 * Fits a bounding ellipse to a set of NDC points.
 * Used to find the screen-space bounding ellipse of Saturn's projected ring torus.
 */
export function fitEllipseToNDCPoints(points: NDCPoint[], viewport: Viewport): ScreenEllipse {
  const screen = points.map(p => ndcToScreen(p, viewport))
  const xs = screen.map(p => p.x)
  const ys = screen.map(p => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: (maxX - minX) / 2,
    ry: (maxY - minY) / 2,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/projection.test.ts
# Expected: PASS (5 tests)
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/projection.ts src/lib/projection.test.ts
git commit -m "feat: add NDC→screen projection math with tests"
```

---

## Task 6: Obstacle Math

**Files:**
- Create: `src/lib/obstacles.ts`
- Create: `src/lib/obstacles.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/obstacles.test.ts
import { describe, it, expect } from 'vitest'
import {
  circleIntrusionAtY,
  ellipseIntrusionAtY,
  maxIntrusionAtY,
  type ScreenCircle,
  type ScreenEllipse,
  type Obstacle,
} from './obstacles'

describe('circleIntrusionAtY', () => {
  const circle: ScreenCircle = { cx: 800, cy: 300, r: 100 }

  it('returns 0 when y is above the circle', () => {
    expect(circleIntrusionAtY(circle, 100)).toBe(0)
  })

  it('returns 0 when y is below the circle', () => {
    expect(circleIntrusionAtY(circle, 500)).toBe(0)
  })

  it('returns full radius at the equator (y = cy)', () => {
    expect(circleIntrusionAtY(circle, 300)).toBeCloseTo(100)
  })

  it('returns correct chord half-width at arbitrary y', () => {
    // At y = cy + r/2 (60px above equator), chord half-width = sqrt(r²-(r/2)²) = sqrt(7500) ≈ 86.6
    expect(circleIntrusionAtY(circle, 240)).toBeCloseTo(Math.sqrt(100 ** 2 - 60 ** 2))
  })

  it('only counts intrusion from the left side (returns leftmost x distance from cx)', () => {
    // cx=800, so intrusion is (cx + chord) - textColumnRight
    // The function returns chord half-width, caller subtracts from column width
    expect(circleIntrusionAtY(circle, 300)).toBeCloseTo(100)
  })
})

describe('ellipseIntrusionAtY', () => {
  const ellipse: ScreenEllipse = { cx: 800, cy: 300, rx: 150, ry: 80 }

  it('returns 0 when y is outside the ellipse vertically', () => {
    expect(ellipseIntrusionAtY(ellipse, 100)).toBe(0)
  })

  it('returns rx at the center y', () => {
    expect(ellipseIntrusionAtY(ellipse, 300)).toBeCloseTo(150)
  })

  it('returns correct half-width at arbitrary y', () => {
    // At y = cy + ry/2 = 340: x_half = rx * sqrt(1 - (ry/2/ry)²) = 150 * sqrt(0.75) ≈ 129.9
    expect(ellipseIntrusionAtY(ellipse, 340)).toBeCloseTo(150 * Math.sqrt(0.75))
  })
})

describe('maxIntrusionAtY', () => {
  it('returns 0 for empty obstacles', () => {
    expect(maxIntrusionAtY([], 300)).toBe(0)
  })

  it('returns max of all obstacle intrusions at y', () => {
    const obstacles: Obstacle[] = [
      { kind: 'circle', cx: 800, cy: 300, r: 60 },
      { kind: 'circle', cx: 800, cy: 300, r: 100 },
    ]
    expect(maxIntrusionAtY(obstacles, 300)).toBeCloseTo(100)
  })

  it('handles mixed circle and ellipse obstacles', () => {
    const obstacles: Obstacle[] = [
      { kind: 'circle',  cx: 800, cy: 300, r: 60 },
      { kind: 'ellipse', cx: 800, cy: 300, rx: 90, ry: 50 },
    ]
    expect(maxIntrusionAtY(obstacles, 300)).toBeCloseTo(90)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/obstacles.test.ts
# Expected: FAIL — obstacles.ts not found
```

- [ ] **Step 3: Implement obstacles.ts**

```ts
// src/lib/obstacles.ts
import type { ScreenEllipse } from './projection'

export interface ScreenCircle {
  readonly kind: 'circle'
  readonly cx: number
  readonly cy: number
  readonly r: number
}

export interface ScreenEllipseObstacle extends ScreenEllipse {
  readonly kind: 'ellipse'
}

export type Obstacle = ScreenCircle | ScreenEllipseObstacle

/**
 * Returns the half-width of a circle's chord at a given screen y.
 * This is the horizontal distance from the circle center to its edge at that scanline.
 * Returns 0 if y is outside the circle's vertical span.
 */
export function circleIntrusionAtY(circle: ScreenCircle, y: number): number {
  const dy = y - circle.cy
  if (Math.abs(dy) > circle.r) return 0
  return Math.sqrt(circle.r ** 2 - dy ** 2)
}

/**
 * Returns the half-width of an ellipse's chord at a given screen y.
 * Returns 0 if y is outside the ellipse's vertical span.
 */
export function ellipseIntrusionAtY(ellipse: ScreenEllipse, y: number): number {
  const dy = y - ellipse.cy
  if (Math.abs(dy) > ellipse.ry) return 0
  return ellipse.rx * Math.sqrt(1 - (dy / ellipse.ry) ** 2)
}

/**
 * Returns the maximum horizontal intrusion of all obstacles at a given screen y.
 * This is the value to subtract from the text column's maxWidth for that line.
 */
export function maxIntrusionAtY(obstacles: Obstacle[], y: number): number {
  let max = 0
  for (const obs of obstacles) {
    const intrusion =
      obs.kind === 'circle'
        ? circleIntrusionAtY(obs, y)
        : ellipseIntrusionAtY(obs, y)
    if (intrusion > max) max = intrusion
  }
  return max
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/obstacles.test.ts
# Expected: PASS (9 tests)
```

- [ ] **Step 5: Run full lib test suite**

```bash
npx vitest run src/lib/
# Expected: PASS (all orbit + projection + obstacles tests)
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/obstacles.ts src/lib/obstacles.test.ts
git commit -m "feat: add screen-space obstacle math with tests"
```

---

## Task 7: Planet Shader

**Files:**
- Create: `src/three/shaders/planet.vert.glsl`
- Create: `src/three/shaders/planet.frag.glsl`

- [ ] **Step 1: Write vertex shader**

```glsl
// src/three/shaders/planet.vert.glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

- [ ] **Step 2: Write fragment shader**

```glsl
// src/three/shaders/planet.frag.glsl
uniform float uTime;
uniform vec3  uAccentColor;
uniform float uMeridianCount;
uniform float uLineWidthUV;
uniform float uMeridianOpacity;
uniform float uEquatorOpacity;

varying vec2 vUv;

const float PI        = 3.14159265359;
const vec3  FILL_COLOR = vec3(0.02, 0.02, 0.04);
const float ROTATION_SPEED = 0.05;   // rad/s — must match PLANET_ROTATION_SPEED in constants.ts

float lineStrength(float value, float period, float halfWidth) {
  float wrapped = mod(value, period);
  float dist = min(wrapped, period - wrapped);
  return 1.0 - smoothstep(0.0, halfWidth, dist);
}

void main() {
  float lon = mod(vUv.x + uTime * ROTATION_SPEED / (2.0 * PI), 1.0);
  float lat = vUv.y;

  float meridianStrength = lineStrength(lon, 1.0 / uMeridianCount, uLineWidthUV);
  float equatorDist      = abs(lat - 0.5);
  float equatorStrength  = 1.0 - smoothstep(0.0, uLineWidthUV * 0.5, equatorDist);

  float lineAlpha = max(meridianStrength * uMeridianOpacity, equatorStrength * uEquatorOpacity);
  vec3  color     = mix(FILL_COLOR, uAccentColor, lineAlpha);

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 3: Add GLSL type declarations for Vite**

Create `src/three/shaders/glsl.d.ts`:
```ts
declare module '*.vert.glsl' { const src: string; export default src }
declare module '*.frag.glsl' { const src: string; export default src }
```

- [ ] **Step 4: Commit**

```bash
git add src/three/shaders/
git commit -m "feat: add procedural planet GLSL shader (meridians + equatorial line)"
```

---

## Task 8: Planet Mesh Factory

**Files:**
- Create: `src/three/planetMesh.ts`

- [ ] **Step 1: Write planet mesh factory**

```ts
// src/three/planetMesh.ts
import * as THREE from 'three'
import vertSrc from './shaders/planet.vert.glsl?raw'
import fragSrc from './shaders/planet.frag.glsl?raw'
import {
  PLANET_SPHERE_SEGMENTS,
  PLANET_MERIDIAN_COUNT,
  PLANET_LINE_WIDTH_UV,
  PLANET_MERIDIAN_OPACITY,
  PLANET_EQUATOR_OPACITY,
} from '@/lib/constants'

export interface PlanetMeshUniforms {
  uTime: THREE.IUniform<number>
  uAccentColor: THREE.IUniform<THREE.Color>
  uMeridianCount: THREE.IUniform<number>
  uLineWidthUV: THREE.IUniform<number>
  uMeridianOpacity: THREE.IUniform<number>
  uEquatorOpacity: THREE.IUniform<number>
}

export interface PlanetMesh {
  mesh: THREE.Mesh
  uniforms: PlanetMeshUniforms
}

export function createPlanetMesh(accentHex: string, radius: number): PlanetMesh {
  const uniforms: PlanetMeshUniforms = {
    uTime:            { value: 0 },
    uAccentColor:     { value: new THREE.Color(accentHex) },
    uMeridianCount:   { value: PLANET_MERIDIAN_COUNT },
    uLineWidthUV:     { value: PLANET_LINE_WIDTH_UV },
    uMeridianOpacity: { value: PLANET_MERIDIAN_OPACITY },
    uEquatorOpacity:  { value: PLANET_EQUATOR_OPACITY },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader:   vertSrc,
    fragmentShader: fragSrc,
    uniforms,
    transparent: false,
  })

  const geometry = new THREE.SphereGeometry(radius, PLANET_SPHERE_SEGMENTS, PLANET_SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  return { mesh, uniforms }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/three/planetMesh.ts
git commit -m "feat: add planet mesh factory with ShaderMaterial"
```

---

## Task 9: Moon, Sun, and Ring Mesh Factories

**Files:**
- Create: `src/three/moonMesh.ts`
- Create: `src/three/sunMesh.ts`
- Create: `src/three/ringMesh.ts`

- [ ] **Step 1: Write moon mesh factory**

```ts
// src/three/moonMesh.ts
import * as THREE from 'three'
import vertSrc from './shaders/planet.vert.glsl?raw'
import fragSrc from './shaders/planet.frag.glsl?raw'
import {
  MOON_SPHERE_SEGMENTS,
  MOON_OPACITY,
  PLANET_MERIDIAN_COUNT,
  PLANET_LINE_WIDTH_UV,
  PLANET_MERIDIAN_OPACITY,
  PLANET_EQUATOR_OPACITY,
} from '@/lib/constants'
import type { PlanetMeshUniforms } from './planetMesh'

export interface MoonMesh {
  mesh: THREE.Mesh
  uniforms: PlanetMeshUniforms
}

export function createMoonMesh(accentHex: string, radius: number): MoonMesh {
  const uniforms: PlanetMeshUniforms = {
    uTime:            { value: 0 },
    uAccentColor:     { value: new THREE.Color(accentHex) },
    uMeridianCount:   { value: PLANET_MERIDIAN_COUNT },
    uLineWidthUV:     { value: PLANET_LINE_WIDTH_UV },
    uMeridianOpacity: { value: PLANET_MERIDIAN_OPACITY * MOON_OPACITY },
    uEquatorOpacity:  { value: PLANET_EQUATOR_OPACITY * MOON_OPACITY },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader:   vertSrc,
    fragmentShader: fragSrc,
    uniforms,
    transparent: true,
    opacity: MOON_OPACITY,
  })

  const geometry = new THREE.SphereGeometry(radius, MOON_SPHERE_SEGMENTS, MOON_SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  return { mesh, uniforms }
}
```

- [ ] **Step 2: Write sun mesh factory**

```ts
// src/three/sunMesh.ts
import * as THREE from 'three'
import { SUN_RADIUS, SUN_COLOR, SUN_LIGHT_INTENSITY } from '@/lib/constants'

export interface SunObjects {
  mesh: THREE.Mesh
  light: THREE.PointLight
}

export function createSunMesh(): SunObjects {
  const geometry = new THREE.SphereGeometry(SUN_RADIUS, 32, 32)
  const material = new THREE.MeshBasicMaterial({
    color: SUN_COLOR,
    transparent: true,
    opacity: 0.9,
  })
  const mesh = new THREE.Mesh(geometry, material)

  const light = new THREE.PointLight(SUN_COLOR, SUN_LIGHT_INTENSITY, 100)
  mesh.add(light)

  return { mesh, light }
}
```

- [ ] **Step 3: Write ring mesh factory**

```ts
// src/three/ringMesh.ts
import * as THREE from 'three'
import {
  RING_TUBE_SEGMENTS,
  RING_RADIAL_SEGMENTS,
  RING_TILT_RADIANS,
  RING_INNER_RATIO,
  RING_OUTER_RATIO,
  RING_TUBE_RATIO,
  RING_OPACITY,
} from '@/lib/constants'

export function createRingMesh(accentHex: string, planetRadius: number): THREE.Mesh {
  const avgRadius = ((RING_INNER_RATIO + RING_OUTER_RATIO) / 2) * planetRadius
  const tubeRadius = RING_TUBE_RATIO * planetRadius

  const geometry = new THREE.TorusGeometry(avgRadius, tubeRadius, RING_RADIAL_SEGMENTS, RING_TUBE_SEGMENTS)
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentHex),
    transparent: true,
    opacity: RING_OPACITY,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = RING_TILT_RADIANS
  return mesh
}
```

- [ ] **Step 4: Commit**

```bash
git add src/three/moonMesh.ts src/three/sunMesh.ts src/three/ringMesh.ts
git commit -m "feat: add moon, sun, and ring mesh factories"
```

---

## Task 10: Scene Setup + useScene Composable

**Files:**
- Create: `src/three/scene.ts`
- Create: `src/composables/useScene.ts`

- [ ] **Step 1: Write scene.ts**

```ts
// src/three/scene.ts
import * as THREE from 'three'
import {
  BACKGROUND_COLOR,
  OVERVIEW_CAMERA_FOV,
  OVERVIEW_CAMERA_Z,
  OVERVIEW_CAMERA_NEAR,
  OVERVIEW_CAMERA_FAR,
} from '@/lib/constants'

export interface SceneObjects {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
}

export function createScene(canvas: HTMLCanvasElement): SceneObjects {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BACKGROUND_COLOR)

  const camera = new THREE.PerspectiveCamera(
    OVERVIEW_CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    OVERVIEW_CAMERA_NEAR,
    OVERVIEW_CAMERA_FAR,
  )
  camera.position.z = OVERVIEW_CAMERA_Z

  return { scene, camera, renderer }
}

export function handleResize(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
```

- [ ] **Step 2: Write useScene composable**

```ts
// src/composables/useScene.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { createScene, handleResize, type SceneObjects } from '@/three/scene'

type FrameCallback = (time: number, delta: number) => void

export function useScene(canvasRef: Readonly<{ value: HTMLCanvasElement | null }>) {
  const sceneObjects = ref<SceneObjects | null>(null)
  const frameCallbacks = new Set<FrameCallback>()
  let animationId = 0
  let lastTime = 0

  function onFrame(callback: FrameCallback): void {
    frameCallbacks.add(callback)
  }

  function tick(time: number): void {
    const delta = (time - lastTime) / 1000
    lastTime = time
    for (const cb of frameCallbacks) cb(time / 1000, delta)
    const { renderer, scene, camera } = sceneObjects.value!
    renderer.render(scene, camera)
    animationId = requestAnimationFrame(tick)
  }

  function onResize(): void {
    if (!sceneObjects.value) return
    handleResize(sceneObjects.value.camera, sceneObjects.value.renderer)
  }

  onMounted(() => {
    if (!canvasRef.value) return
    sceneObjects.value = createScene(canvasRef.value)
    window.addEventListener('resize', onResize)
    animationId = requestAnimationFrame(tick)
  })

  onUnmounted(() => {
    cancelAnimationFrame(animationId)
    window.removeEventListener('resize', onResize)
    sceneObjects.value?.renderer.dispose()
  })

  return { sceneObjects, onFrame }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/three/scene.ts src/composables/useScene.ts
git commit -m "feat: add Three.js scene setup and useScene composable"
```

---

## Task 11: usePlanets Composable

**Files:**
- Create: `src/composables/usePlanets.ts`

- [ ] **Step 1: Write usePlanets**

```ts
// src/composables/usePlanets.ts
import * as THREE from 'three'
import type { SceneObjects } from '@/three/scene'
import { createPlanetMesh } from '@/three/planetMesh'
import { createMoonMesh } from '@/three/moonMesh'
import { createSunMesh } from '@/three/sunMesh'
import { createRingMesh } from '@/three/ringMesh'
import { orbitPosition, moonOrbitAngle } from '@/lib/orbit'
import { PLANETS } from '@/lib/planets'
import {
  OVERVIEW_ORBITS,
  OVERVIEW_SIZES,
  DETAIL_SIZES,
  MOON_ROTATION_SPEED,
  OVERVIEW_ORBIT_SPEED,
} from '@/lib/constants'

export interface PlanetEntry {
  id: string
  planetGroup: THREE.Group         // contains planet mesh + moon meshes
  planetMeshRef: ReturnType<typeof createPlanetMesh>
  moonEntries: MoonEntry[]
  ringMesh: THREE.Mesh | null
  orbitAngle: number               // current overview orbit angle (mutated per frame)
}

export interface MoonEntry {
  name: string
  meshRef: ReturnType<typeof createMoonMesh>
  orbitSpeed: number
  orbitRadius: number
  orbitTilt: number
  orbitOffset: number
}

export function buildPlanetEntries(scene: THREE.Scene): PlanetEntry[] {
  const entries: PlanetEntry[] = []

  const { mesh: sunMesh } = createSunMesh()
  scene.add(sunMesh)

  for (const planet of PLANETS) {
    const radius = OVERVIEW_SIZES[planet.id]
    const planetMeshRef = createPlanetMesh(planet.accentColor, radius)
    const planetGroup = new THREE.Group()
    planetGroup.add(planetMeshRef.mesh)

    const moonEntries: MoonEntry[] = []
    for (const moon of planet.moons) {
      const moonRadius = moon.size
      const moonMeshRef = createMoonMesh(planet.accentColor, moonRadius)
      planetGroup.add(moonMeshRef.mesh)
      moonEntries.push({
        name: moon.name,
        meshRef: moonMeshRef,
        orbitSpeed: moon.orbitSpeed,
        orbitRadius: moon.orbitRadius * radius,
        orbitTilt: moon.orbitTilt,
        orbitOffset: moon.orbitOffset,
      })
    }

    let ringMesh: THREE.Mesh | null = null
    if (planet.id === 'saturn') {
      ringMesh = createRingMesh(planet.accentColor, radius)
      planetGroup.add(ringMesh)
    }

    scene.add(planetGroup)

    const orbitRadius = OVERVIEW_ORBITS[planet.id]
    const orbitAngle = Math.random() * Math.PI * 2
    const startPos = orbitPosition(orbitRadius, orbitAngle, 0)
    planetGroup.position.set(startPos.x, startPos.y, startPos.z)

    entries.push({ id: planet.id, planetGroup, planetMeshRef, moonEntries, ringMesh, orbitAngle })
  }

  return entries
}

export function tickPlanets(entries: PlanetEntry[], time: number): void {
  for (const entry of entries) {
    // Update planet shader time
    entry.planetMeshRef.uniforms.uTime.value = time

    // Update moon positions and shader time
    for (const moon of entry.moonEntries) {
      const angle = moonOrbitAngle(moon.orbitSpeed, time, moon.orbitOffset)
      const pos = orbitPosition(moon.orbitRadius, angle, moon.orbitTilt)
      moon.meshRef.mesh.position.set(pos.x, pos.y, pos.z)
      moon.meshRef.uniforms.uTime.value = time
      moon.meshRef.mesh.rotation.y += MOON_ROTATION_SPEED * 0.016
    }
  }
}

export function tickOverviewOrbits(entries: PlanetEntry[], delta: number): void {
  for (const entry of entries) {
    entry.orbitAngle += OVERVIEW_ORBIT_SPEED * delta
    const orbitRadius = OVERVIEW_ORBITS[entry.id]
    const pos = orbitPosition(orbitRadius, entry.orbitAngle, 0)
    entry.planetGroup.position.set(pos.x, pos.y, pos.z)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/usePlanets.ts
git commit -m "feat: add usePlanets composable — builds scene, drives orbit + moon animation"
```

---

## Task 12: Controls (OrbitControls + Raycasting)

**Files:**
- Create: `src/three/controls.ts`

- [ ] **Step 1: Write controls.ts**

```ts
// src/three/controls.ts
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RAYCAST_HOVER_SCALE, RAYCAST_HOVER_TRANSITION_S } from '@/lib/constants'
import gsap from 'gsap'

export interface PlanetClickEvent {
  planetId: string
}

export function createOrbitControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.minDistance = 4
  controls.maxDistance = 40
  return controls
}

export function createRaycaster(
  camera: THREE.PerspectiveCamera,
  meshes: THREE.Mesh[],
  idMap: Map<THREE.Mesh, string>,
  onHover: (id: string | null) => void,
  onPlanetClick: (id: string) => void,
): () => void {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let hoveredMesh: THREE.Mesh | null = null

  function onMouseMove(event: MouseEvent): void {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(meshes)
    const hit = hits.length > 0 ? (hits[0].object as THREE.Mesh) : null

    if (hit !== hoveredMesh) {
      if (hoveredMesh) {
        gsap.to(hoveredMesh.scale, {
          x: 1, y: 1, z: 1,
          duration: RAYCAST_HOVER_TRANSITION_S,
        })
      }
      if (hit) {
        gsap.to(hit.scale, {
          x: RAYCAST_HOVER_SCALE,
          y: RAYCAST_HOVER_SCALE,
          z: RAYCAST_HOVER_SCALE,
          duration: RAYCAST_HOVER_TRANSITION_S,
        })
        onHover(idMap.get(hit) ?? null)
      } else {
        onHover(null)
      }
      hoveredMesh = hit
    }
  }

  function onClickEvent(event: MouseEvent): void {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(meshes)
    if (hits.length > 0) {
      const id = idMap.get(hits[0].object as THREE.Mesh)
      if (id) onPlanetClick(id)
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('click', onClickEvent)

  return () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('click', onClickEvent)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/three/controls.ts
git commit -m "feat: add OrbitControls and raycasting for planet hover/click"
```

---

## Task 13: Scene State + Transitions

**Files:**
- Create: `src/three/transitions.ts`
- Create: `src/composables/useSceneState.ts`

- [ ] **Step 1: Write transitions.ts**

```ts
// src/three/transitions.ts
import * as THREE from 'three'
import gsap from 'gsap'
import type { PlanetEntry } from '@/composables/usePlanets'
import {
  TRANSITION_DURATION_S,
  DETAIL_PLANET_X_RATIO,
  DETAIL_CAMERA_Z,
  OVERVIEW_CAMERA_Z,
} from '@/lib/constants'

export function transitionToDetail(
  entry: PlanetEntry,
  allEntries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  detailRadius: number,
): void {
  // Fade out other planets
  for (const other of allEntries) {
    if (other.id === entry.id) continue
    gsap.to((other.planetMeshRef.mesh.material as THREE.ShaderMaterial), {
      opacity: 0,
      duration: TRANSITION_DURATION_S,
    })
    for (const moon of other.moonEntries) {
      gsap.to((moon.meshRef.mesh.material as THREE.ShaderMaterial), {
        opacity: 0,
        duration: TRANSITION_DURATION_S,
      })
    }
  }

  // Move selected planet to detail position and scale up
  const targetX = window.innerWidth * DETAIL_PLANET_X_RATIO / 100
  gsap.to(entry.planetGroup.position, {
    x: targetX,
    y: 0,
    z: 0,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })
  gsap.to(entry.planetGroup.scale, {
    x: detailRadius / entry.planetMeshRef.mesh.geometry.parameters.radius,
    y: detailRadius / entry.planetMeshRef.mesh.geometry.parameters.radius,
    z: detailRadius / entry.planetMeshRef.mesh.geometry.parameters.radius,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })

  // Move camera closer
  gsap.to(camera.position, {
    z: DETAIL_CAMERA_Z,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })
}

export function transitionToOverview(
  entries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
): void {
  for (const entry of entries) {
    gsap.to((entry.planetMeshRef.mesh.material as THREE.ShaderMaterial), {
      opacity: 1,
      duration: TRANSITION_DURATION_S,
    })
    entry.planetGroup.scale.set(1, 1, 1)
    for (const moon of entry.moonEntries) {
      gsap.to((moon.meshRef.mesh.material as THREE.ShaderMaterial), {
        opacity: 1,
        duration: TRANSITION_DURATION_S,
      })
    }
  }
  gsap.to(camera.position, {
    z: OVERVIEW_CAMERA_Z,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })
}
```

- [ ] **Step 2: Write useSceneState composable**

```ts
// src/composables/useSceneState.ts
import { ref } from 'vue'
import { transitionToDetail, transitionToOverview } from '@/three/transitions'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'
import { DETAIL_SIZES } from '@/lib/constants'

export type ViewState = 'overview' | 'detail'

export function useSceneState(
  sceneObjects: Readonly<{ value: import('@/three/scene').SceneObjects | null }>,
  planetEntries: Readonly<{ value: PlanetEntry[] }>,
) {
  const view = ref<ViewState>('overview')
  const activePlanetId = ref<string | null>(null)

  function selectPlanet(id: string): void {
    const { camera } = sceneObjects.value!
    const entry = planetEntries.value.find(e => e.id === id)
    if (!entry) return
    view.value = 'detail'
    activePlanetId.value = id
    transitionToDetail(entry, planetEntries.value, camera, DETAIL_SIZES[id])
  }

  function returnToOverview(): void {
    view.value = 'overview'
    activePlanetId.value = null
    transitionToOverview(planetEntries.value, sceneObjects.value!.camera)
  }

  return { view, activePlanetId, selectPlanet, returnToOverview }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/three/transitions.ts src/composables/useSceneState.ts
git commit -m "feat: add GSAP scene transitions and state machine"
```

---

## Task 14: useObstacles Composable

**Files:**
- Create: `src/composables/useObstacles.ts`

This composable is the bridge: it calls Three.js `.project()` to get NDC coordinates, then calls `src/lib/projection.ts` (pure math) and returns typed `Obstacle[]` from `src/lib/obstacles.ts`. No geometry math lives here.

- [ ] **Step 1: Write useObstacles**

```ts
// src/composables/useObstacles.ts
import * as THREE from 'three'
import { ref } from 'vue'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'
import type { Obstacle } from '@/lib/obstacles'
import { ndcToScreen, screenRadius, fitEllipseToNDCPoints } from '@/lib/projection'
import { TEXT_COLUMN_WIDTH, TEXT_COLUMN_LEFT_PX, RING_PROJECTION_SAMPLES, RING_TILT_RADIANS, RING_INNER_RATIO, RING_OUTER_RATIO } from '@/lib/constants'

const _vec = new THREE.Vector3()
const _vec2 = new THREE.Vector3()

function getScreenCircle(
  worldPos: THREE.Vector3,
  worldRadius: number,
  camera: THREE.PerspectiveCamera,
  viewport: { width: number; height: number },
) {
  _vec.copy(worldPos)
  const centerNDC = _vec.project(camera)
  const center = ndcToScreen({ x: centerNDC.x, y: centerNDC.y }, viewport)

  _vec2.copy(worldPos).add(new THREE.Vector3(worldRadius, 0, 0))
  const edgeNDC = _vec2.project(camera)
  const r = screenRadius({ x: centerNDC.x, y: centerNDC.y }, { x: edgeNDC.x, y: edgeNDC.y }, viewport)

  return { kind: 'circle' as const, cx: center.x, cy: center.y, r }
}

export function useObstacles(
  sceneObjects: Readonly<{ value: SceneObjects | null }>,
  planetEntries: Readonly<{ value: PlanetEntry[] }>,
  activePlanetId: Readonly<{ value: string | null }>,
) {
  const obstacles = ref<Obstacle[]>([])

  function updateObstacles(): void {
    if (!sceneObjects.value || !activePlanetId.value) {
      obstacles.value = []
      return
    }

    const { camera } = sceneObjects.value
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const entry = planetEntries.value.find(e => e.id === activePlanetId.value)
    if (!entry) { obstacles.value = []; return }

    const result: Obstacle[] = []
    const worldPos = entry.planetGroup.position
    const planetWorldRadius = entry.planetGroup.scale.x  // scale encodes detail radius

    // Planet sphere obstacle
    result.push(getScreenCircle(worldPos, planetWorldRadius, camera, viewport))

    // Moon obstacles (only if moon screen x overlaps text column)
    const textColumnRight = TEXT_COLUMN_LEFT_PX + TEXT_COLUMN_WIDTH
    for (const moon of entry.moonEntries) {
      const moonWorldPos = new THREE.Vector3()
      moon.meshRef.mesh.getWorldPosition(moonWorldPos)
      const moonObs = getScreenCircle(moonWorldPos, moon.meshRef.mesh.geometry.parameters.radius, camera, viewport)
      // Only include if moon overlaps the text column x range
      if (moonObs.cx - moonObs.r < textColumnRight) {
        result.push(moonObs)
      }
    }

    // Ring obstacle (Saturn only) — sample torus equator, fit bounding ellipse
    if (entry.ringMesh) {
      const ringMesh = entry.ringMesh
      const avgRadius = ((RING_INNER_RATIO + RING_OUTER_RATIO) / 2) * planetWorldRadius
      const ndcPoints = []
      for (let i = 0; i < RING_PROJECTION_SAMPLES; i++) {
        const angle = (i / RING_PROJECTION_SAMPLES) * Math.PI * 2
        const localX = avgRadius * Math.cos(angle)
        const localZ = avgRadius * Math.sin(angle)
        // Apply ring tilt (rotation around X)
        const worldRingPos = new THREE.Vector3(
          worldPos.x + localX,
          worldPos.y + localZ * Math.sin(RING_TILT_RADIANS),
          worldPos.z + localZ * Math.cos(RING_TILT_RADIANS),
        )
        _vec.copy(worldRingPos)
        const ndc = _vec.project(camera)
        ndcPoints.push({ x: ndc.x, y: ndc.y })
      }
      const ellipse = fitEllipseToNDCPoints(ndcPoints, viewport)
      result.push({ kind: 'ellipse', ...ellipse })
    }

    obstacles.value = result
  }

  return { obstacles, updateObstacles }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useObstacles.ts
git commit -m "feat: add useObstacles — projects 3D geometry to screen-space obstacle list"
```

---

## Task 15: Typography Layer

**Files:**
- Create: `src/typography/layout.ts`
- Create: `src/typography/PretextBlock.vue`
- Create: `src/composables/usePretextLayout.ts`

- [ ] **Step 1: Write layout.ts**

```ts
// src/typography/layout.ts
import { prepare, layoutNextLine } from '@chenglou/pretext'
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
  indent: number    // left indent in px (unused currently but useful for future right-side obstacles)
}

/**
 * Lays out a prose string into lines, with maxWidth per line reduced by
 * any screen-space obstacles at that line's vertical position.
 *
 * @param prose       Full prose text (may contain newlines for paragraphs)
 * @param topY        Screen Y of the first line's baseline
 * @param obstacles   Current frame's screen-space obstacles
 */
export function layoutProseWithObstacles(
  prose: string,
  topY: number,
  obstacles: Obstacle[],
): LayoutLine[] {
  const prepared = prepare(prose, PROSE_FONT)
  const lines: LayoutLine[] = []
  let cursor = 0
  let lineIndex = 0

  while (true) {
    const lineY = topY + lineIndex * PROSE_LINE_HEIGHT
    const intrusion = maxIntrusionAtY(obstacles, lineY)
    const maxWidth = Math.max(TEXT_COLUMN_WIDTH - intrusion, 60)   // never less than 60px

    const result = layoutNextLine(prepared, cursor, maxWidth)
    if (result === null) break

    lines.push({ text: result.text, width: result.width, indent: 0 })
    cursor = result.end
    lineIndex++
  }

  return lines
}
```

- [ ] **Step 2: Write PretextBlock.vue**

```vue
<!-- src/typography/PretextBlock.vue -->
<template>
  <div class="pretext-block" :style="{ top: `${topY}px`, left: `${leftX}px` }">
    <span
      v-for="(line, i) in lines"
      :key="i"
      class="pretext-line"
      :style="{ display: 'block', maxWidth: `${line.width}px` }"
    >{{ line.text }}</span>
  </div>
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
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 14px;
  line-height: 28px;
  color: rgba(200, 192, 180, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}
</style>
```

- [ ] **Step 3: Write usePretextLayout composable**

```ts
// src/composables/usePretextLayout.ts
import { ref } from 'vue'
import { layoutProseWithObstacles, type LayoutLine } from '@/typography/layout'
import type { Obstacle } from '@/lib/obstacles'
import { TEXT_COLUMN_LEFT_PX } from '@/lib/constants'

import { PROSE_TOP_Y_PX } from '@/lib/constants'

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
```

- [ ] **Step 4: Commit**

```bash
git add src/typography/ src/composables/usePretextLayout.ts
git commit -m "feat: add Pretext typography layer with per-obstacle line layout"
```

---

## Task 16: Vue Components

**Files:**
- Create: `src/components/SceneCanvas.vue`
- Create: `src/components/SiteNav.vue`
- Create: `src/components/HeroOverlay.vue`
- Create: `src/components/PlanetDetail.vue`
- Create: `src/components/App.vue`

- [ ] **Step 1: Write SceneCanvas.vue**

```vue
<!-- src/components/SceneCanvas.vue -->
<template>
  <canvas ref="canvasEl" class="scene-canvas" />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const canvasEl = ref<HTMLCanvasElement | null>(null)
defineExpose({ canvasEl })
</script>

<style scoped>
.scene-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
}
</style>
```

- [ ] **Step 2: Write SiteNav.vue**

```vue
<!-- src/components/SiteNav.vue -->
<template>
  <header class="site-nav">
    <button class="wordmark" @click="emit('home')">Planets</button>
    <nav class="planet-nav">
      <button
        v-for="planet in PLANETS"
        :key="planet.id"
        class="nav-link"
        :class="{ active: activePlanetId === planet.id }"
        @click="emit('select', planet.id)"
      >{{ planet.name }}</button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { PLANETS } from '@/lib/planets'

defineProps<{ activePlanetId: string | null }>()
const emit = defineEmits<{
  select: [id: string]
  home: []
}>()
</script>

<style scoped>
.site-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 48px;
  background: rgba(6, 6, 12, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.wordmark {
  background: none;
  border: none;
  cursor: pointer;
  font-family: Georgia, serif;
  font-size: 11px;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}
.wordmark:hover { color: rgba(255, 255, 255, 0.7); }
.planet-nav { display: flex; gap: 28px; }
.nav-link {
  background: none;
  border: none;
  cursor: pointer;
  font-family: Georgia, serif;
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.2);
  transition: color 0.2s;
  padding: 0;
}
.nav-link:hover, .nav-link.active { color: rgba(255, 255, 255, 0.7); }
</style>
```

- [ ] **Step 3: Write HeroOverlay.vue**

```vue
<!-- src/components/HeroOverlay.vue -->
<template>
  <Transition name="fade">
    <div v-if="visible" class="hero-overlay">
      <p class="hero-title">The Solar System</p>
      <p class="hero-sub">Select a planet to begin</p>
      <p v-if="hoveredName" class="hover-label">{{ hoveredName }}</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean; hoveredName: string | null }>()
</script>

<style scoped>
.hero-overlay {
  position: fixed;
  bottom: 60px;
  left: 0; right: 0;
  text-align: center;
  z-index: 5;
  pointer-events: none;
}
.hero-title {
  font-size: 11px;
  letter-spacing: 10px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.18);
  margin-bottom: 8px;
}
.hero-sub {
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.1);
}
.hover-label {
  margin-top: 24px;
  font-size: 13px;
  letter-spacing: 5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 4: Write PlanetDetail.vue**

```vue
<!-- src/components/PlanetDetail.vue -->
<template>
  <Transition name="fade">
    <div v-if="planet" class="planet-detail">
      <span class="planet-number" :style="{ color: planet.accentColor + '66' }">
        No. {{ String(planet.order).padStart(2, '0') }} — {{ ordinalSuffix(planet.order) }} Planet
      </span>
      <h1 class="planet-name" :style="{ color: planet.accentColor }">
        {{ planet.name }}
      </h1>
      <PretextBlock :lines="lines" :top-y="topY" :left-x="leftX" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getPlanet } from '@/lib/planets'
import PretextBlock from '@/typography/PretextBlock.vue'
import type { LayoutLine } from '@/typography/layout'

const props = defineProps<{
  planetId: string | null
  lines: LayoutLine[]
  topY: number
  leftX: number
}>()

const planet = computed(() => props.planetId ? getPlanet(props.planetId) : null)

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
</script>

<style scoped>
.planet-detail {
  position: fixed;
  top: 100px;
  left: 80px;
  z-index: 5;
  pointer-events: none;
}
.planet-number {
  display: block;
  font-size: 8px;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.planet-name {
  font-family: Georgia, serif;
  font-size: 56px;
  font-weight: normal;
  letter-spacing: 8px;
  text-transform: uppercase;
  line-height: 1;
  margin-bottom: 40px;
}
.fade-enter-active { transition: opacity 0.4s 0.5s; }
.fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 5: Write App.vue**

```vue
<!-- src/components/App.vue -->
<template>
  <div id="app">
    <SceneCanvas ref="canvasComp" />
    <SiteNav
      :active-planet-id="activePlanetId"
      @select="selectPlanet"
      @home="returnToOverview"
    />
    <HeroOverlay
      :visible="view === 'overview'"
      :hovered-name="hoveredPlanetName"
    />
    <PlanetDetail
      :planet-id="activePlanetId"
      :lines="lines"
      :top-y="topY"
      :left-x="leftX"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import SceneCanvas from './SceneCanvas.vue'
import SiteNav from './SiteNav.vue'
import HeroOverlay from './HeroOverlay.vue'
import PlanetDetail from './PlanetDetail.vue'

import { useScene } from '@/composables/useScene'
import { usePlanets, buildPlanetEntries, tickPlanets, tickOverviewOrbits } from '@/composables/usePlanets'
import { useSceneState } from '@/composables/useSceneState'
import { useObstacles } from '@/composables/useObstacles'
import { usePretextLayout } from '@/composables/usePretextLayout'
import { createOrbitControls, createRaycaster } from '@/three/controls'
import { getPlanet } from '@/lib/planets'

const canvasComp = ref<InstanceType<typeof SceneCanvas> | null>(null)
const hoveredPlanetId = ref<string | null>(null)
const hoveredPlanetName = computed(() =>
  hoveredPlanetId.value ? getPlanet(hoveredPlanetId.value).name : null
)

const { sceneObjects, onFrame } = useScene(computed(() => canvasComp.value?.canvasEl ?? null))

const planetEntries = ref<ReturnType<typeof buildPlanetEntries>>([])

const { view, activePlanetId, selectPlanet, returnToOverview } = useSceneState(sceneObjects, planetEntries)
const { obstacles, updateObstacles } = useObstacles(sceneObjects, planetEntries, activePlanetId)
const { lines, topY, leftX, updateLayout } = usePretextLayout()

// Build scene once renderer is ready
watch(sceneObjects, (objs) => {
  if (!objs) return
  planetEntries.value = buildPlanetEntries(objs.scene)

  const controls = createOrbitControls(objs.camera, objs.renderer.domElement)
  const meshes = planetEntries.value.map(e => e.planetMeshRef.mesh)
  const idMap = new Map(planetEntries.value.map(e => [e.planetMeshRef.mesh, e.id]))

  createRaycaster(
    objs.camera,
    meshes,
    idMap,
    (id) => { hoveredPlanetId.value = id },
    (id) => { if (view.value === 'overview') selectPlanet(id) },   // onPlanetClick
  )

  onFrame((time, delta) => {
    controls.update()
    tickPlanets(planetEntries.value, time)
    if (view.value === 'overview') tickOverviewOrbits(planetEntries.value, delta)

    if (view.value === 'detail' && activePlanetId.value) {
      updateObstacles()
      const planet = getPlanet(activePlanetId.value)
      updateLayout(planet.prose.join('\n\n'), obstacles.value)
    }
  })
})
</script>

<style scoped>
#app { width: 100%; height: 100%; }
</style>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ src/typography/PretextBlock.vue
git commit -m "feat: add Vue component layer (App, SceneCanvas, SiteNav, HeroOverlay, PlanetDetail)"
```

---

## Task 17: Verify and Polish

**Files:** (no new files — verify integration end to end)

- [ ] **Step 1: Run full lib tests**

```bash
npx vitest run src/lib/
# Expected: all orbit + projection + obstacles tests PASS
```

- [ ] **Step 2: Start dev server and verify overview loads**

```bash
npm run dev
```

Open http://localhost:5173. Expected:
- Dark background
- Solar system visible with planets orbiting
- Mouse orbit/zoom works
- Hovering a planet highlights it
- Clicking a planet transitions to detail view

- [ ] **Step 3: Verify detail view for each ring/moon planet**

Check in browser:
- Mars → Phobos and Deimos orbit; prose text narrows when moon passes over text column
- Saturn → ring torus visible and tilted; prose respects ring ellipse obstacle
- Jupiter → four Galilean moons orbit

- [ ] **Step 4: Verify wordmark returns to overview**

Click "PLANETS" wordmark → returns to full solar system view

- [ ] **Step 5: Run coverage report on lib**

```bash
npx vitest run --coverage src/lib/
# Expected: coverage report for src/lib/ generated
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete planets hotsite — Three.js, Pretext, Vue integration"
```

---

## Task 18: Build Config + Deploy

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Set build base and output**

Edit `vite.config.ts`, add to `defineConfig`:
```ts
base: '/',
build: {
  outDir: 'dist',
  assetsDir: 'assets',
  sourcemap: false,
}
```

- [ ] **Step 2: Production build**

```bash
npm run build
# Expected: dist/ folder created, no TS errors
```

- [ ] **Step 3: Preview build locally**

```bash
npm run preview
# Open http://localhost:4173 — verify production build works identically to dev
```

- [ ] **Step 4: Create netlify.toml (or vercel.json)**

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 5: Final commit**

```bash
git add vite.config.ts netlify.toml
git commit -m "chore: add production build config and deploy target"
```
