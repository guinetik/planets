// src/three/moonMesh.ts
import * as THREE from 'three'
import vertSrc from './shaders/planet.vert.glsl?raw'
import fragSrc from './shaders/planet.frag.glsl?raw'
import {
  MOON_SPHERE_SEGMENTS,
  MOON_OPACITY,
  PLANET_MERIDIAN_COUNT,
  PLANET_LINE_WIDTH_UV,
  PLANET_MERIDIAN_OPACITY,
  PLANET_EQUATOR_OPACITY,
} from '@/lib/constants'
import type { PlanetMeshUniforms } from './planetMesh'

export interface MoonMesh {
  mesh: THREE.Mesh
  uniforms: PlanetMeshUniforms
}

export function createMoonMesh(accentHex: string, radius: number): MoonMesh {
  const uniforms: PlanetMeshUniforms = {
    uTime:            { value: 0 },
    uAccentColor:     { value: new THREE.Color(accentHex) },
    uMeridianCount:   { value: PLANET_MERIDIAN_COUNT },
    uLineWidthUV:     { value: PLANET_LINE_WIDTH_UV },
    uMeridianOpacity: { value: PLANET_MERIDIAN_OPACITY * MOON_OPACITY },
    uEquatorOpacity:  { value: PLANET_EQUATOR_OPACITY * MOON_OPACITY },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader:   vertSrc,
    fragmentShader: fragSrc,
    uniforms,
    transparent: true,
    opacity: MOON_OPACITY,
  })

  const geometry = new THREE.SphereGeometry(radius, MOON_SPHERE_SEGMENTS, MOON_SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  return { mesh, uniforms }
}
