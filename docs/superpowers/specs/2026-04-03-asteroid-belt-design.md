# Asteroid Belt Design Spec

## Goal

Add a visually accurate, data-driven asteroid belt between Mars and Jupiter using the 10 asteroid geometries in `public/models/asteroids.glb`. The belt is non-interactive scenery governed by real orbital mechanics — Kirkwood gaps, power-law size distribution, and toroidal vertical spread.

## Data Model

### `planetarium.json` — new top-level key

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

### Field definitions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Display name |
| `orbit` | OrbitalElements | Center orbit for the belt group (used for slow group rotation) |
| `innerRadius` | number | Inner edge in scene coordinates (420 ~ 2.1 AU) |
| `outerRadius` | number | Outer edge in scene coordinates (660 ~ 3.3 AU) |
| `maxParticles` | number | Total instance count cap |
| `thickness` | number | Vertical spread in degrees — controls Y offset via Rayleigh distribution |
| `orbitalSpeed` | number | Group rotation rate (the "one rotating group" optimization) |
| `tumbleSpeed` | number | Per-asteroid spin rate multiplier |
| `sizeRange` | [min, max] | Scale factor range applied to base geometries |
| `sizeExponent` | number | Power-law exponent for size distribution (higher = more small rocks) |
| `kirkwoodGaps` | array | Normalized radial positions (0=inner, 1=outer) and widths where density drops |
| `glbFile` | string | Model pack filename in `public/models/` |

### Kirkwood gap mapping

The `position` values map normalized belt range (0-1) to real resonance radii:

| Gap | Real AU | Resonance | Normalized position |
|-----|---------|-----------|-------------------|
| 1 | 2.50 | 3:1 Jupiter | 0.33 |
| 2 | 2.82 | 5:2 Jupiter | 0.60 |
| 3 | 2.95 | 7:3 Jupiter | 0.71 |
| 4 | 3.27 | 2:1 Jupiter | 0.98 |

Normalization formula: `(AU - 2.1) / (3.3 - 2.1)`

## Types — `src/lib/planets.ts`

```typescript
export interface KirkwoodGap {
  readonly position: number;  // 0-1 normalized within belt
  readonly width: number;     // 0-1 normalized gap width
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

Exported alongside existing `SUN`, `PLANETS`, `PLANET_IDS`:

```typescript
export let ASTEROID_BELTS: readonly AsteroidBelt[] = [];
```

Loaded in `loadPlanetarium()` from `data.asteroidBelts`.

## Rendering — `src/three/asteroidBelt.ts` (new file)

### Responsibilities

1. Load GLB, extract 10 asteroid geometries by mesh name
2. Create 10 `THREE.InstancedMesh` objects (one per base geometry)
3. Distribute `maxParticles` across the 10 meshes (roughly equal, ~100 each)
4. Place all InstancedMesh objects inside one `THREE.Group`
5. Export a `tick(time, delta)` function for animation

### Placement algorithm

For each asteroid instance:

1. **Sample radius** — uniform random in `[innerRadius, outerRadius]`, then apply rejection sampling: if the normalized position falls within a Kirkwood gap, reject with probability based on a Gaussian falloff centered on the gap position with sigma = gap width. This creates smooth density dips, not hard edges.

2. **Sample angle** — uniform random `[0, 2*PI]`.

3. **Sample Y offset** — Rayleigh distribution with sigma derived from `thickness` in degrees. This gives most asteroids near the plane with a natural tail upward/downward (random sign). Rayleigh: `y = sigma * sqrt(-2 * ln(random()))`.

4. **Sample scale** — power-law distribution: `scale = sizeRange[0] + (sizeRange[1] - sizeRange[0]) * pow(random(), sizeExponent)`. Higher exponent biases toward smaller values. Asteroid 10 (smallest, 907 verts) gets preferentially used for smaller scales, larger meshes for larger scales — but this is a soft preference, not strict.

5. **Random rotation** — `rotation.set(random()*2*PI, random()*2*PI, random()*2*PI)`.

6. **Build matrix** — compose position + rotation + scale into a `Matrix4`, store as `baseMatrix[i]`.

7. **Store tumble axis + speed** — random axis (normalized `Vector3`), random speed within `[0.5, 1.5] * tumbleSpeed`.

### Position coordinate mapping

Positions use the same `keplerToWorld` convention as planets:
- Radius and angle give X, Z in the orbital plane
- Y offset gives the vertical spread
- All radii are multiplied by `ORBIT_SCALE` to match planet orbit scaling

### Material

Use the material from the GLB as-is (all 10 meshes share one material). Apply `MeshStandardMaterial` properties consistent with the scene: roughness ~0.9, metalness ~0.1, ensure it receives lighting from the scene's existing lights.

### Animation — `tick(time, delta)`

Two operations per frame:

1. **Group rotation**: `group.rotation.y += delta * orbitalSpeed` — the entire belt drifts around the sun.

2. **Instance tumble**: For each InstancedMesh, update instance matrices:
   ```
   for i in 0..instanceCount:
     rotationMatrix = makeRotationAxis(tumbleAxis[i], time * tumbleSpeed[i])
     instancedMesh.setMatrixAt(i, baseMatrix[i] * rotationMatrix)
   instancedMesh.instanceMatrix.needsUpdate = true
   ```

### Performance budget

- 10 draw calls (one per InstancedMesh)
- ~1,000 matrix multiplies per frame (tumble)
- ~1.5M vertices total (1000 instances * ~1500 avg verts) — manageable with bloom's multi-pass
- One group rotation update

## Integration — `src/composables/usePlanets.ts`

### In `buildPlanetEntries()`

After building planet entries, iterate `ASTEROID_BELTS`:
- For each belt, call `createAsteroidBelt(belt, loadedGLB)` from the new module
- Add the returned group to the scene
- Store belt reference for tick updates

### In `tickPlanets()`

After ticking planets, tick each asteroid belt:
```typescript
for (const belt of asteroidBeltEntries) {
  belt.tick(simTime, delta);
}
```

The belt respects the same `paused` / `timeScale` state as planets.

### Model loading — `src/three/modelLoader.ts`

Add the asteroids GLB to the loading pipeline. Since it contains 10 meshes (not one model per file), the belt builder extracts individual geometries by traversing the loaded scene and filtering for `Mesh` objects.

## What this does NOT include

- No interactivity (no raycasting, hover, click, labels, or detail view)
- No LOD (camera distances don't warrant it in overview/detail modes)
- No per-asteroid Kepler orbits (group rotation is sufficient)
- No orbit line for the belt (would clutter the scene)
- No prose or info cards for the belt

## Files changed

| File | Change |
|------|--------|
| `public/planetarium.json` | Add `asteroidBelts` array |
| `src/lib/planets.ts` | Add `AsteroidBelt`, `KirkwoodGap` types; export `ASTEROID_BELTS`; parse in `loadPlanetarium()` |
| `src/three/asteroidBelt.ts` | **New** — GLB extraction, InstancedMesh creation, placement algorithm, tick function |
| `src/three/modelLoader.ts` | Load asteroid GLB alongside planet models |
| `src/composables/usePlanets.ts` | Build and tick asteroid belts alongside planets |
