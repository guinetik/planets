// src/lib/constants.ts

// Scene
export const BACKGROUND_COLOR = 0x000000;

// Typography (keep for future Pretext use)
export const PROSE_FONT = "26px Georgia, serif";
export const PROSE_LINE_HEIGHT = 46;
export const TEXT_COLUMN_WIDTH = 0;
export const TEXT_COLUMN_LEFT_PX = 80;
export const PROSE_TOP_Y_PX = 80;

// Transition timings
export const TRANSITION_DURATION_S = 0.8;
export const TEXT_FADE_DURATION_S = 0.4;
export const TEXT_FADE_DELAY_S = 0.5;

// Scale factors: gcanvas pixel values → Three.js world units
export const ORBIT_SCALE = 0.02;
export const SIZE_SCALE = 50.0; // Larger bodies — sun radius ~1.375, Earth ~0.385

// Camera
export const CAMERA_FOV = 50;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 500;
export const CAMERA_POSITION_Y = 8;
export const CAMERA_POSITION_Z = 14;

// Tone mapping
export const TONE_MAPPING_EXPOSURE = 1.35;

// Bloom
export const BLOOM_STRENGTH = 0.72;
export const BLOOM_RADIUS = 0.55;
export const BLOOM_THRESHOLD = 0.45;

// Scene lighting
export const STARLIGHT_AMBIENT_COLOR = 0x2a3858;
export const STARLIGHT_AMBIENT_INTENSITY = 0.55;
export const STARLIGHT_HEMISPHERE_SKY_COLOR = 0x7f97c8;
export const STARLIGHT_HEMISPHERE_GROUND_COLOR = 0x1f160f;
export const STARLIGHT_HEMISPHERE_INTENSITY = 0.6;
export const STARLIGHT_FILL_COLOR = 0xa9bfe6;
export const STARLIGHT_FILL_INTENSITY = 0.35;
export const CAMERA_FILL_LIGHT_INTENSITY = 0.55;

// Shader lighting
export const PLANET_SHADER_AMBIENT_INTENSITY = 0.24;
export const PLANET_SHADER_BACKLIGHT_INTENSITY = 0.16;

// Sun
export const SUN_LIGHT_INTENSITY = 22.0;
export const SUN_LIGHT_RANGE = 0; // 0 = infinite range (no distance falloff cutoff)
export const SUN_LIGHT_DECAY = 1.15;

// Spheres
export const SPHERE_SEGMENTS = 64;
export const MOON_SPHERE_SEGMENTS = 32;

// Orbit paths
export const ORBIT_PATH_SEGMENTS = 128;
export const ORBIT_PATH_COLOR = 0xffffff;
export const ORBIT_PATH_OPACITY = 0.18;
export const MOON_ORBIT_PATH_OPACITY = 0.1;

// Starfield
export const STARFIELD_COUNT = 1200;
export const STARFIELD_SPREAD = 240;
export const STARFIELD_MIN_SIZE = 0.5;
export const STARFIELD_MAX_SIZE = 2.0;

// Simulation
export const DEFAULT_TIME_SCALE = 5.0;
export const ROTATION_SPEED_DIVISOR = 20.0;
export const MOON_ORBIT_SPEED_DIVISOR = 5.0;

// Raycasting
export const RAYCAST_HOVER_SCALE = 1.08;
export const RAYCAST_HOVER_TRANSITION_S = 0.2;

// Labels
export const LABEL_FONT = "11px monospace";
export const LABEL_COLOR = "#999999";
export const LABEL_OFFSET_Y = 18;

// Detail view
export const DETAIL_PLANET_SCREEN_HEIGHT_RATIO = 1.5;
export const DETAIL_PLANET_X_RATIO = 0.285;

// Obstacle projection
export const SUN_RADIUS = 0.045 * 50.0; // SUN.displayRadius * SIZE_SCALE
