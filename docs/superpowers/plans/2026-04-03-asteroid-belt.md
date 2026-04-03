# Asteroid Belt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a data-driven asteroid belt between Mars and Jupiter using instanced meshes from `asteroids.glb`, with Kirkwood gaps, power-law size distribution, and group-rotation animation.

**Architecture:** Asteroid belt config lives in `planetarium.json` alongside planets. A new `AsteroidBelt` type in `src/lib/planets.ts` is loaded at startup. A new `src/three/asteroidBelt.ts` module loads the GLB, extracts 10 geometries, creates `InstancedMesh` objects inside a single `Group`, and exposes a `tick()` for animation. The composable `usePlanets.ts` builds and ticks belts alongside planets.

**Tech Stack:** Vue 3, Three.js (InstancedMesh, GLTFLoader, Group, Matrix4), TypeScript

**Spec:** `docs/superpowers/specs/2026-04-03-asteroid-belt-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `public/planetarium.json` | Modify | Add `asteroidBelts` array with main belt config |
| `src/lib/planets.ts` | Modify | Add `AsteroidBelt`, `KirkwoodGap` types; export `ASTEROID_BELTS`; parse in `loadPlanetarium()` |
| `src/three/asteroidBelt.ts` | Create | GLB loading, geometry extraction, InstancedMesh creation, placement algorithm, tick function |
| `src/three/modelLoader.ts` | Modify | Export `loadGLB` and `fixMaterials` so asteroid belt can reuse them |
| `src/composables/usePlanets.ts` | Modify | Build and tick asteroid belts alongside planets |

---

### Task 1: Add asteroid belt data to planetarium.json

**Files:**
- Modify: `public/planetarium.json` (add `asteroidBelts` key after `planets` array)

- [ ] **Step 1: Add the asteroidBelts array**

Add this new top-level key after the `planets` array closing bracket in `public/planetarium.json`:

```json
"asteroidBelts": [
  {
    "id": "main-belt",
    "name": "Asteroid Belt",
    "orbit": {
      "semiMajorAxis": 527,
      "eccentricity": 0.08,
      "inclination": 1.5,
      "longitudeOfAscendingNode": 0,
      "argumentOfPeriapsis": 0,
      "period": 1680
    },
    "innerRadius": 420,
    "outerRadius": 660,
    "maxParticles": 1000,
    "thickness": 7.0,
    "orbitalSpeed": 0.02,
    "tumbleSpeed": 0.3,
    "sizeRange": [0.3, 1.8],
    "sizeExponent": 2.5,
    "kirkwoodGaps": [
      { "position": 0.33, "width": 0.04 },
      { "position": 0.60, "width": 0.03 },
      { "position": 0.71, "width": 0.03 },
      { "position": 0.98, "width": 0.05 }
    ],
    "glbFile": "asteroids.glb"
  }
]
```

Context: `semiMajorAxis: 527` is the midpoint between Mars (370) and Jupiter (684). `innerRadius: 420` and `outerRadius: 660` map to ~2.1 AU and ~3.3 AU using the same coordinate system as planet orbits. Kirkwood gap positions are normalized `(AU - 2.1) / 1.2`.

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/planetarium.json','utf8')); console.log('Valid JSON')"`

Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add public/planetarium.json
git commit -m "data: add asteroid belt config to planetarium.json"
```

---

### Task 2: Add AsteroidBelt types and loading to planets.ts

**Files:**
- Modify: `src/lib/planets.ts:9-10` (add types after existing interfaces)
- Modify: `src/lib/planets.ts:93-96` (extend PlanetariumJSON)
- Modify: `src/lib/planets.ts:140-156` (add ASTEROID_BELTS export and loading)

- [ ] **Step 1: Add the KirkwoodGap and AsteroidBelt interfaces**

Add after the `RingConfig` interface (after line 29) in `src/lib/planets.ts`:

```typescript
export interface KirkwoodGap {
  readonly position: number;
  readonly width: number;
}

export interface AsteroidBelt {
  readonly id: string;
  readonly name: string;
  readonly orbit: OrbitalElements;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly maxParticles: number;
  readonly thickness: number;
  readonly orbitalSpeed: number;
  readonly tumbleSpeed: number;
  readonly sizeRange: readonly [number, number];
  readonly sizeExponent: number;
  readonly kirkwoodGaps: readonly KirkwoodGap[];
  readonly glbFile: string;
}
```

- [ ] **Step 2: Add the JSON interface and converter**

Add `AsteroidBeltJSON` interface after `PlanetJSON` (after line 91):

```typescript
interface AsteroidBeltJSON {
  id: string;
  name: string;
  orbit: OrbitJSON;
  innerRadius: number;
  outerRadius: number;
  maxParticles: number;
  thickness: number;
  orbitalSpeed: number;
  tumbleSpeed: number;
  sizeRange: [number, number];
  sizeExponent: number;
  kirkwoodGaps: KirkwoodGap[];
  glbFile: string;
}
```

Extend `PlanetariumJSON` to include the new field:

```typescript
interface PlanetariumJSON {
  sun: SunData;
  planets: PlanetJSON[];
  asteroidBelts?: AsteroidBeltJSON[];
}
```

Add converter function after `convertPlanet` (after line 138):

```typescript
function convertAsteroidBelt(b: AsteroidBeltJSON): AsteroidBelt {
  return {
    id: b.id,
    name: b.name,
    orbit: convertOrbit(b.orbit),
    innerRadius: b.innerRadius,
    outerRadius: b.outerRadius,
    maxParticles: b.maxParticles,
    thickness: b.thickness,
    orbitalSpeed: b.orbitalSpeed,
    tumbleSpeed: b.tumbleSpeed,
    sizeRange: b.sizeRange,
    sizeExponent: b.sizeExponent,
    kirkwoodGaps: b.kirkwoodGaps,
    glbFile: b.glbFile,
  };
}
```

- [ ] **Step 3: Add the ASTEROID_BELTS export and load it**

Add after `export let PLANET_IDS` (line 144):

```typescript
export let ASTEROID_BELTS: readonly AsteroidBelt[] = [];
```

In `loadPlanetarium()`, add after `PLANET_IDS = ...` (line 154):

```typescript
  ASTEROID_BELTS = (data.asteroidBelts ?? []).map(convertAsteroidBelt);
```

- [ ] **Step 4: Type-check**

Run: `npx vue-tsc --noEmit`

Expected: no errors

- [ ] **Step 5: Run existing tests**

Run: `npx vitest run`

Expected: all 49+ tests pass (no regressions)

- [ ] **Step 6: Commit**

```bash
git add src/lib/planets.ts
git commit -m "feat: add AsteroidBelt types and loading to planets.ts"
```

---

### Task 3: Export loadGLB and fixMaterials from modelLoader.ts

**Files:**
- Modify: `src/three/modelLoader.ts:12,61` (change `function` to `export function`)

- [ ] **Step 1: Export loadGLB**

In `src/three/modelLoader.ts`, change line 12 from:

```typescript
function loadGLB(url: string): Promise<THREE.Group> {
```

to:

```typescript
export function loadGLB(url: string): Promise<THREE.Group> {
```

- [ ] **Step 2: Export fixMaterials**

Change line 61 from:

```typescript
function fixMaterials(group: THREE.Group): void {
```

to:

```typescript
export function fixMaterials(group: THREE.Group): void {
```

- [ ] **Step 3: Type-check**

Run: `npx vue-tsc --noEmit`

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/three/modelLoader.ts
git commit -m "refactor: export loadGLB and fixMaterials from modelLoader"
```

---

### Task 4: Create asteroidBelt.ts — GLB loading and geometry extraction

**Files:**
- Create: `src/three/asteroidBelt.ts`

- [ ] **Step 1: Create the module with GLB loading and types**

Create `src/three/asteroidBelt.ts`:

```typescript
import * as THREE from "three";
import { loadGLB, fixMaterials } from "@/three/modelLoader";
import type { AsteroidBelt } from "@/lib/planets";
import { ORBIT_SCALE } from "@/lib/constants";

export interface AsteroidBeltEntry {
  group: THREE.Group;
  tick: (time: number, delta: number) => void;
}

interface InstanceData {
  mesh: THREE.InstancedMesh;
  baseMatrices: THREE.Matrix4[];
  tumbleAxes: THREE.Vector3[];
  tumbleSpeeds: number[];
}

/**
 * Extract all Mesh geometries from a loaded GLB scene.
 * Returns pairs of [geometry, material] for each unique mesh found.
 */
function extractGeometries(
  glbScene: THREE.Group,
): { geometry: THREE.BufferGeometry; material: THREE.Material }[] {
  const results: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
  glbScene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      results.push({
        geometry: child.geometry.clone(),
        material: (Array.isArray(child.material) ? child.material[0] : child.material).clone(),
      });
    }
  });
  return results;
}

/**
 * Compute density at a normalized belt position (0=inner, 1=outer).
 * Returns 0-1 where Kirkwood gaps reduce density via Gaussian falloff.
 */
function beltDensity(
  normalizedPos: number,
  gaps: readonly { position: number; width: number }[],
): number {
  let density = 1.0;
  for (const gap of gaps) {
    const dist = (normalizedPos - gap.position) / gap.width;
    density *= 1.0 - Math.exp(-0.5 * dist * dist);
  }
  return density;
}

/**
 * Sample a radius within the belt using rejection sampling for Kirkwood gaps.
 */
function sampleRadius(
  innerRadius: number,
  outerRadius: number,
  gaps: readonly { position: number; width: number }[],
): number {
  const range = outerRadius - innerRadius;
  for (let attempt = 0; attempt < 100; attempt++) {
    const r = innerRadius + Math.random() * range;
    const normalized = (r - innerRadius) / range;
    const density = beltDensity(normalized, gaps);
    if (Math.random() < density) return r;
  }
  // Fallback: return a random radius (extremely unlikely to reach here)
  return innerRadius + Math.random() * range;
}

/**
 * Sample a scale using power-law distribution.
 * Higher exponent = more small asteroids.
 */
function sampleScale(sizeRange: readonly [number, number], exponent: number): number {
  return sizeRange[0] + (sizeRange[1] - sizeRange[0]) * Math.pow(Math.random(), exponent);
}

/**
 * Sample a Y offset using Rayleigh distribution (toroidal vertical spread).
 * Most asteroids cluster near the ecliptic plane with a natural tail.
 */
function sampleYOffset(thicknessDeg: number): number {
  const sigma = thicknessDeg * (Math.PI / 180);
  const rayleigh = sigma * Math.sqrt(-2 * Math.log(1 - Math.random()));
  // Random sign for above/below ecliptic
  return rayleigh * (Math.random() < 0.5 ? 1 : -1);
}

export async function createAsteroidBelt(
  belt: AsteroidBelt,
): Promise<AsteroidBeltEntry> {
  const group = new THREE.Group();
  group.name = belt.id;

  // Load and extract geometries
  const glbScene = await loadGLB(`/models/${belt.glbFile}`);
  fixMaterials(glbScene);
  const extracted = extractGeometries(glbScene);

  if (extracted.length === 0) {
    console.warn(`No meshes found in ${belt.glbFile}`);
    return { group, tick: () => {} };
  }

  // Distribute particles across geometries roughly equally
  const numGeometries = extracted.length;
  const perGeometry = Math.floor(belt.maxParticles / numGeometries);
  const remainder = belt.maxParticles % numGeometries;

  const instanceDataList: InstanceData[] = [];

  // Reusable math objects
  const position = new THREE.Vector3();
  const rotation = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();

  for (let gi = 0; gi < numGeometries; gi++) {
    const { geometry, material } = extracted[gi];
    const count = perGeometry + (gi < remainder ? 1 : 0);
    if (count === 0) continue;

    // Make material suitable for asteroid rendering
    if (material instanceof THREE.MeshStandardMaterial) {
      material.roughness = Math.max(material.roughness, 0.9);
      material.metalness = Math.min(material.metalness, 0.1);
    }

    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    instancedMesh.frustumCulled = false; // belt is always partially visible

    const baseMatrices: THREE.Matrix4[] = [];
    const tumbleAxes: THREE.Vector3[] = [];
    const tumbleSpeeds: number[] = [];

    for (let i = 0; i < count; i++) {
      // 1. Sample radius with Kirkwood gap rejection
      const r = sampleRadius(belt.innerRadius, belt.outerRadius, belt.kirkwoodGaps) * ORBIT_SCALE;

      // 2. Random angle
      const angle = Math.random() * Math.PI * 2;

      // 3. Y offset (toroidal spread)
      const y = sampleYOffset(belt.thickness) * ORBIT_SCALE * belt.innerRadius;

      // Position in XZ plane (matching keplerToWorld: x→x, z→y swap)
      position.set(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r,
      );

      // 4. Scale (power law)
      const s = sampleScale(belt.sizeRange, belt.sizeExponent);
      scale.set(s, s, s);

      // 5. Random rotation
      rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      quaternion.setFromEuler(rotation);

      // 6. Build base matrix
      matrix.compose(position, quaternion, scale);
      const baseMatrix = matrix.clone();
      baseMatrices.push(baseMatrix);

      // 7. Tumble axis + speed
      const tumbleAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      tumbleAxes.push(tumbleAxis);
      tumbleSpeeds.push((0.5 + Math.random()) * belt.tumbleSpeed);

      // Set initial matrix
      instancedMesh.setMatrixAt(i, baseMatrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    group.add(instancedMesh);

    instanceDataList.push({
      mesh: instancedMesh,
      baseMatrices,
      tumbleAxes,
      tumbleSpeeds,
    });
  }

  // Reusable objects for tick()
  const tumbleQuat = new THREE.Quaternion();
  const tumbleMatrix = new THREE.Matrix4();
  const composedMatrix = new THREE.Matrix4();

  function tick(time: number, delta: number): void {
    // 1. Rotate entire group (slow orbital drift)
    group.rotation.y += delta * belt.orbitalSpeed;

    // 2. Update individual tumble rotations
    for (const data of instanceDataList) {
      for (let i = 0; i < data.mesh.count; i++) {
        const angle = time * data.tumbleSpeeds[i];
        tumbleQuat.setFromAxisAngle(data.tumbleAxes[i], angle);
        tumbleMatrix.makeRotationFromQuaternion(tumbleQuat);
        composedMatrix.multiplyMatrices(data.baseMatrices[i], tumbleMatrix);
        data.mesh.setMatrixAt(i, composedMatrix);
      }
      data.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  return { group, tick };
}
```

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/three/asteroidBelt.ts
git commit -m "feat: add asteroid belt renderer with instanced meshes and Kirkwood gaps"
```

---

### Task 5: Integrate asteroid belt into usePlanets.ts

**Files:**
- Modify: `src/composables/usePlanets.ts:1-14` (add imports)
- Modify: `src/composables/usePlanets.ts:47-50` (extend SolarSystemObjects)
- Modify: `src/composables/usePlanets.ts:192-310` (build belts in buildPlanetEntries)
- Modify: `src/composables/usePlanets.ts:312-397` (tick belts in tickPlanets)

- [ ] **Step 1: Add imports**

In `src/composables/usePlanets.ts`, add to the imports:

```typescript
import { ASTEROID_BELTS } from "@/lib/planets";
import { createAsteroidBelt, type AsteroidBeltEntry } from "@/three/asteroidBelt";
```

The `PLANETS` import on line 14 already imports from `@/lib/planets`, so add `ASTEROID_BELTS` to that existing import:

```typescript
import { PLANETS, SUN, ASTEROID_BELTS } from "@/lib/planets";
```

And add the asteroid belt import as a new line:

```typescript
import { createAsteroidBelt, type AsteroidBeltEntry } from "@/three/asteroidBelt";
```

- [ ] **Step 2: Extend SolarSystemObjects**

Change the `SolarSystemObjects` interface (around line 47) from:

```typescript
export interface SolarSystemObjects {
  entries: PlanetEntry[];
  sunObjects: SunObjects;
}
```

to:

```typescript
export interface SolarSystemObjects {
  entries: PlanetEntry[];
  sunObjects: SunObjects;
  asteroidBelts: AsteroidBeltEntry[];
}
```

- [ ] **Step 3: Build asteroid belts in buildPlanetEntries()**

At the end of `buildPlanetEntries()`, just before the `return` statement (line 309), add:

```typescript
  // Asteroid belts
  const asteroidBeltEntries: AsteroidBeltEntry[] = [];
  for (const belt of ASTEROID_BELTS) {
    const beltEntry = await createAsteroidBelt(belt);
    scene.add(beltEntry.group);
    asteroidBeltEntries.push(beltEntry);
  }
```

Update the return statement from:

```typescript
  return { entries, sunObjects };
```

to:

```typescript
  return { entries, sunObjects, asteroidBelts: asteroidBeltEntries };
```

- [ ] **Step 4: Tick asteroid belts in tickPlanets()**

Add two new parameters (`delta` and `asteroidBelts`) to the `tickPlanets` function signature. Change line 312 from:

```typescript
export function tickPlanets(
  entries: PlanetEntry[],
  simTime: number,
  sunUniforms: Record<string, THREE.IUniform>,
  sunMesh?: THREE.Mesh | null,
  activePlanetId?: string | null,
): void {
```

to:

```typescript
export function tickPlanets(
  entries: PlanetEntry[],
  simTime: number,
  sunUniforms: Record<string, THREE.IUniform>,
  sunMesh?: THREE.Mesh | null,
  activePlanetId?: string | null,
  asteroidBelts?: AsteroidBeltEntry[],
  delta?: number,
): void {
```

At the end of the function body (before the closing brace, after the planet/moon loop), add:

```typescript
  // Tick asteroid belts
  if (asteroidBelts && delta) {
    for (const belt of asteroidBelts) {
      belt.tick(simTime, delta);
    }
  }
```

- [ ] **Step 5: Update call site in App.vue**

In `src/components/App.vue`, three changes are needed:

1. Update the import on line 46 to include `AsteroidBeltEntry`:

```typescript
import { buildPlanetEntries, tickPlanets, type PlanetEntry } from '@/composables/usePlanets'
```
becomes:
```typescript
import { buildPlanetEntries, tickPlanets, type PlanetEntry, type AsteroidBeltEntry } from '@/composables/usePlanets'
```

Note: `AsteroidBeltEntry` is re-exported from `usePlanets.ts` (which imports it from `asteroidBelt.ts`). Alternatively, add a re-export line to `usePlanets.ts`:
```typescript
export type { AsteroidBeltEntry } from "@/three/asteroidBelt";
```

2. Add a ref to store asteroid belt entries. After line 67 (`const planetEntries = ref<PlanetEntry[]>([])`), add:

```typescript
const asteroidBeltEntries = ref<AsteroidBeltEntry[]>([])
```

3. In the `watch(sceneObjects, ...)` callback (line 132-133), after `planetEntries.value = built.entries`, add:

```typescript
  asteroidBeltEntries.value = built.asteroidBelts
```

4. Update the `tickPlanets` call on line 219 from:

```typescript
    tickPlanets(planetEntries.value, simTime, sunUniformsRef.value, sunMeshRef.value, activePlanetId.value)
```

to:

```typescript
    tickPlanets(planetEntries.value, simTime, sunUniformsRef.value, sunMeshRef.value, activePlanetId.value, asteroidBeltEntries.value, delta)
```

- [ ] **Step 6: Type-check**

Run: `npx vue-tsc --noEmit`

Expected: no errors

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`

Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
git add src/composables/usePlanets.ts
git commit -m "feat: integrate asteroid belt into planet build and tick loop"
```

---

### Task 6: Visual verification and tuning

**Files:**
- Possibly tune: `public/planetarium.json` (maxParticles, sizeRange, thickness, orbitalSpeed, tumbleSpeed)

- [ ] **Step 1: Start dev server**

Run: `npx vite`

Open the browser and verify:
- Asteroid belt is visible between Mars and Jupiter orbits
- Belt shows visible density gaps (Kirkwood gaps)
- Asteroids vary in size (many small, few large)
- Belt has slight vertical spread (not perfectly flat)
- Asteroids tumble individually
- Entire belt drifts slowly around the sun
- No performance issues (check FPS in browser devtools)

- [ ] **Step 2: Tune parameters if needed**

Adjustable knobs in `planetarium.json`:
- `maxParticles`: increase/decrease for density vs performance
- `sizeRange`: adjust min/max scale factors
- `sizeExponent`: higher = more small rocks
- `thickness`: increase for more vertical spread
- `orbitalSpeed`: adjust drift rate
- `tumbleSpeed`: adjust spin rate
- `kirkwoodGaps[].width`: wider = more visible gaps

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: build completes with no errors

- [ ] **Step 4: Commit any tuning changes**

```bash
git add -A
git commit -m "feat: add asteroid belt to solar system scene"
```
