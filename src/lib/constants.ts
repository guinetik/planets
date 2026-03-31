// src/lib/constants.ts

// Scene
export const BACKGROUND_COLOR = 0x000000

// Typography (keep for future Pretext use)
export const PROSE_FONT = '26px Georgia, serif'
export const PROSE_LINE_HEIGHT = 46
export const TEXT_COLUMN_WIDTH = 0
export const TEXT_COLUMN_LEFT_PX = 80
export const PROSE_TOP_Y_PX = 80

// Transition timings
export const TRANSITION_DURATION_S = 0.8
export const TEXT_FADE_DURATION_S = 0.4
export const TEXT_FADE_DELAY_S = 0.5

// Scale factors: gcanvas pixel values → Three.js world units
export const ORBIT_SCALE = 0.02
export const SIZE_SCALE = 26.0

// Camera
export const CAMERA_FOV = 50
export const CAMERA_NEAR = 0.1
export const CAMERA_FAR = 500
export const CAMERA_POSITION_Y = 8
export const CAMERA_POSITION_Z = 14

// Bloom
export const BLOOM_STRENGTH = 0.8
export const BLOOM_RADIUS = 0.5
export const BLOOM_THRESHOLD = 0.4

// Sun
export const SUN_LIGHT_INTENSITY = 2.0
export const SUN_LIGHT_RANGE = 100

// Spheres
export const SPHERE_SEGMENTS = 64
export const MOON_SPHERE_SEGMENTS = 32

// Orbit paths
export const ORBIT_PATH_SEGMENTS = 128
export const ORBIT_PATH_COLOR = 0xffffff
export const ORBIT_PATH_OPACITY = 0.18
export const MOON_ORBIT_PATH_OPACITY = 0.10

// Ring (Saturn)
export const RING_SEGMENTS = 64

// Starfield
export const STARFIELD_COUNT = 600
export const STARFIELD_SPREAD = 200
export const STARFIELD_MIN_SIZE = 0.5
export const STARFIELD_MAX_SIZE = 2.0

// Simulation
export const DEFAULT_TIME_SCALE = 1.0

// Raycasting
export const RAYCAST_HOVER_SCALE = 1.08
export const RAYCAST_HOVER_TRANSITION_S = 0.2

// Labels
export const LABEL_FONT = '11px monospace'
export const LABEL_COLOR = '#999999'
export const LABEL_OFFSET_Y = 18

// Detail view
export const DETAIL_PLANET_SCREEN_HEIGHT_RATIO = 2.0
export const DETAIL_PLANET_X_RATIO = 0.15

// Obstacle projection
export const RING_PROJECTION_SAMPLES = 64
export const RING_TILT_RADIANS = 26.73 * (Math.PI / 180)
export const RING_INNER_RATIO = 1.15
export const RING_OUTER_RATIO = 1.6
export const SUN_RADIUS = 0.0275 * 26.0  // SUN.displayRadius * SIZE_SCALE
