# Planetarium

An interactive 3D solar system built with Vue 3, Three.js, and Pretext typography. Planets orbit using Keplerian mechanics, render with procedural GLSL shaders over NASA textures, and editorial prose flows dynamically around projected planet silhouettes.

**[Live site](https://guinetik-planets.netlify.app/)**

## Features

- **Procedural shaders** — rocky planets (FBM terrain noise), gas giants (banded atmospheres with storms), and a multi-octave plasma sun with corona
- **NASA textures** — day-side imagery for all 8 planets, with Earth night-side city lights via emissive shader injection
- **Keplerian orbits** — orbital mechanics solver (Newton-Raphson for Kepler's equation) positions all planets and moons
- **Saturn rings** — shader-based discrete band structure (C, B, A rings with Cassini/Encke/Keeler gaps)
- **Dynamic typography** — `@chenglou/pretext` lays out prose around planet obstacles at 60fps, with staggered fade-in transitions
- **Overview / detail views** — free orbit camera in overview, GSAP-tweened transitions to framed detail view with editorial content
- **Bloom post-processing** — EffectComposer with configurable bloom strength, radius, and threshold
- **Starfield** — 1200-particle background

## Quick start

```bash
npm install
npx vite          # dev server
npm run build     # type-check + production build
npx vitest run    # run tests
```

## Architecture

Three strict layers with no cross-contamination:

| Layer | Path | Depends on |
|-------|------|------------|
| Pure math | `src/lib/` | Nothing (no Three.js, no Vue) |
| 3D graphics | `src/three/` | `src/lib/` |
| Vue composables | `src/composables/` | `src/lib/`, `src/three/` |

Additional modules:
- `src/typography/` — Pretext text layout + `PretextBlock.vue` renderer
- `src/components/` — Vue components (`App`, `SceneCanvas`, `SiteNav`, `PlanetLabels`, `PlanetDetail`, `HeroOverlay`)

## Tech stack

- **Vue 3** + TypeScript + Vite
- **Three.js** 0.183 — scene graph, PBR materials, post-processing
- **GSAP** — camera and UI transitions
- **@chenglou/pretext** — typography layout engine
- **Vitest** — 49 unit tests covering orbital mechanics, projection, and obstacle math

## Deploy

Hosted on Netlify via `netlify.toml`. Build output goes to `dist/`.
