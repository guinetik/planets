// rockyPlanet.frag.glsl — rocky planet surface with optional atmosphere
// common.glsl is prepended at material creation time

precision highp float;

uniform float uTime;
uniform vec3  uBaseColor;
uniform float uHasAtmosphere;  // 0–1
uniform float uSeed;

varying vec3 vModelNormal;
varying vec3 vModelPosition;
varying vec3 vViewNormal;
varying vec3 vViewPosition;

void main() {
    // --- FBM terrain on model-space normal (seeded for consistent terrain) ---
    vec3  noiseCoord = vModelNormal * 4.0 + uSeed * 100.0;
    float terrain    = fbm(noiseCoord, 5);

    // --- Height-based coloring ---
    vec3 lowColor    = uBaseColor * 0.6;   // Valleys / lowlands
    vec3 highColor   = uBaseColor * 1.2;   // Mountains / highlands
    vec3 surfaceColor = mix(lowColor, highColor, terrain);

    // --- Surface variation noise ---
    float variation = noise3D(vModelNormal * 10.0 + uSeed * 50.0);
    surfaceColor *= 0.9 + variation * 0.2;

    // --- Directional lighting ---
    vec3  lightDir = normalize(vec3(1.0, 1.0, 0.5));
    float light    = diffuseLight(vViewNormal, normalize(normalMatrix * lightDir), 0.3);
    surfaceColor  *= light;

    // --- Atmosphere: fresnel rim glow ---
    if (uHasAtmosphere > 0.0) {
        vec3  viewDir   = normalize(-vViewPosition);
        float rim       = fresnel(vViewNormal, viewDir, 3.0);
        vec3  atmoColor = vec3(0.5, 0.7, 1.0);
        surfaceColor    = mix(surfaceColor, atmoColor, rim * uHasAtmosphere * 0.4);
    }

    gl_FragColor = vec4(surfaceColor, 1.0);
}
