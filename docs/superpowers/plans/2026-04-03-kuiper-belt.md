# Kuiper Belt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Kuiper Belt as a second asteroid belt with cool blue tint, reusing existing renderer.

**Architecture:** Add `emissiveColor` field to the AsteroidBelt type and JSON schema, use it in the renderer instead of the hardcoded color, then add the Kuiper Belt data entry.

**Tech Stack:** TypeScript, Three.js, JSON data

---

### Task 1: Add `emissiveColor` to the type system and converter

**Files:**
- Modify: `src/lib/planets.ts:36-50` (AsteroidBelt interface)
- Modify: `src/lib/planets.ts:114-128` (AsteroidBeltJSON interface)
- Modify: `src/lib/planets.ts:178-194` (convertAsteroidBelt function)

- [ ] **Step 1: Add `emissiveColor` to `AsteroidBelt` interface**

In `src/lib/planets.ts`, add after `readonly glbFile: string;` (line 49):

```typescript
readonly emissiveColor?: readonly [number, number, number];
```

- [ ] **Step 2: Add `emissiveColor` to `AsteroidBeltJSON` interface**

In `src/lib/planets.ts`, add after `glbFile: string;` (line 127):

```typescript
emissiveColor?: [number, number, number];
```

- [ ] **Step 3: Pass `emissiveColor` through the converter**

In `src/lib/planets.ts`, in `convertAsteroidBelt()`, add after `glbFile: b.glbFile,` (line 192):

```typescript
emissiveColor: b.emissiveColor,
```

- [ ] **Step 4: Run type check**

Run: `npx vue-tsc --noEmit`
Expected: PASS (no type errors)

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All 49+ tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/planets.ts
git commit -m "feat: add emissiveColor field to AsteroidBelt type"
```

---

### Task 2: Use `emissiveColor` in the renderer

**Files:**
- Modify: `src/three/asteroidBelt.ts:126-132` (material tweaking section)

- [ ] **Step 1: Replace hardcoded emissive with data-driven color**

In `src/three/asteroidBelt.ts`, replace:

```typescript
      material.emissive = new THREE.Color(0.06, 0.05, 0.04);
```

with:

```typescript
      const ec = belt.emissiveColor ?? [0.06, 0.05, 0.04];
      material.emissive = new THREE.Color(ec[0], ec[1], ec[2]);
```

- [ ] **Step 2: Run type check**

Run: `npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run dev server and verify main asteroid belt still looks the same**

Run: `npx vite`
Expected: Main asteroid belt renders with unchanged warm brown tint (default fallback)

- [ ] **Step 4: Commit**

```bash
git add src/three/asteroidBelt.ts
git commit -m "feat: use data-driven emissiveColor in asteroid belt renderer"
```

---

### Task 3: Add Kuiper Belt data and main belt emissiveColor

**Files:**
- Modify: `public/planetarium.json:771-799` (asteroidBelts array)

- [ ] **Step 1: Add `emissiveColor` to existing main-belt entry**

In `public/planetarium.json`, add after `"glbFile": "asteroids.glb"` (line 797) inside the main-belt object:

```json
,
      "emissiveColor": [0.06, 0.05, 0.04]
```

- [ ] **Step 2: Add Kuiper Belt entry after the main-belt object**

In `public/planetarium.json`, after the main-belt closing `}` (line 798), add:

```json
,
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

- [ ] **Step 3: Run dev server and verify both belts render**

Run: `npx vite`
Expected:
- Main asteroid belt: warm brown, between Mars and Jupiter (unchanged)
- Kuiper Belt: cool blue tint, sparse, spans from Neptune region through beyond Pluto
- Pluto orbits visibly inside the Kuiper Belt

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add public/planetarium.json
git commit -m "feat: add Kuiper Belt data with blue emissive tint"
```
