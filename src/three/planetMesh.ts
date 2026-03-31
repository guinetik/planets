// src/three/planetMesh.ts
import * as THREE from 'three'
import vertSrc from './shaders/planet.vert.glsl?raw'
import fragSrc from './shaders/planet.frag.glsl?raw'
import {
  PLANET_SPHERE_SEGMENTS,
  PLANET_MERIDIAN_COUNT,
  PLANET_LINE_WIDTH_UV,
  PLANET_MERIDIAN_OPACITY,
  PLANET_EQUATOR_OPACITY,
} from '@/lib/constants'

export interface PlanetMeshUniforms {
  uTime: THREE.IUniform<number>
  uAccentColor: THREE.IUniform<THREE.Color>
  uMeridianCount: THREE.IUniform<number>
  uLineWidthUV: THREE.IUniform<number>
  uMeridianOpacity: THREE.IUniform<number>
  uEquatorOpacity: THREE.IUniform<number>
}

export interface PlanetMesh {
  mesh: THREE.Mesh
  uniforms: PlanetMeshUniforms
}

export function createPlanetMesh(accentHex: string, radius: number): PlanetMesh {
  const uniforms: PlanetMeshUniforms = {
    uTime:            { value: 0 },
    uAccentColor:     { value: new THREE.Color(accentHex) },
    uMeridianCount:   { value: PLANET_MERIDIAN_COUNT },
    uLineWidthUV:     { value: PLANET_LINE_WIDTH_UV },
    uMeridianOpacity: { value: PLANET_MERIDIAN_OPACITY },
    uEquatorOpacity:  { value: PLANET_EQUATOR_OPACITY },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader:   vertSrc,
    fragmentShader: fragSrc,
    uniforms,
    transparent: false,
  })

  const geometry = new THREE.SphereGeometry(radius, PLANET_SPHERE_SEGMENTS, PLANET_SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  return { mesh, uniforms }
}
