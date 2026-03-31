# Planetarium Port: gcanvas → Three.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bauhaus wireframe solar system with a faithful port of the gcanvas planetarium — real Keplerian orbits, procedural planet/star shaders, starfield, labels, sun glow — all in Three.js, keeping Vue Router planet pages and SiteNav.

**Architecture:** Port the gcanvas physics layer (Kepler solver) as pure TypeScript in `src/lib/`. Port the gcanvas GLSL shaders (star, rockyPlanet, gasGiant) adapted for Three.js SphereGeometry (geometry normals instead of ray-sphere intersection). Replace the simple circular orbit model with Keplerian mechanics. Keep Vue Router, GSAP transitions, OrbitControls, and bloom post-processing. Add starfield via THREE.Points, labels via CSS overlay, orbit paths via THREE.LineLoop with elliptical geometry.

**Tech Stack:** Vue 3, Three.js 0.183, GSAP, Vue Router 4, Vitest, TypeScript

**Reference implementation:** `D:\Developer\gcanvas\demos\js\planetarium\` — all data, physics, and shader code lives there.

---

## File Map

### Create
| File | Responsibility |
|------|---------------|
| `src/lib/kepler.ts` | Keplerian orbital mechanics: Kepler equation solver, mean/true anomaly, 3D position from orbital elements, orbit path point generation |
| `src/lib/kepler.test.ts` | Unit tests for Kepler solver |
| `src/three/shaders/common.glsl` | Shared GLSL: noise3D, fbm, lighting, fresnel, rotateY |
| `src/three/shaders/sphere.vert.glsl` | Shared vertex shader for all bodies: passes model normal, view normal, view position, model position |
| `src/three/shaders/star.frag.glsl` | Star surface: plasma, hot bubbles, boiling turbulence, corona flames, limb darkening, 4-tier color system |
| `src/three/shaders/rockyPlanet.frag.glsl` | Rocky planet: FBM terrain, diffuse lighting, optional atmosphere rim glow |
| `src/three/shaders/gasGiant.frag.glsl` | Gas giant: banded atmosphere, storm cells, differential rotation, limb darkening |
| `src/three/starfield.ts` | Static star point cloud (THREE.Points with random positions/sizes) |
| `src/components/PlanetLabels.vue` | CSS overlay projecting 3D body positions to screen-space text labels |

### Modify
| File | What changes |
|------|-------------|
| `src/lib/planets.ts` | Add orbital elements, shader config (type + uniforms), moon orbital data — keep prose + accentColor |
| `src/lib/constants.ts` | Replace bauhaus layout constants with Kepler scale factors, camera config matching gcanvas, starfield config |
| `src/lib/orbit.ts` | Delete old circular orbit functions, re-export from kepler.ts |
| `src/three/scene.ts` | Adjust camera defaults (FOV, position), tune bloom, pure black background |
| `src/three/sunMesh.ts` | Star shader material instead of MeshBasicMaterial, PointLight stays |
| `src/three/planetMesh.ts` | Select rockyPlanet or gasGiant shader based on planet data, pass per-planet uniforms |
| `src/three/moonMesh.ts` | Rocky planet shader with per-moon uniforms |
| `src/three/ringMesh.ts` | THREE.RingGeometry (flat disc) instead of TorusGeometry, with transparency |
| `src/three/controls.ts` | Tune OrbitControls to approximate gcanvas camera feel (damping, distance limits) |
| `src/three/transitions.ts` | Adapt for new planet sizes and orbit positions |
| `src/composables/usePlanets.ts` | Keplerian orbit updates per frame, elliptical orbit path lines, moon parent-offset positioning |
| `src/composables/useScene.ts` | Add simulation time tracking with configurable time scale |
| `src/composables/useSceneState.ts` | Minimal changes — transitions still work the same way |
| `src/components/App.vue` | Re-add SiteNav, add PlanetLabels, wire simulation time, pass body positions to labels |
| `src/components/SiteNav.vue` | Already exists, just re-add to App.vue template |

### Delete
| File | Reason |
|------|--------|
| `src/three/shaders/planet.frag.glsl` | Replaced by star/rocky/gasGiant shaders |
| `src/three/shaders/planet.vert.glsl` | Replaced by sphere.vert.glsl |

### Keep untouched
- `src/typography/*` — Pretext components and layout
- `src/composables/usePretextLayout.ts`
- `src/composables/useObstacles.ts`
- `src/components/HeroOverlay.vue`
- `src/components/PlanetDetail.vue`
- `src/components/SceneCanvas.vue`
- `src/router.ts`

---

## Coordinate System Notes

**gcanvas Kepler output:** XY orbital plane, Z = inclination out-of-plane.
**gcanvas world space:** X=right, Y=up, Z=into-screen. Conversion: `{ x: kepler.x, y: kepler.z, z: kepler.y }`.
**Three.js world space:** X=right, Y=up, Z=toward-camera. Same conversion applies.

**Scale factors** (gcanvas pixel values → Three.js world units):
- `ORBIT_SCALE = 0.02` — semiMajorAxis 150px → 3.0 world units
- `SIZE_SCALE = 26.0` — radius 0.0077 → 0.20 world units
- `SUN_SCALE = 26.0` — radius 0.0275 → 0.715 world units

---

## Task 1: Kepler Solver

**Files:**
- Create: `src/lib/kepler.ts`
- Create: `src/lib/kepler.test.ts`

This is a direct TypeScript port of `D:\Developer\gcanvas\src\math\kepler.js`. Pure math, zero dependencies.

- [ ] **Step 1: Write failing tests for Kepler solver**

```typescript
// src/lib/kepler.test.ts
import { describe, it, expect } from 'vitest'
import {
  solveKeplerEquation,
  meanAnomaly,
  trueAnomalyFromEccentric,
  keplerRadius,
  orbitalPosition3D,
  orbitPathPoints,
} from './kepler'

describe('solveKeplerEquation', () => {
  it('returns M directly for circular orbit (e=0)', () => {
    expect(solveKeplerEquation(1.5, 0)).toBeCloseTo(1.5)
  })

  it('converges for moderate eccentricity', () => {
    const E = solveKeplerEquation(Math.PI / 2, 0.2056) // Mercury
    // Verify M = E - e*sin(E)
    const M = E - 0.2056 * Math.sin(E)
    expect(M).toBeCloseTo(Math.PI / 2, 8)
  })

  it('handles high eccentricity', () => {
    const E = solveKeplerEquation(1.0, 0.9)
    const M = E - 0.9 * Math.sin(E)
    expect(M).toBeCloseTo(1.0, 8)
  })
})

describe('meanAnomaly', () => {
  it('returns 0 at epoch', () => {
    expect(meanAnomaly(365.25, 0, 0)).toBeCloseTo(0)
  })

  it('returns 2*PI after one full period', () => {
    expect(meanAnomaly(365.25, 365.25, 0)).toBeCloseTo(2 * Math.PI)
  })

  it('accounts for epoch offset', () => {
    expect(meanAnomaly(100, 50, -50)).toBeCloseTo(2 * Math.PI)
  })
})

describe('trueAnomalyFromEccentric', () => {
  it('returns E for circular orbit', () => {
    expect(trueAnomalyFromEccentric(1.0, 0)).toBeCloseTo(1.0)
  })

  it('true anomaly > eccentric anomaly for e > 0', () => {
    const nu = trueAnomalyFromEccentric(1.0, 0.2)
    expect(nu).toBeGreaterThan(1.0)
  })
})

describe('keplerRadius', () => {
  it('returns semiMajorAxis for circular orbit', () => {
    expect(keplerRadius(150, 0, 0)).toBeCloseTo(150)
  })

  it('is smallest at periapsis (nu=0) for eccentric orbit', () => {
    const rPeri = keplerRadius(150, 0.2, 0)
    const rApo = keplerRadius(150, 0.2, Math.PI)
    expect(rPeri).toBeLessThan(rApo)
  })
})

describe('orbitalPosition3D', () => {
  it('returns position on x-axis at periapsis for zero inclination', () => {
    const elements = {
      semiMajorAxis: 100,
      eccentricity: 0,
      inclination: 0,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      period: 100,
      epoch: 0,
    }
    const pos = orbitalPosition3D(elements, 0)
    expect(pos.x).toBeCloseTo(100)
    expect(pos.y).toBeCloseTo(0)
    expect(pos.z).toBeCloseTo(0)
  })

  it('produces inclined orbit when inclination is non-zero', () => {
    const elements = {
      semiMajorAxis: 100,
      eccentricity: 0,
      inclination: Math.PI / 4,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      period: 100,
      epoch: -25, // quarter orbit
    }
    const pos = orbitalPosition3D(elements, 0)
    expect(Math.abs(pos.z)).toBeGreaterThan(0.1)
  })
})

describe('orbitPathPoints', () => {
  it('returns correct number of points', () => {
    const elements = {
      semiMajorAxis: 100,
      eccentricity: 0,
      inclination: 0,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      period: 100,
    }
    const pts = orbitPathPoints(elements, 64)
    expect(pts).toHaveLength(64)
  })

  it('all points are at semiMajorAxis distance for circular orbit', () => {
    const elements = {
      semiMajorAxis: 100,
      eccentricity: 0,
      inclination: 0,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      period: 100,
    }
    const pts = orbitPathPoints(elements, 32)
    for (const p of pts) {
      const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
      expect(dist).toBeCloseTo(100, 4)
    }
  })
})
```

- [ ] **Step 2: Run tests — expect all FAIL**

Run: `npx vitest run src/lib/kepler.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Kepler solver**

```typescript
// src/lib/kepler.ts
const TWO_PI = 2 * Math.PI

export interface OrbitalElements {
  readonly semiMajorAxis: number
  readonly eccentricity: number
  readonly inclination: number
  readonly longitudeOfAscendingNode: number
  readonly argumentOfPeriapsis: number
  readonly period: number
  readonly epoch?: number
}

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/**
 * Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E.
 * Newton-Raphson iteration.
 */
export function solveKeplerEquation(M: number, e: number, tolerance = 1e-10, maxIter = 50): number {
  if (e === 0) return M
  let E = M
  for (let i = 0; i < maxIter; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < tolerance) break
  }
  return E
}

/** Mean anomaly: M = 2pi * (t - epoch) / period */
export function meanAnomaly(period: number, time: number, epoch = 0): number {
  return TWO_PI * ((time - epoch) / period)
}

/** Convert eccentric anomaly to true anomaly. */
export function trueAnomalyFromEccentric(E: number, e: number): number {
  if (e === 0) return E
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  )
}

/** Orbital radius from true anomaly: r = a(1 - e^2) / (1 + e*cos(nu)) */
export function keplerRadius(a: number, e: number, nu: number): number {
  if (e === 0) return a
  const p = a * (1 - e * e)
  return p / (1 + e * Math.cos(nu))
}

/**
 * Compute 3D cartesian position from orbital elements.
 * Returns position in the Kepler XY plane (Z = inclination out-of-plane).
 */
export function orbitalPosition3D(elements: OrbitalElements, time: number): Vec3 {
  const { semiMajorAxis: a, eccentricity: e, inclination: i,
    longitudeOfAscendingNode: Omega, argumentOfPeriapsis: omega,
    period, epoch = 0 } = elements

  const M = meanAnomaly(period, time, epoch)
  const E = solveKeplerEquation(M, e)
  const nu = trueAnomalyFromEccentric(E, e)
  const r = keplerRadius(a, e, nu)

  const xOrb = r * Math.cos(nu)
  const yOrb = r * Math.sin(nu)

  const cosO = Math.cos(Omega), sinO = Math.sin(Omega)
  const cosI = Math.cos(i),     sinI = Math.sin(i)
  const cosW = Math.cos(omega), sinW = Math.sin(omega)

  return {
    x: (cosO * cosW - sinO * sinW * cosI) * xOrb + (-cosO * sinW - sinO * cosW * cosI) * yOrb,
    y: (sinO * cosW + cosO * sinW * cosI) * xOrb + (-sinO * sinW + cosO * cosW * cosI) * yOrb,
    z: (sinW * sinI) * xOrb + (cosW * sinI) * yOrb,
  }
}

/** Generate array of 3D points tracing the full orbit ellipse. */
export function orbitPathPoints(elements: OrbitalElements, numSegments = 128): Vec3[] {
  const { semiMajorAxis: a, eccentricity: e, inclination: i,
    longitudeOfAscendingNode: Omega, argumentOfPeriapsis: omega } = elements

  const cosO = Math.cos(Omega), sinO = Math.sin(Omega)
  const cosI = Math.cos(i),     sinI = Math.sin(i)
  const cosW = Math.cos(omega), sinW = Math.sin(omega)

  const points: Vec3[] = new Array(numSegments)
  for (let j = 0; j < numSegments; j++) {
    const M = TWO_PI * (j / numSegments)
    const E = solveKeplerEquation(M, e)
    const nu = trueAnomalyFromEccentric(E, e)
    const r = keplerRadius(a, e, nu)
    const xOrb = r * Math.cos(nu)
    const yOrb = r * Math.sin(nu)

    points[j] = {
      x: (cosO * cosW - sinO * sinW * cosI) * xOrb + (-cosO * sinW - sinO * cosW * cosI) * yOrb,
      y: (sinO * cosW + cosO * sinW * cosI) * xOrb + (-sinO * sinW + cosO * cosW * cosI) * yOrb,
      z: (sinW * sinI) * xOrb + (cosW * sinI) * yOrb,
    }
  }
  return points
}
```

- [ ] **Step 4: Run tests — expect all PASS**

Run: `npx vitest run src/lib/kepler.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kepler.ts src/lib/kepler.test.ts
git commit -m "feat: add Keplerian orbital mechanics solver"
```

---

## Task 2: Planet Data with Orbital Elements

**Files:**
- Modify: `src/lib/planets.ts`
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/orbit.ts`

Restructure planet data to include gcanvas orbital elements and shader config. Keep prose and accentColor for future use. Update constants for new scene layout.

- [ ] **Step 1: Update constants.ts**

Replace the bauhaus layout constants. Keep typography, transition, and ray casting constants. Remove per-planet OVERVIEW_ORBITS/OVERVIEW_SIZES/DETAIL_SIZES (now derived from planet data).

```typescript
// src/lib/constants.ts

// ── Scene background ──────────────────────────────────────────────
export const BACKGROUND_COLOR = 0x000000

// ── Typography (kept for future Pretext use) ─────────────────────
export const PROSE_FONT = '26px Georgia, serif'
export const PROSE_LINE_HEIGHT = 46
export const TEXT_COLUMN_WIDTH = 0
export const TEXT_COLUMN_LEFT_PX = 80
export const PROSE_TOP_Y_PX = 80

// ── Transition timings ───────────────────────────────────────────
export const TRANSITION_DURATION_S = 0.8
export const TEXT_FADE_DURATION_S = 0.4
export const TEXT_FADE_DELAY_S = 0.5

// ── Scale factors: gcanvas pixel values → Three.js world units ───
export const ORBIT_SCALE = 0.02       // semiMajorAxis px → world units
export const SIZE_SCALE = 26.0        // display radius → world units

// ── Camera ──────────────────────────────────────────────────────
export const CAMERA_FOV = 50
export const CAMERA_NEAR = 0.1
export const CAMERA_FAR = 500
export const CAMERA_POSITION_Y = 8
export const CAMERA_POSITION_Z = 14

// ── Bloom post-processing ───────────────────────────────────────
export const BLOOM_STRENGTH = 0.8
export const BLOOM_RADIUS = 0.5
export const BLOOM_THRESHOLD = 0.4

// ── Sun ─────────────────────────────────────────────────────────
export const SUN_LIGHT_INTENSITY = 2.0
export const SUN_LIGHT_RANGE = 100

// ── Sphere geometry ─────────────────────────────────────────────
export const SPHERE_SEGMENTS = 64
export const MOON_SPHERE_SEGMENTS = 32

// ── Orbit path rendering ────────────────────────────────────────
export const ORBIT_PATH_SEGMENTS = 128
export const ORBIT_PATH_COLOR = 0xffffff
export const ORBIT_PATH_OPACITY = 0.18
export const MOON_ORBIT_PATH_OPACITY = 0.10

// ── Ring (Saturn) ───────────────────────────────────────────────
export const RING_SEGMENTS = 64

// ── Starfield ───────────────────────────────────────────────────
export const STARFIELD_COUNT = 600
export const STARFIELD_SPREAD = 200
export const STARFIELD_MIN_SIZE = 0.5
export const STARFIELD_MAX_SIZE = 2.0

// ── Simulation ──────────────────────────────────────────────────
export const DEFAULT_TIME_SCALE = 1.0

// ── Raycasting ──────────────────────────────────────────────────
export const RAYCAST_HOVER_SCALE = 1.08
export const RAYCAST_HOVER_TRANSITION_S = 0.2

// ── Labels ──────────────────────────────────────────────────────
export const LABEL_FONT = '11px monospace'
export const LABEL_COLOR = '#999999'
export const LABEL_OFFSET_Y = 18

// ── Detail view ─────────────────────────────────────────────────
export const DETAIL_PLANET_SCREEN_HEIGHT_RATIO = 2.0
export const DETAIL_PLANET_X_RATIO = 0.15
```

- [ ] **Step 2: Rewrite planets.ts with orbital elements and shader config**

```typescript
// src/lib/planets.ts

import type { OrbitalElements } from './kepler'

const DEG = Math.PI / 180

export type ShaderType = 'star' | 'rockyPlanet' | 'gasGiant'

export interface ShaderConfig {
  readonly type: ShaderType
  readonly uniforms: Readonly<Record<string, number | number[]>>
}

export interface RingConfig {
  readonly innerRadius: number    // relative to planet radius
  readonly outerRadius: number
  readonly color: string          // CSS rgba
  readonly tilt: number           // radians
}

export interface Moon {
  readonly name: string
  readonly orbit: OrbitalElements
  readonly displayRadius: number   // gcanvas-scale (multiplied by SIZE_SCALE at mesh creation)
  readonly shader: ShaderConfig
}

export interface Planet {
  readonly id: string
  readonly name: string
  readonly order: number
  readonly accentColor: string
  readonly orbit: OrbitalElements
  readonly displayRadius: number
  readonly shader: ShaderConfig
  readonly ring?: RingConfig
  readonly moons: readonly Moon[]
  readonly prose: readonly string[]
}

export interface SunData {
  readonly name: string
  readonly displayRadius: number
  readonly shader: ShaderConfig
}

export const SUN: SunData = {
  name: 'Sun',
  displayRadius: 0.0275,
  shader: {
    type: 'star',
    uniforms: {
      uStarColor: [1.0, 0.85, 0.4],
      uTemperature: 5778,
      uActivityLevel: 0.4,
      uRotationSpeed: 0.3,
    },
  },
}

export const PLANETS: readonly Planet[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    order: 1,
    accentColor: '#B0A898',
    orbit: {
      semiMajorAxis: 75,
      eccentricity: 0.2056,
      inclination: 7.005 * DEG,
      longitudeOfAscendingNode: 48.331 * DEG,
      argumentOfPeriapsis: 29.124 * DEG,
      period: 87.97,
    },
    displayRadius: 0.0044,
    shader: {
      type: 'rockyPlanet',
      uniforms: { uBaseColor: [0.55, 0.52, 0.50], uHasAtmosphere: 0.0, uSeed: 1.0 },
    },
    moons: [],
    prose: [
      'It is the smallest of the eight, and the fastest — a world that completes its year in eighty-eight of ours, yet turns so slowly that its day outlasts its year.',
      'The surface is a record of early violence: craters upon craters, cliffs hundreds of kilometres long where the planet\'s crust buckled as the interior cooled and contracted.',
      'Radar maps have found ice inside permanently shadowed craters at the poles — water that has not seen sunlight in perhaps four billion years.',
    ],
  },
  {
    id: 'venus',
    name: 'Venus',
    order: 2,
    accentColor: '#D4B96A',
    orbit: {
      semiMajorAxis: 110,
      eccentricity: 0.0068,
      inclination: 3.395 * DEG,
      longitudeOfAscendingNode: 76.680 * DEG,
      argumentOfPeriapsis: 54.884 * DEG,
      period: 224.7,
    },
    displayRadius: 0.0066,
    shader: {
      type: 'rockyPlanet',
      uniforms: { uBaseColor: [0.85, 0.65, 0.30], uHasAtmosphere: 1.0, uSeed: 2.0 },
    },
    moons: [],
    prose: [
      'Venus is the planet that went wrong. From the outside it is the most beautiful object in the night sky after the moon.',
      'It rotates backwards relative to almost every other body in the solar system.',
      'Beneath the clouds, radar mapping has revealed a world reshaped relatively recently.',
    ],
  },
  {
    id: 'earth',
    name: 'Earth',
    order: 3,
    accentColor: '#6AA4D4',
    orbit: {
      semiMajorAxis: 150,
      eccentricity: 0.0167,
      inclination: 0.0,
      longitudeOfAscendingNode: 0.0,
      argumentOfPeriapsis: 102.937 * DEG,
      period: 365.25,
    },
    displayRadius: 0.0077,
    shader: {
      type: 'rockyPlanet',
      uniforms: { uBaseColor: [0.2, 0.4, 0.8], uHasAtmosphere: 1.0, uSeed: 3.0 },
    },
    moons: [
      {
        name: 'Moon',
        orbit: {
          semiMajorAxis: 14,
          eccentricity: 0.0549,
          inclination: 5.145 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 27.32,
        },
        displayRadius: 0.0033,
        shader: {
          type: 'rockyPlanet',
          uniforms: { uBaseColor: [0.7, 0.7, 0.7], uHasAtmosphere: 0.0, uSeed: 10.0 },
        },
      },
    ],
    prose: [
      'Seen from the right distance it is unremarkable: a blue marble, third stone from an ordinary star.',
      'The atmosphere is a thin, improbable skin — less than two percent of the planet\'s radius.',
      'The Moon is too large for coincidence. It stabilises the axial tilt that gives us seasons rather than chaos.',
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    order: 4,
    accentColor: '#C87840',
    orbit: {
      semiMajorAxis: 195,
      eccentricity: 0.0934,
      inclination: 1.850 * DEG,
      longitudeOfAscendingNode: 49.558 * DEG,
      argumentOfPeriapsis: 286.502 * DEG,
      period: 686.97,
    },
    displayRadius: 0.0055,
    shader: {
      type: 'rockyPlanet',
      uniforms: { uBaseColor: [0.75, 0.35, 0.15], uHasAtmosphere: 0.0, uSeed: 4.0 },
    },
    moons: [],
    prose: [
      'It is a cold world, rust-coloured and still, where the wind carves canyons over millennia.',
      'Olympus Mons is a volcano three times the height of Everest.',
      'Two moons too small to cast a proper shadow: Phobos rises in the west and sets in the east.',
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    order: 5,
    accentColor: '#C8A878',
    orbit: {
      semiMajorAxis: 280,
      eccentricity: 0.0489,
      inclination: 1.303 * DEG,
      longitudeOfAscendingNode: 100.464 * DEG,
      argumentOfPeriapsis: 273.867 * DEG,
      period: 4332.59,
    },
    displayRadius: 0.0165,
    shader: {
      type: 'gasGiant',
      uniforms: { uBaseColor: [0.85, 0.65, 0.45], uSeed: 42.0, uStormIntensity: 0.7, uRotationSpeed: 1.2 },
    },
    moons: [
      {
        name: 'Io',
        orbit: {
          semiMajorAxis: 18,
          eccentricity: 0.0041,
          inclination: 0.036 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 1.769,
        },
        displayRadius: 0.0033,
        shader: {
          type: 'rockyPlanet',
          uniforms: { uBaseColor: [0.9, 0.85, 0.35], uHasAtmosphere: 0.0, uSeed: 11.0 },
        },
      },
    ],
    prose: [
      'Jupiter is not quite a planet in the ordinary sense — it is a failed star.',
      'The Great Red Spot is a storm that has been observed continuously for over three hundred and fifty years.',
      'The four Galilean moons are worlds in themselves.',
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    order: 6,
    accentColor: '#D4C890',
    orbit: {
      semiMajorAxis: 380,
      eccentricity: 0.0565,
      inclination: 2.485 * DEG,
      longitudeOfAscendingNode: 113.665 * DEG,
      argumentOfPeriapsis: 339.392 * DEG,
      period: 10759.22,
    },
    displayRadius: 0.0132,
    shader: {
      type: 'gasGiant',
      uniforms: { uBaseColor: [0.85, 0.75, 0.50], uSeed: 99.0, uStormIntensity: 0.3, uRotationSpeed: 1.0 },
    },
    ring: {
      innerRadius: 1.15,
      outerRadius: 1.6,
      color: 'rgba(220, 195, 140, 0.5)',
      tilt: 26.73 * DEG,
    },
    moons: [
      {
        name: 'Titan',
        orbit: {
          semiMajorAxis: 22,
          eccentricity: 0.0288,
          inclination: 0.33 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 15.945,
        },
        displayRadius: 0.0044,
        shader: {
          type: 'rockyPlanet',
          uniforms: { uBaseColor: [0.85, 0.70, 0.40], uHasAtmosphere: 1.0, uSeed: 12.0 },
        },
      },
    ],
    prose: [
      'The rings are the first thing anyone notices, and the last thing they forget.',
      'Saturn is the least dense planet in the solar system.',
      'Titan is the only moon with a dense atmosphere.',
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    order: 7,
    accentColor: '#78C8D4',
    orbit: {
      semiMajorAxis: 490,
      eccentricity: 0.0457,
      inclination: 0.773 * DEG,
      longitudeOfAscendingNode: 74.006 * DEG,
      argumentOfPeriapsis: 96.998 * DEG,
      period: 30688.5,
    },
    displayRadius: 0.011,
    shader: {
      type: 'gasGiant',
      uniforms: { uBaseColor: [0.55, 0.75, 0.85], uSeed: 77.0, uStormIntensity: 0.1, uRotationSpeed: 0.6 },
    },
    moons: [],
    prose: [
      'Uranus rolls around the sun on its side, its axis tilted ninety-eight degrees.',
      'It is the coldest planetary atmosphere in the solar system.',
      'Uranus has a faint system of rings, discovered only in 1977.',
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    order: 8,
    accentColor: '#5068C8',
    orbit: {
      semiMajorAxis: 580,
      eccentricity: 0.0113,
      inclination: 1.770 * DEG,
      longitudeOfAscendingNode: 131.784 * DEG,
      argumentOfPeriapsis: 276.336 * DEG,
      period: 60182.0,
    },
    displayRadius: 0.0099,
    shader: {
      type: 'gasGiant',
      uniforms: { uBaseColor: [0.25, 0.35, 0.75], uSeed: 55.0, uStormIntensity: 0.5, uRotationSpeed: 0.8 },
    },
    moons: [],
    prose: [
      'Neptune was found by mathematics before it was found by telescope.',
      'It is a world of wind — the fastest sustained winds in the solar system.',
      'Triton orbits backwards.',
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

- [ ] **Step 3: Replace orbit.ts with kepler re-export**

```typescript
// src/lib/orbit.ts
// Re-export from kepler for backward compatibility
export type { Vec3, OrbitalElements } from './kepler'
export { orbitalPosition3D, orbitPathPoints } from './kepler'
```

- [ ] **Step 4: Run type check**

Run: `npx vue-tsc --noEmit`
Expected: There will be errors in files that import old constants (OVERVIEW_ORBITS, etc). Those files will be rewritten in later tasks. Verify no errors in `src/lib/`.

- [ ] **Step 5: Run kepler tests + check existing lib tests**

Run: `npx vitest run src/lib/kepler.test.ts`
Expected: All PASS. (The old orbit.test.ts will fail since `orbitPosition` and `moonOrbitAngle` are gone — that's expected.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/kepler.ts src/lib/kepler.test.ts src/lib/planets.ts src/lib/constants.ts src/lib/orbit.ts
git commit -m "feat: add Keplerian data model and orbital elements for all planets"
```

---

## Task 3: GLSL Shaders

**Files:**
- Create: `src/three/shaders/common.glsl`
- Create: `src/three/shaders/sphere.vert.glsl`
- Create: `src/three/shaders/star.frag.glsl`
- Create: `src/three/shaders/rockyPlanet.frag.glsl`
- Create: `src/three/shaders/gasGiant.frag.glsl`
- Delete: `src/three/shaders/planet.frag.glsl`
- Delete: `src/three/shaders/planet.vert.glsl`

Port all three gcanvas fragment shaders adapted for Three.js geometry normals (no ray-sphere intersection). The vertex shader passes model-space and view-space normals/positions.

**Key adaptation from gcanvas billboard approach to Three.js geometry:**
- gcanvas: ray-sphere intersection → normal → `camRotMat * normal` → `rotateY(n, selfRotation)` → noise sampling
- Three.js: geometry `normal` attribute is already in model space → `rotateY(normal, selfRotation)` → noise sampling
- View-dependent effects (limb darkening, fresnel) use `normalMatrix * normal` in view space

- [ ] **Step 1: Create common.glsl**

```glsl
// src/three/shaders/common.glsl

// ── Noise ────────────────────────────────────────────────────────

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float noise3D(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = dot(i, vec3(1.0, 57.0, 113.0));
    return mix(
        mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
            mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
        mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
            mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z
    );
}

float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * noise3D(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// ── Lighting ─────────────────────────────────────────────────────

float diffuseLight(vec3 normal, vec3 lightDir, float ambient) {
    float diffuse = max(0.0, dot(normal, lightDir));
    return ambient + (1.0 - ambient) * diffuse;
}

float fresnel(vec3 normal, vec3 viewDir, float power) {
    return pow(1.0 - abs(dot(normal, viewDir)), power);
}

// ── Rotation ─────────────────────────────────────────────────────

vec3 rotateY(vec3 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}
```

- [ ] **Step 2: Create sphere.vert.glsl**

```glsl
// src/three/shaders/sphere.vert.glsl
varying vec3 vModelNormal;
varying vec3 vModelPosition;
varying vec3 vViewNormal;
varying vec3 vViewPosition;

void main() {
    vModelNormal = normal;
    vModelPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
}
```

- [ ] **Step 3: Create star.frag.glsl**

Port from gcanvas `STAR_FRAGMENT`. Adapted for geometry normals — no ray-sphere intersection, no tidal effects (not needed for solar system).

```glsl
// src/three/shaders/star.frag.glsl
uniform float uTime;
uniform vec3 uStarColor;
uniform float uTemperature;
uniform float uActivityLevel;
uniform float uRotationSpeed;

varying vec3 vModelNormal;
varying vec3 vModelPosition;
varying vec3 vViewNormal;
varying vec3 vViewPosition;

// ── COMMON (inlined via vite ?raw import concatenation) ──────────
// Will be prepended at material creation time

// ── Plasma ───────────────────────────────────────────────────────

float plasmaNoise(vec3 p, float time) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float totalAmp = 0.0;
    for (int i = 0; i < 5; i++) {
        vec3 offset = vec3(
            sin(time * 0.1 + float(i)) * 0.5,
            cos(time * 0.15 + float(i) * 0.7) * 0.5,
            time * 0.05
        );
        value += amplitude * noise3D((p + offset) * frequency);
        totalAmp += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value / totalAmp;
}

// ── Hot Bubbles ──────────────────────────────────────────────────

float hotBubbles(vec3 p, float time) {
    vec3 p1 = p * 5.0 + vec3(0.0, time * 0.06, 0.0);
    float b1 = smoothstep(0.3, 0.6, noise3D(p1));

    vec3 p2 = p * 9.0 + vec3(time * 0.04, time * 0.08, 0.0);
    float b2 = smoothstep(0.35, 0.65, noise3D(p2));

    vec3 p3 = p * 16.0 + vec3(time * 0.1, 0.0, time * 0.12);
    float b3 = smoothstep(0.4, 0.7, noise3D(p3));

    float bubbles = b1 * 0.5 + b2 * 0.35 + b3 * 0.15;
    float pulse = sin(time * 2.0 + p.x * 10.0) * 0.3 + 0.7;
    return bubbles * pulse;
}

// ── Boiling Turbulence ───────────────────────────────────────────

float boilingTurbulence(vec3 p, float time) {
    float turb = 0.0;
    float amp = 1.0;
    float freq = 4.0;
    for (int i = 0; i < 4; i++) {
        vec3 offset = vec3(
            sin(time * 0.3 + float(i) * 1.7) * 0.5,
            cos(time * 0.25 + float(i) * 2.3) * 0.5,
            time * 0.15 * (1.0 + float(i) * 0.3)
        );
        turb += amp * abs(noise3D(p * freq + offset));
        amp *= 0.5;
        freq *= 2.1;
    }
    return turb;
}

// ── Corona Flames ────────────────────────────────────────────────

float coronaFlames(float angle, float rimFactor, float time, float activity) {
    float f1 = sin(angle * 5.0 + time * 0.5) * 0.5 + 0.5;
    f1 *= noise3D(vec3(angle * 2.0, time * 0.3, 0.0));
    float f2 = sin(angle * 12.0 + time * 0.8) * 0.5 + 0.5;
    f2 *= noise3D(vec3(angle * 4.0, time * 0.5, 5.0));
    float f3 = sin(angle * 25.0 + time * 1.5) * 0.5 + 0.5;
    f3 *= noise3D(vec3(angle * 8.0, time * 0.8, 10.0));
    float flames = f1 * 0.5 + f2 * 0.3 + f3 * 0.2;
    flames *= pow(rimFactor, 1.5);
    flames *= 0.5 + activity * 0.5;
    return flames;
}

void main() {
    float time = uTime;
    float selfRotation = time * uRotationSpeed;

    // Model-space normal with self-rotation applied
    vec3 rotatedNormal = rotateY(normalize(vModelNormal), selfRotation);

    // View geometry
    vec3 viewDir = normalize(-vViewPosition);
    float viewAngle = max(0.0, dot(normalize(vViewNormal), viewDir));
    float edgeDist = 1.0 - viewAngle;
    float limbDarkening = pow(viewAngle, 0.4);

    // Spherical distortion for warped UV
    float brightness = 0.15 + (uTemperature / 10000.0) * 0.1;
    float distortStrength = 2.0 - brightness;
    vec2 sp = normalize(vViewNormal).xy;
    float r = dot(sp, sp);
    sp *= distortStrength;
    r = dot(sp, sp);
    float f = (1.0 - sqrt(abs(1.0 - r))) / (r + 0.001) + brightness * 0.5;
    vec2 warpedUV = sp * f + vec2(time * 0.05, 0.0);

    // Plasma
    vec3 plasmaCoord = vec3(warpedUV * 3.0, time * 0.12);
    float plasma1 = plasmaNoise(plasmaCoord, time);
    float plasma2 = plasmaNoise(plasmaCoord * 1.3 + vec3(50.0), time * 1.2);
    float plasma = (plasma1 * 0.6 + plasma2 * 0.4) * 0.5 + 0.5;

    // Effects
    float turbIntensity = boilingTurbulence(rotatedNormal, time) * 0.6;
    float bubbles = hotBubbles(rotatedNormal, time);
    float gran = noise3D(rotatedNormal * 15.0 + time * 0.5);

    // Pulsation
    float pulse1 = cos(time * 0.5) * 0.5;
    float pulse2 = sin(time * 0.25) * 0.5;
    float pulse = (pulse1 + pulse2) * 0.3 * uActivityLevel;

    // Combined intensity
    float totalIntensity = plasma * 0.35 + turbIntensity * 0.25 + gran * 0.2 + bubbles * 0.4;
    totalIntensity *= 1.0 + pulse;

    // 4-tier color system
    vec3 baseColor = uStarColor;
    float maxComp = max(baseColor.r, max(baseColor.g, baseColor.b));
    if (maxComp > 0.01) baseColor = baseColor / maxComp * 0.85;

    float tempBlend = smoothstep(5000.0, 7500.0, uTemperature);
    vec3 coolColor = mix(baseColor * vec3(0.5, 0.3, 0.2), baseColor * vec3(0.7, 0.8, 0.95), tempBlend);
    vec3 warmColor = mix(baseColor * vec3(1.2, 1.0, 0.85), baseColor * vec3(1.0, 1.05, 1.2), tempBlend);
    vec3 hotColor = baseColor * vec3(1.6, 1.35, 1.2);
    vec3 blazingColor = mix(baseColor * vec3(2.0, 1.6, 1.3), baseColor * vec3(1.4, 1.5, 1.8), tempBlend);

    vec3 surfaceColor;
    if (totalIntensity < 0.35) {
        surfaceColor = mix(coolColor, warmColor, totalIntensity / 0.35);
    } else if (totalIntensity < 0.65) {
        surfaceColor = mix(warmColor, hotColor, (totalIntensity - 0.35) / 0.3);
    } else if (totalIntensity < 1.0) {
        surfaceColor = mix(hotColor, blazingColor, (totalIntensity - 0.65) / 0.35);
    } else {
        surfaceColor = blazingColor * (1.0 + (totalIntensity - 1.0) * 0.8);
    }

    // Bubble highlights
    surfaceColor += blazingColor * pow(bubbles, 1.5) * turbIntensity * 0.6;

    // Limb darkening + rim glow
    surfaceColor *= 0.75 + limbDarkening * 0.25;
    float rimAngle = atan(vModelNormal.y, vModelNormal.x) + selfRotation;
    float rimNoise = noise3D(vec3(rimAngle * 3.0, edgeDist * 2.0, time * 0.2)) * 0.5 + 0.5;
    float rimIntensity = pow(edgeDist, 2.0) * (0.4 + rimNoise * 0.6);
    surfaceColor += baseColor * vec3(1.3, 0.95, 0.6) * rimIntensity * 0.6 * uActivityLevel;

    // Edge glow + center boost + shimmer
    surfaceColor += warmColor * pow(edgeDist, 0.5) * 0.3 * uActivityLevel;
    surfaceColor += baseColor * pow(viewAngle, 1.5) * 0.2;
    surfaceColor *= sin(turbIntensity * 10.0 + time * 3.0) * 0.05 + 1.0;

    surfaceColor = clamp(surfaceColor, 0.0, 3.5);
    gl_FragColor = vec4(surfaceColor, 1.0);
}
```

- [ ] **Step 4: Create rockyPlanet.frag.glsl**

```glsl
// src/three/shaders/rockyPlanet.frag.glsl
uniform float uTime;
uniform vec3 uBaseColor;
uniform float uHasAtmosphere;
uniform float uSeed;

varying vec3 vModelNormal;
varying vec3 vModelPosition;
varying vec3 vViewNormal;
varying vec3 vViewPosition;

void main() {
    vec3 normal = normalize(vModelNormal);
    vec3 viewNormal = normalize(vViewNormal);
    vec3 viewDir = normalize(-vViewPosition);

    // Seeded noise terrain
    vec3 noiseCoord = normal * 4.0 + uSeed * 100.0;
    float terrain = fbm(noiseCoord, 5);

    // Height-based coloring
    vec3 lowColor = uBaseColor * 0.6;
    vec3 highColor = uBaseColor * 1.2;
    vec3 surfaceColor = mix(lowColor, highColor, terrain);

    // Surface variation
    float variation = noise3D(normal * 10.0 + uSeed * 50.0);
    surfaceColor *= 0.9 + variation * 0.2;

    // Directional lighting (from sun at origin)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    float light = diffuseLight(viewNormal, lightDir, 0.3);
    surfaceColor *= light;

    // Atmosphere scattering at edges
    if (uHasAtmosphere > 0.0) {
        float rim = fresnel(viewNormal, viewDir, 3.0);
        vec3 atmoColor = vec3(0.5, 0.7, 1.0);
        surfaceColor = mix(surfaceColor, atmoColor, rim * uHasAtmosphere * 0.4);
    }

    gl_FragColor = vec4(surfaceColor, 1.0);
}
```

- [ ] **Step 5: Create gasGiant.frag.glsl**

```glsl
// src/three/shaders/gasGiant.frag.glsl
uniform float uTime;
uniform vec3 uBaseColor;
uniform float uSeed;
uniform float uStormIntensity;
uniform float uRotationSpeed;

varying vec3 vModelNormal;
varying vec3 vModelPosition;
varying vec3 vViewNormal;
varying vec3 vViewPosition;

void main() {
    vec3 normal = normalize(vModelNormal);
    vec3 viewNormal = normalize(vViewNormal);
    vec3 viewDir = normalize(-vViewPosition);

    // Spherical coords for banding
    float latitude = asin(normal.y);
    float longitude = atan(normal.z, normal.x);

    float rotSpeed = uRotationSpeed > 0.0 ? uRotationSpeed : 0.1;
    float time = uTime * rotSpeed;

    // Banded atmosphere
    float bands = sin(latitude * 15.0 + time) * 0.5 + 0.5;
    bands += sin(latitude * 25.0 - time * 0.5) * 0.25;
    bands += sin(latitude * 40.0 + time * 0.3) * 0.125;

    // Turbulent distortion
    vec3 noiseCoord = vec3(longitude + time * 0.2, latitude * 3.0, uSeed);
    float turb = fbm(noiseCoord * 5.0, 4) * 0.3;
    bands += turb;

    // Color variation
    vec3 lightBand = uBaseColor * 1.3;
    vec3 darkBand = uBaseColor * 0.7;
    vec3 surfaceColor = mix(darkBand, lightBand, bands);

    // Storm features
    if (uStormIntensity > 0.0) {
        float stormLat = 0.3;
        float stormLon = time * 0.5;
        vec2 stormCenter = vec2(stormLon, stormLat);
        vec2 pos = vec2(longitude, latitude);
        float stormDist = length(pos - stormCenter);
        float storm = smoothstep(0.5, 0.2, stormDist) * uStormIntensity;
        vec3 stormColor = vec3(0.8, 0.3, 0.2);
        float swirl = sin(stormDist * 20.0 - time * 3.0) * 0.5 + 0.5;
        surfaceColor = mix(surfaceColor, stormColor * swirl, storm);
    }

    // Lighting
    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.3));
    float light = diffuseLight(viewNormal, lightDir, 0.4);
    surfaceColor *= light;

    // Limb darkening
    float viewAngle = dot(viewNormal, viewDir);
    surfaceColor *= 0.7 + max(0.0, viewAngle) * 0.3;

    gl_FragColor = vec4(surfaceColor, 1.0);
}
```

- [ ] **Step 6: Delete old shaders**

```bash
rm src/three/shaders/planet.frag.glsl src/three/shaders/planet.vert.glsl
```

- [ ] **Step 7: Commit**

```bash
git add src/three/shaders/
git commit -m "feat: add procedural star, rocky planet, and gas giant shaders"
```

---

## Task 4: Mesh Factories

**Files:**
- Modify: `src/three/sunMesh.ts`
- Modify: `src/three/planetMesh.ts`
- Modify: `src/three/moonMesh.ts`
- Modify: `src/three/ringMesh.ts`
- Create: `src/three/starfield.ts`

Rewrite all mesh factories to use the new shaders and planet data types.

**Important:** The common GLSL functions must be prepended to each fragment shader string at material creation time, since Vite's `?raw` import gives us separate strings.

- [ ] **Step 1: Rewrite sunMesh.ts**

```typescript
// src/three/sunMesh.ts
import * as THREE from 'three'
import vertSrc from './shaders/sphere.vert.glsl?raw'
import commonSrc from './shaders/common.glsl?raw'
import fragSrc from './shaders/star.frag.glsl?raw'
import type { SunData } from '@/lib/planets'
import { SPHERE_SEGMENTS, SIZE_SCALE, SUN_LIGHT_INTENSITY, SUN_LIGHT_RANGE } from '@/lib/constants'

export interface SunObjects {
  mesh: THREE.Mesh
  light: THREE.PointLight
  uniforms: Record<string, THREE.IUniform>
}

export function createSunMesh(sunData: SunData): SunObjects {
  const radius = sunData.displayRadius * SIZE_SCALE
  const u = sunData.shader.uniforms

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uStarColor: { value: new THREE.Vector3(...(u.uStarColor as number[])) },
    uTemperature: { value: u.uTemperature as number },
    uActivityLevel: { value: u.uActivityLevel as number },
    uRotationSpeed: { value: u.uRotationSpeed as number },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: commonSrc + '\n' + fragSrc,
    uniforms,
  })

  const geometry = new THREE.SphereGeometry(radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  const light = new THREE.PointLight(0xfff0d0, SUN_LIGHT_INTENSITY, SUN_LIGHT_RANGE)
  mesh.add(light)

  return { mesh, light, uniforms }
}
```

- [ ] **Step 2: Rewrite planetMesh.ts**

```typescript
// src/three/planetMesh.ts
import * as THREE from 'three'
import vertSrc from './shaders/sphere.vert.glsl?raw'
import commonSrc from './shaders/common.glsl?raw'
import rockyFragSrc from './shaders/rockyPlanet.frag.glsl?raw'
import gasFragSrc from './shaders/gasGiant.frag.glsl?raw'
import type { ShaderConfig } from '@/lib/planets'
import { SPHERE_SEGMENTS, SIZE_SCALE } from '@/lib/constants'

export interface PlanetMesh {
  mesh: THREE.Mesh
  uniforms: Record<string, THREE.IUniform>
}

export function createPlanetMesh(shader: ShaderConfig, displayRadius: number): PlanetMesh {
  const radius = displayRadius * SIZE_SCALE

  const uniforms: Record<string, THREE.IUniform> = { uTime: { value: 0 } }
  for (const [key, val] of Object.entries(shader.uniforms)) {
    if (Array.isArray(val)) {
      uniforms[key] = { value: new THREE.Vector3(...val) }
    } else {
      uniforms[key] = { value: val }
    }
  }

  const fragSrc = shader.type === 'gasGiant' ? gasFragSrc : rockyFragSrc

  const material = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: commonSrc + '\n' + fragSrc,
    uniforms,
    transparent: true,
  })

  const geometry = new THREE.SphereGeometry(radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  return { mesh, uniforms }
}
```

- [ ] **Step 3: Rewrite moonMesh.ts**

```typescript
// src/three/moonMesh.ts
import * as THREE from 'three'
import vertSrc from './shaders/sphere.vert.glsl?raw'
import commonSrc from './shaders/common.glsl?raw'
import rockyFragSrc from './shaders/rockyPlanet.frag.glsl?raw'
import type { ShaderConfig } from '@/lib/planets'
import { MOON_SPHERE_SEGMENTS, SIZE_SCALE } from '@/lib/constants'

export interface MoonMesh {
  mesh: THREE.Mesh
  uniforms: Record<string, THREE.IUniform>
}

export function createMoonMesh(shader: ShaderConfig, displayRadius: number): MoonMesh {
  const radius = displayRadius * SIZE_SCALE

  const uniforms: Record<string, THREE.IUniform> = { uTime: { value: 0 } }
  for (const [key, val] of Object.entries(shader.uniforms)) {
    if (Array.isArray(val)) {
      uniforms[key] = { value: new THREE.Vector3(...val) }
    } else {
      uniforms[key] = { value: val }
    }
  }

  const material = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: commonSrc + '\n' + rockyFragSrc,
    uniforms,
    transparent: true,
  })

  const geometry = new THREE.SphereGeometry(radius, MOON_SPHERE_SEGMENTS, MOON_SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  return { mesh, uniforms }
}
```

- [ ] **Step 4: Rewrite ringMesh.ts**

```typescript
// src/three/ringMesh.ts
import * as THREE from 'three'
import type { RingConfig } from '@/lib/planets'
import { SIZE_SCALE, RING_SEGMENTS } from '@/lib/constants'

export function createRingMesh(ringConfig: RingConfig, planetDisplayRadius: number): THREE.Mesh {
  const planetRadius = planetDisplayRadius * SIZE_SCALE
  const innerR = ringConfig.innerRadius * planetRadius
  const outerR = ringConfig.outerRadius * planetRadius

  const geometry = new THREE.RingGeometry(innerR, outerR, RING_SEGMENTS)
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xdcc38c),
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2 + ringConfig.tilt
  return mesh
}
```

- [ ] **Step 5: Create starfield.ts**

```typescript
// src/three/starfield.ts
import * as THREE from 'three'
import { STARFIELD_COUNT, STARFIELD_SPREAD, STARFIELD_MIN_SIZE, STARFIELD_MAX_SIZE } from '@/lib/constants'

export function createStarfield(): THREE.Points {
  const positions = new Float32Array(STARFIELD_COUNT * 3)
  const sizes = new Float32Array(STARFIELD_COUNT)

  for (let i = 0; i < STARFIELD_COUNT; i++) {
    const i3 = i * 3
    // Distribute in a large sphere around origin
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = STARFIELD_SPREAD * (0.3 + Math.random() * 0.7)
    positions[i3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = r * Math.cos(phi)
    sizes[i] = STARFIELD_MIN_SIZE + Math.random() * (STARFIELD_MAX_SIZE - STARFIELD_MIN_SIZE)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  })

  return new THREE.Points(geometry, material)
}
```

- [ ] **Step 6: Commit**

```bash
git add src/three/sunMesh.ts src/three/planetMesh.ts src/three/moonMesh.ts src/three/ringMesh.ts src/three/starfield.ts
git commit -m "feat: rewrite mesh factories with procedural shaders"
```

---

## Task 5: Scene Setup

**Files:**
- Modify: `src/three/scene.ts`
- Modify: `src/three/controls.ts`

Adjust camera, background, bloom for the new planetarium look.

- [ ] **Step 1: Rewrite scene.ts**

```typescript
// src/three/scene.ts
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import {
  BACKGROUND_COLOR,
  CAMERA_FOV,
  CAMERA_POSITION_Y,
  CAMERA_POSITION_Z,
  CAMERA_NEAR,
  CAMERA_FAR,
  BLOOM_STRENGTH,
  BLOOM_RADIUS,
  BLOOM_THRESHOLD,
} from '@/lib/constants'

export interface SceneObjects {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  composer: EffectComposer
}

export function createScene(canvas: HTMLCanvasElement): SceneObjects {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BACKGROUND_COLOR)

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    CAMERA_NEAR,
    CAMERA_FAR,
  )
  camera.position.set(0, CAMERA_POSITION_Y, CAMERA_POSITION_Z)
  camera.lookAt(0, 0, 0)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  )
  composer.addPass(bloomPass)

  return { scene, camera, renderer, composer }
}

export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  composer: EffectComposer,
): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
}
```

- [ ] **Step 2: Update controls.ts**

Tune OrbitControls to approximate the gcanvas camera feel. Increase max distance since the orbit field is larger now (~11.6 world units for Neptune).

```typescript
// src/three/controls.ts
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RAYCAST_HOVER_SCALE, RAYCAST_HOVER_TRANSITION_S } from '@/lib/constants'
import gsap from 'gsap'

export function createOrbitControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 2
  controls.maxDistance = 60
  controls.maxPolarAngle = Math.PI * 0.85
  controls.minPolarAngle = Math.PI * 0.05
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
        gsap.to(hoveredMesh.scale, { x: 1, y: 1, z: 1, duration: RAYCAST_HOVER_TRANSITION_S })
      }
      if (hit) {
        gsap.to(hit.scale, {
          x: RAYCAST_HOVER_SCALE, y: RAYCAST_HOVER_SCALE, z: RAYCAST_HOVER_SCALE,
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

- [ ] **Step 3: Commit**

```bash
git add src/three/scene.ts src/three/controls.ts
git commit -m "feat: update scene camera and controls for planetarium layout"
```

---

## Task 6: Planet System Composable (Keplerian Orbits)

**Files:**
- Modify: `src/composables/usePlanets.ts`

Rewrite the planet system to use Keplerian orbits, new mesh factories, elliptical orbit path lines, and simulation time.

- [ ] **Step 1: Rewrite usePlanets.ts**

```typescript
// src/composables/usePlanets.ts
import * as THREE from 'three'
import { createPlanetMesh, type PlanetMesh } from '@/three/planetMesh'
import { createMoonMesh, type MoonMesh } from '@/three/moonMesh'
import { createSunMesh, type SunObjects } from '@/three/sunMesh'
import { createRingMesh } from '@/three/ringMesh'
import { createStarfield } from '@/three/starfield'
import { orbitalPosition3D, orbitPathPoints } from '@/lib/kepler'
import type { OrbitalElements } from '@/lib/kepler'
import { PLANETS, SUN } from '@/lib/planets'
import type { Moon } from '@/lib/planets'
import {
  ORBIT_SCALE,
  SIZE_SCALE,
  ORBIT_PATH_SEGMENTS,
  ORBIT_PATH_COLOR,
  ORBIT_PATH_OPACITY,
  MOON_ORBIT_PATH_OPACITY,
} from '@/lib/constants'

/** Convert Kepler XY-plane output to Three.js XZ-plane (Y=up). */
function keplerToWorld(pos: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(pos.x, pos.z, pos.y)
}

export interface MoonEntry {
  name: string
  meshRef: MoonMesh
  orbit: OrbitalElements
  epoch: number
}

export interface PlanetEntry {
  id: string
  name: string
  planetGroup: THREE.Group
  planetMeshRef: PlanetMesh
  moonEntries: MoonEntry[]
  ringMesh: THREE.Mesh | null
  orbit: OrbitalElements
  epoch: number
  orbitLine: THREE.LineLoop
}

export interface SolarSystemObjects {
  entries: PlanetEntry[]
  sunObjects: SunObjects
}

function createOrbitLine(elements: OrbitalElements, isMoon: boolean): THREE.LineLoop {
  const rawPoints = orbitPathPoints(elements, ORBIT_PATH_SEGMENTS)
  const points = rawPoints.map(p => {
    const w = keplerToWorld(p)
    return new THREE.Vector3(w.x * ORBIT_SCALE, w.y * ORBIT_SCALE, w.z * ORBIT_SCALE)
  })
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: ORBIT_PATH_COLOR,
    transparent: true,
    opacity: isMoon ? MOON_ORBIT_PATH_OPACITY : ORBIT_PATH_OPACITY,
  })
  return new THREE.LineLoop(geometry, material)
}

export function buildPlanetEntries(scene: THREE.Scene): SolarSystemObjects {
  const entries: PlanetEntry[] = []

  // Starfield
  scene.add(createStarfield())

  // Sun
  const sunObjects = createSunMesh(SUN)
  scene.add(sunObjects.mesh)

  for (const planet of PLANETS) {
    const planetMeshRef = createPlanetMesh(planet.shader, planet.displayRadius)
    const planetGroup = new THREE.Group()
    planetGroup.add(planetMeshRef.mesh)

    // Randomize starting epoch
    const epoch = -Math.random() * planet.orbit.period
    const scaledOrbit = { ...planet.orbit, semiMajorAxis: planet.orbit.semiMajorAxis * ORBIT_SCALE, epoch }

    // Moon entries
    const moonEntries: MoonEntry[] = []
    for (const moon of planet.moons) {
      const moonMeshRef = createMoonMesh(moon.shader, moon.displayRadius)
      planetGroup.add(moonMeshRef.mesh)
      const moonEpoch = -Math.random() * moon.orbit.period
      moonEntries.push({
        name: moon.name,
        meshRef: moonMeshRef,
        orbit: { ...moon.orbit, semiMajorAxis: moon.orbit.semiMajorAxis * ORBIT_SCALE, epoch: moonEpoch },
        epoch: moonEpoch,
      })

      // Moon orbit line (parented to planet group)
      const moonOrbitLine = createOrbitLine(
        { ...moon.orbit, semiMajorAxis: moon.orbit.semiMajorAxis * ORBIT_SCALE },
        true,
      )
      planetGroup.add(moonOrbitLine)
    }

    // Ring
    let ringMesh: THREE.Mesh | null = null
    if (planet.ring) {
      ringMesh = createRingMesh(planet.ring, planet.displayRadius)
      planetGroup.add(ringMesh)
    }

    // Planet orbit line (in scene space)
    const orbitLine = createOrbitLine(
      { ...planet.orbit, semiMajorAxis: planet.orbit.semiMajorAxis * ORBIT_SCALE },
      false,
    )
    scene.add(orbitLine)

    // Set initial position
    const pos = orbitalPosition3D(scaledOrbit, 0)
    const worldPos = keplerToWorld(pos)
    planetGroup.position.copy(worldPos)

    scene.add(planetGroup)

    entries.push({
      id: planet.id,
      name: planet.name,
      planetGroup,
      planetMeshRef,
      moonEntries,
      ringMesh,
      orbit: scaledOrbit,
      epoch,
      orbitLine,
    })
  }

  return { entries, sunObjects }
}

export function tickPlanets(entries: PlanetEntry[], simTime: number, sunUniforms: Record<string, THREE.IUniform>): void {
  // Update sun
  sunUniforms.uTime.value = simTime / 365.25 // convert days to shader-friendly time

  for (const entry of entries) {
    // Update planet orbital position
    const pos = orbitalPosition3D(entry.orbit, simTime)
    const worldPos = keplerToWorld(pos)
    entry.planetGroup.position.copy(worldPos)

    // Update planet shader time
    entry.planetMeshRef.uniforms.uTime.value = simTime / 365.25

    // Update moons
    for (const moon of entry.moonEntries) {
      const moonPos = orbitalPosition3D(moon.orbit, simTime)
      const moonWorld = keplerToWorld(moonPos)
      moon.meshRef.mesh.position.copy(moonWorld)
      moon.meshRef.uniforms.uTime.value = simTime / 365.25
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/usePlanets.ts
git commit -m "feat: rewrite planet system with Keplerian orbits"
```

---

## Task 7: Scene Composable + Simulation Time

**Files:**
- Modify: `src/composables/useScene.ts`

Add simulation time tracking with configurable time scale.

- [ ] **Step 1: Update useScene.ts**

```typescript
// src/composables/useScene.ts
import { ref, shallowRef, onMounted, onUnmounted, type Ref } from 'vue'
import { createScene, handleResize, type SceneObjects } from '@/three/scene'
import { DEFAULT_TIME_SCALE } from '@/lib/constants'

type FrameCallback = (simTime: number, delta: number) => void

export function useScene(canvasRef: Ref<HTMLCanvasElement | null>) {
  const sceneObjects = shallowRef<SceneObjects | null>(null)
  const frameCallbacks = new Set<FrameCallback>()
  let animationId = 0
  let lastTime = 0
  let simTime = 0
  const timeScale = ref(DEFAULT_TIME_SCALE)
  const paused = ref(false)

  function onFrame(callback: FrameCallback): void {
    frameCallbacks.add(callback)
  }

  function tick(timeMs: number): void {
    const time = timeMs / 1000
    const delta = Math.min(time - lastTime, 0.1) // clamp large deltas
    lastTime = time

    if (!paused.value) {
      simTime += delta * timeScale.value
    }

    for (const cb of frameCallbacks) cb(simTime, delta)
    const objs = sceneObjects.value
    if (objs) objs.composer.render()
    animationId = requestAnimationFrame(tick)
  }

  function onResize(): void {
    const objs = sceneObjects.value
    if (!objs) return
    handleResize(objs.camera, objs.renderer, objs.composer)
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

  return { sceneObjects, onFrame, timeScale, paused }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useScene.ts
git commit -m "feat: add simulation time with configurable time scale"
```

---

## Task 8: Transitions Adaptation

**Files:**
- Modify: `src/three/transitions.ts`
- Modify: `src/composables/useSceneState.ts`

Adapt transitions for the new data model. Planet sizes are now `displayRadius * SIZE_SCALE` instead of coming from a lookup table.

- [ ] **Step 1: Update transitions.ts**

```typescript
// src/three/transitions.ts
import * as THREE from 'three'
import gsap from 'gsap'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { PlanetEntry } from '@/composables/usePlanets'
import {
  TRANSITION_DURATION_S,
  CAMERA_POSITION_Y,
  CAMERA_POSITION_Z,
  SIZE_SCALE,
  DETAIL_PLANET_SCREEN_HEIGHT_RATIO,
  DETAIL_PLANET_X_RATIO,
  ORBIT_PATH_OPACITY,
} from '@/lib/constants'
import { PLANETS } from '@/lib/planets'

function computeDetailCamera(
  planetPos: THREE.Vector3,
  planetVisualRadius: number,
  camera: THREE.PerspectiveCamera,
) {
  const halfFOV = (camera.fov / 2) * Math.PI / 180
  const distance = planetVisualRadius / (Math.tan(halfFOV) * DETAIL_PLANET_SCREEN_HEIGHT_RATIO / 2)
  const ndcX = 2 * (1 - DETAIL_PLANET_X_RATIO) - 1
  const offsetX = ndcX * camera.aspect * Math.tan(halfFOV) * distance
  const targetX = planetPos.x - offsetX
  const targetY = planetPos.y
  const targetZ = planetPos.z
  const camX = targetX
  const camY = targetY + distance * 0.1
  const camZ = targetZ + distance

  return { camX, camY, camZ, targetX, targetY, targetZ, distance }
}

export function transitionToDetail(
  entry: PlanetEntry,
  allEntries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  sunMesh: THREE.Mesh | null,
): void {
  controls.enabled = false

  const planetPos = entry.planetGroup.position.clone()
  const planetData = PLANETS.find(p => p.id === entry.id)!
  const planetVisualRadius = planetData.displayRadius * SIZE_SCALE
  const detail = computeDetailCamera(planetPos, planetVisualRadius, camera)

  // Fade out sun
  if (sunMesh) {
    const sunMat = sunMesh.material as THREE.ShaderMaterial
    sunMat.transparent = true
    gsap.to(sunMat, { opacity: 0, duration: TRANSITION_DURATION_S })
  }

  // Fade out other planets + all orbit lines
  for (const other of allEntries) {
    const lineMat = other.orbitLine.material as THREE.LineBasicMaterial
    gsap.to(lineMat, { opacity: 0, duration: TRANSITION_DURATION_S })

    if (other.id === entry.id) continue
    const mat = other.planetMeshRef.mesh.material as THREE.ShaderMaterial
    mat.transparent = true
    gsap.to(mat, { opacity: 0, duration: TRANSITION_DURATION_S })
    for (const moon of other.moonEntries) {
      const moonMat = moon.meshRef.mesh.material as THREE.ShaderMaterial
      gsap.to(moonMat, { opacity: 0, duration: TRANSITION_DURATION_S })
    }
  }

  // Animate camera
  const startLookAt = controls.target.clone()
  const lookAtProxy = { x: startLookAt.x, y: startLookAt.y, z: startLookAt.z }

  gsap.to(camera.position, {
    x: detail.camX, y: detail.camY, z: detail.camZ,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })

  gsap.to(lookAtProxy, {
    x: detail.targetX, y: detail.targetY, z: detail.targetZ,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
    onUpdate: () => camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z),
    onComplete: () => controls.target.set(detail.targetX, detail.targetY, detail.targetZ),
  })
}

export function transitionToOverview(
  entries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  sunMesh: THREE.Mesh | null,
): void {
  controls.enabled = false

  const startLookAt = controls.target.clone()
  const lookAtProxy = { x: startLookAt.x, y: startLookAt.y, z: startLookAt.z }

  if (sunMesh) {
    const sunMat = sunMesh.material as THREE.ShaderMaterial
    gsap.to(sunMat, { opacity: 1, duration: TRANSITION_DURATION_S })
  }

  for (const entry of entries) {
    const mat = entry.planetMeshRef.mesh.material as THREE.ShaderMaterial
    mat.transparent = true
    gsap.to(mat, { opacity: 1, duration: TRANSITION_DURATION_S })
    for (const moon of entry.moonEntries) {
      const moonMat = moon.meshRef.mesh.material as THREE.ShaderMaterial
      gsap.to(moonMat, { opacity: 1, duration: TRANSITION_DURATION_S })
    }
    const lineMat = entry.orbitLine.material as THREE.LineBasicMaterial
    gsap.to(lineMat, { opacity: ORBIT_PATH_OPACITY, duration: TRANSITION_DURATION_S })
  }

  gsap.to(camera.position, {
    x: 0, y: CAMERA_POSITION_Y, z: CAMERA_POSITION_Z,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })

  gsap.to(lookAtProxy, {
    x: 0, y: 0, z: 0,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
    onUpdate: () => camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z),
    onComplete: () => {
      controls.target.set(0, 0, 0)
      controls.enabled = true
    },
  })
}
```

- [ ] **Step 2: Update useSceneState.ts**

```typescript
// src/composables/useSceneState.ts
import * as THREE from 'three'
import { ref, type Ref, type ShallowRef } from 'vue'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { transitionToDetail, transitionToOverview } from '@/three/transitions'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'

export type ViewState = 'overview' | 'detail'

export function useSceneState(
  sceneObjects: Ref<SceneObjects | null>,
  planetEntries: Ref<PlanetEntry[]>,
  controlsRef: ShallowRef<OrbitControls | null>,
  sunMeshRef: ShallowRef<THREE.Mesh | null>,
) {
  const view = ref<ViewState>('overview')
  const activePlanetId = ref<string | null>(null)

  function selectPlanet(id: string): void {
    const objs = sceneObjects.value
    const controls = controlsRef.value
    if (!objs || !controls) return
    const entry = planetEntries.value.find(e => e.id === id)
    if (!entry) return

    view.value = 'detail'
    activePlanetId.value = id

    transitionToDetail(entry, planetEntries.value, objs.camera, controls, sunMeshRef.value)
  }

  function returnToOverview(): void {
    const objs = sceneObjects.value
    const controls = controlsRef.value
    if (!objs || !controls) return
    view.value = 'overview'
    activePlanetId.value = null
    transitionToOverview(planetEntries.value, objs.camera, controls, sunMeshRef.value)
  }

  return { view, activePlanetId, selectPlanet, returnToOverview }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/three/transitions.ts src/composables/useSceneState.ts
git commit -m "feat: adapt transitions for new Keplerian scene layout"
```

---

## Task 9: Labels + SiteNav + App Wiring

**Files:**
- Create: `src/components/PlanetLabels.vue`
- Modify: `src/components/App.vue`

Add CSS-based planet labels (project 3D → screen) and restore SiteNav. Wire the full simulation loop.

- [ ] **Step 1: Create PlanetLabels.vue**

```vue
<!-- src/components/PlanetLabels.vue -->
<template>
  <div class="planet-labels">
    <span
      v-for="label in visibleLabels"
      :key="label.name"
      class="planet-label"
      :style="{ left: label.x + 'px', top: label.y + 'px' }"
    >{{ label.name }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, type Ref } from 'vue'
import * as THREE from 'three'

interface BodyRef {
  name: string
  position: THREE.Vector3
  radius: number
}

const props = defineProps<{
  bodies: BodyRef[]
  camera: THREE.PerspectiveCamera | null
}>()

const visibleLabels = computed(() => {
  if (!props.camera) return []
  const cam = props.camera
  const w = window.innerWidth
  const h = window.innerHeight

  return props.bodies.map(body => {
    const pos = body.position.clone().project(cam)
    const x = (pos.x * 0.5 + 0.5) * w
    const y = (-pos.y * 0.5 + 0.5) * h + body.radius * 0.5 + 18
    return { name: body.name, x, y, z: pos.z }
  }).filter(l => l.z > 0 && l.z < 1) // only in front of camera
})
</script>

<style scoped>
.planet-labels {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.planet-label {
  position: absolute;
  transform: translateX(-50%);
  font: 11px monospace;
  color: #999;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 2: Rewrite App.vue**

```vue
<!-- src/components/App.vue -->
<template>
  <div id="app-root">
    <SceneCanvas ref="canvasComp" />
    <SiteNav
      :active-planet-id="activePlanetId"
      @select="onNavSelect"
      @home="onHome"
    />
    <PlanetLabels
      :bodies="labelBodies"
      :camera="activeCamera"
    />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three'
import { ref, computed, watch, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import SceneCanvas from './SceneCanvas.vue'
import SiteNav from './SiteNav.vue'
import PlanetLabels from './PlanetLabels.vue'
import { useScene } from '@/composables/useScene'
import { buildPlanetEntries, tickPlanets, type PlanetEntry, type SunObjects } from '@/composables/usePlanets'
import { useSceneState } from '@/composables/useSceneState'
import { createOrbitControls, createRaycaster } from '@/three/controls'
import { PLANET_IDS, SUN } from '@/lib/planets'
import { SIZE_SCALE } from '@/lib/constants'

const route = useRoute()
const router = useRouter()

const canvasComp = ref<InstanceType<typeof SceneCanvas> | null>(null)
const canvasRef = computed(() => canvasComp.value?.canvasEl ?? null)
const { sceneObjects, onFrame } = useScene(canvasRef)

const planetEntries = ref<PlanetEntry[]>([])
const controlsRef = shallowRef<OrbitControls | null>(null)
const sunMeshRef = shallowRef<THREE.Mesh | null>(null)
const sunUniformsRef = shallowRef<Record<string, THREE.IUniform>>({})
const sceneReady = ref(false)
const { view, activePlanetId, selectPlanet, returnToOverview } = useSceneState(sceneObjects, planetEntries, controlsRef, sunMeshRef)

const activeCamera = computed(() => sceneObjects.value?.camera ?? null)

const labelBodies = computed(() => {
  const bodies: { name: string; position: THREE.Vector3; radius: number }[] = []
  // Sun
  bodies.push({ name: 'Sun', position: new THREE.Vector3(0, 0, 0), radius: SUN.displayRadius * SIZE_SCALE * 50 })
  // Planets + moons
  for (const entry of planetEntries.value) {
    bodies.push({
      name: entry.name,
      position: entry.planetGroup.position,
      radius: 20,
    })
    for (const moon of entry.moonEntries) {
      const moonWorldPos = moon.meshRef.mesh.getWorldPosition(new THREE.Vector3())
      bodies.push({ name: moon.name, position: moonWorldPos, radius: 14 })
    }
  }
  return bodies
})

function onNavSelect(id: string) {
  router.push(`/${id}`)
}

function onHome() {
  router.push('/')
}

// Route → scene state
watch(() => route.params.planetId as string | undefined, (planetId) => {
  if (!sceneReady.value) return
  if (planetId && PLANET_IDS.includes(planetId)) {
    if (activePlanetId.value !== planetId) selectPlanet(planetId)
  } else {
    if (view.value !== 'overview') returnToOverview()
  }
})

watch(sceneObjects, (objs) => {
  if (!objs) return

  const built = buildPlanetEntries(objs.scene)
  planetEntries.value = built.entries
  sunMeshRef.value = built.sunObjects.mesh
  sunUniformsRef.value = built.sunObjects.uniforms

  const controls = createOrbitControls(objs.camera, objs.renderer.domElement)
  controlsRef.value = controls

  const meshes = planetEntries.value.map(e => e.planetMeshRef.mesh)
  const idMap = new Map(planetEntries.value.map(e => [e.planetMeshRef.mesh, e.id]))

  createRaycaster(
    objs.camera,
    meshes,
    idMap,
    () => {},
    (id) => {
      if (view.value === 'overview') router.push(`/${id}`)
    },
  )

  sceneReady.value = true

  // Handle direct planet URL load
  const initialPlanet = route.params.planetId as string | undefined
  if (initialPlanet && PLANET_IDS.includes(initialPlanet)) {
    selectPlanet(initialPlanet)
  }

  onFrame((simTime, delta) => {
    controls.update()
    tickPlanets(planetEntries.value, simTime, sunUniformsRef.value)
  })
})
</script>

<style scoped>
#app-root {
  width: 100%;
  height: 100%;
}
</style>
```

- [ ] **Step 3: Run type check + build**

Run: `npx vue-tsc --noEmit && npx vite build`
Expected: Clean build.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: Kepler tests pass. Old orbit tests will fail — update or remove `src/lib/orbit.test.ts` since the API changed.

- [ ] **Step 5: Remove or update old orbit tests**

Delete `src/lib/orbit.test.ts` (the functions it tested no longer exist — they've been replaced by Keplerian mechanics tested in `kepler.test.ts`).

```bash
rm src/lib/orbit.test.ts
```

- [ ] **Step 6: Final test + type check**

Run: `npx vitest run && npx vue-tsc --noEmit`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: complete planetarium port — Keplerian orbits, procedural shaders, labels, SiteNav"
```

---

## Task 10: Visual Tuning Pass

**Files:**
- Possibly adjust: `src/lib/constants.ts`, shader files, `src/three/scene.ts`

Boot the dev server and visually verify. This task is a manual check + tweak cycle.

- [ ] **Step 1: Boot dev server and verify**

Run: `npx vite` (port 9955)

**Check these visuals:**
1. Sun renders with animated plasma/corona (not a white blob)
2. Rocky planets (Mercury, Venus, Earth, Mars) show terrain noise + lighting
3. Gas giants (Jupiter, Saturn, Uranus, Neptune) show banded atmospheres
4. Saturn has a visible ring
5. Orbit paths are visible as faint ellipses
6. Stars are visible in the background
7. Labels appear below each body
8. SiteNav is visible at top
9. Clicking a planet navigates to `/:planetId` with camera transition
10. Clicking "Planets" in nav returns to `/` overview
11. Direct URL `localhost:9955/earth` loads into Earth detail view

- [ ] **Step 2: Tune constants if needed**

Common adjustments:
- `CAMERA_POSITION_Y` / `CAMERA_POSITION_Z` — if the view is too zoomed in/out
- `BLOOM_STRENGTH` — if sun glow is too intense or too weak
- `ORBIT_SCALE` — if planets are too close together or too spread out
- `SIZE_SCALE` — if planets are too small to see or too large
- Shader uniforms in `planets.ts` — if colors look wrong

- [ ] **Step 3: Commit any tuning changes**

```bash
git add -A
git commit -m "chore: visual tuning pass"
```

---

## Dependency Graph

```
Task 1 (Kepler solver) ──┐
                          ├── Task 2 (Planet data) ──┐
Task 3 (Shaders) ────────┤                          ├── Task 6 (usePlanets)
                          ├── Task 4 (Mesh factories)│
Task 5 (Scene setup) ────┘                          ├── Task 7 (useScene)
                                                     │
                                                     ├── Task 8 (Transitions)
                                                     │
                                                     └── Task 9 (Labels + SiteNav + App wiring)
                                                              │
                                                              └── Task 10 (Visual tuning)
```

Tasks 1, 3, and 5 can be parallelized. Tasks 2 and 4 depend on 1 and 3 respectively. Tasks 6-9 depend on all prior. Task 10 is always last.
