// src/three/shaders/planet.frag.glsl
uniform float uTime;
uniform vec3  uAccentColor;
uniform float uMeridianCount;
uniform float uLineWidthUV;
uniform float uMeridianOpacity;
uniform float uEquatorOpacity;

varying vec2 vUv;

const float PI        = 3.14159265359;
const vec3  FILL_COLOR = vec3(0.02, 0.02, 0.04);
const float ROTATION_SPEED = 0.05;

float lineStrength(float value, float period, float halfWidth) {
  float wrapped = mod(value, period);
  float dist = min(wrapped, period - wrapped);
  return 1.0 - smoothstep(0.0, halfWidth, dist);
}

void main() {
  float lon = mod(vUv.x + uTime * ROTATION_SPEED / (2.0 * PI), 1.0);
  float lat = vUv.y;

  float meridianStrength = lineStrength(lon, 1.0 / uMeridianCount, uLineWidthUV);
  float equatorDist      = abs(lat - 0.5);
  float equatorStrength  = 1.0 - smoothstep(0.0, uLineWidthUV * 0.5, equatorDist);

  float lineAlpha = max(meridianStrength * uMeridianOpacity, equatorStrength * uEquatorOpacity);
  vec3  color     = mix(FILL_COLOR, uAccentColor, lineAlpha);

  gl_FragColor = vec4(color, 1.0);
}
