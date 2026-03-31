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
export const PLANET_ROTATION_SPEED = 0.05          // rad/s — mirrored as ROTATION_SPEED in planet.frag.glsl
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
export const SUN_SPHERE_SEGMENTS = 32
export const SUN_MESH_OPACITY = 0.9
export const SUN_LIGHT_RANGE = 100
export const OVERVIEW_CAMERA_FOV = 60
export const OVERVIEW_CAMERA_Z = 22
export const OVERVIEW_CAMERA_NEAR = 0.1
export const OVERVIEW_CAMERA_FAR = 1000

// ── Detail scene ─────────────────────────────────────────────────
export const DETAIL_PLANET_SCREEN_HEIGHT_RATIO = 0.85   // planet fills 85% of viewport height
export const DETAIL_PLANET_X_RATIO = 0.28               // planet center at 28% from right edge

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
