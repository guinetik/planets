import * as THREE from 'three'
import vertSrc from './shaders/sphere.vert.glsl?raw'
import commonSrc from './shaders/common.glsl?raw'
import rockyFragSrc from './shaders/rockyPlanet.frag.glsl?raw'
import type { ShaderConfig } from '@/lib/planets'
import { MOON_SPHERE_SEGMENTS, SIZE_SCALE } from '@/lib/constants'

export interface MoonMesh {
  mesh: THREE.Mesh
  uniforms: Record<string, THREE.IUniform>
}

export function createMoonMesh(shader: ShaderConfig, displayRadius: number): MoonMesh {
  const radius = displayRadius * SIZE_SCALE

  const uniforms: Record<string, THREE.IUniform> = { uTime: { value: 0 } }
  for (const [key, val] of Object.entries(shader.uniforms)) {
    if (Array.isArray(val)) {
      uniforms[key] = { value: new THREE.Vector3(...val) }
    } else {
      uniforms[key] = { value: val }
    }
  }

  const material = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: commonSrc + '\n' + rockyFragSrc,
    uniforms,
    transparent: true,
  })

  const geometry = new THREE.SphereGeometry(radius, MOON_SPHERE_SEGMENTS, MOON_SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  return { mesh, uniforms }
}
