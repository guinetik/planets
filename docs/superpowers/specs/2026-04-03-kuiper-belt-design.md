# Kuiper Belt Design Spec

## Summary

Add a Kuiper Belt as a second asteroid belt entry, reusing the existing `asteroidBelt.ts` renderer with a cool blue-ish tint. Pluto sits inside the belt as a Kuiper Belt Object. The belt is sparse and subtle — fewer, smaller particles than the main asteroid belt.

## Data Changes

### `planetarium.json` — new entry in `asteroidBelts[]`

```json
{
  "id": "kuiper-belt",
  "name": "Kuiper Belt",
  "orbit": {
    "semiMajorAxis": 1900,
    "eccentricity": 0.05,
    "inclination": 1.8,
    "longitudeOfAscendingNode": 0,
    "argumentOfPeriapsis": 0,
    "period": 90560
  },
  "innerRadius": 1400,
  "outerRadius": 2400,
  "maxParticles": 1200,
  "thickness": 1.0,
  "orbitalSpeed": 0.0008,
  "tumbleSpeed": 0.02,
  "sizeRange": [0.003, 0.018],
  "sizeExponent": 2.5,
  "kirkwoodGaps": [],
  "emissiveColor": [0.04, 0.05, 0.08],
  "glbFile": "asteroids.glb"
}
```

Key differences from main belt:
- **innerRadius 1400 / outerRadius 2400** — Neptune (~1500) through well beyond Pluto (~1886)
- **1200 particles** (vs 2000) — sparser
- **thickness 1.0** (vs 0.3) — more vertical scatter, KBOs have higher inclinations
- **orbitalSpeed 0.0008** (vs 0.002) — slower, farther from Sun
- **sizeRange [0.003, 0.018]** — slightly smaller than main belt
- **No Kirkwood gaps** — Kuiper Belt lacks the resonance gaps of the main belt
- **emissiveColor [0.04, 0.05, 0.08]** — cool blue tint (vs warm brown)

### Main belt update

Add `emissiveColor` to the existing main-belt entry:
```json
"emissiveColor": [0.06, 0.05, 0.04]
```
This preserves the current warm brown tint while making it data-driven.

## Type Changes

### `src/lib/planets.ts` — `AsteroidBelt` interface

Add optional field:
```typescript
readonly emissiveColor?: readonly [number, number, number];
```

## Renderer Changes

### `src/three/asteroidBelt.ts`

In the material tweaking section, replace the hardcoded emissive color `new THREE.Color(0.06, 0.05, 0.04)` with a value read from `belt.emissiveColor`, falling back to the current default if not provided.

This is the **only code change** to the renderer. Everything else (instancing, distribution, gaps, tick loop) works generically.

## Integration

No changes needed — `usePlanets.ts` already iterates `ASTEROID_BELTS` and calls `createAsteroidBelt()` for each. The new entry will be picked up automatically.

## Visual Result

- Main asteroid belt: warm brown rocky chunks between Mars and Jupiter
- Kuiper Belt: cool blue-ish icy bodies from Neptune to beyond Pluto
- Pluto orbits visibly inside the Kuiper Belt
- The Kuiper Belt reads as a faint, sparse haze at the solar system's edge
