import * as THREE from 'three'
import vertSrc from './shaders/sphere.vert.glsl?raw'
import commonSrc from './shaders/common.glsl?raw'
import rockyFragSrc from './shaders/rockyPlanet.frag.glsl?raw'
import gasFragSrc from './shaders/gasGiant.frag.glsl?raw'
import type { ShaderConfig } from '@/lib/planets'
import { SPHERE_SEGMENTS, SIZE_SCALE } from '@/lib/constants'

export interface PlanetMesh {
  mesh: THREE.Mesh
  uniforms: Record<string, THREE.IUniform>
}

export function createPlanetMesh(shader: ShaderConfig, displayRadius: number): PlanetMesh {
  const radius = displayRadius * SIZE_SCALE

  const uniforms: Record<string, THREE.IUniform> = { uTime: { value: 0 } }
  for (const [key, val] of Object.entries(shader.uniforms)) {
    if (Array.isArray(val)) {
      uniforms[key] = { value: new THREE.Vector3(...val) }
    } else {
      uniforms[key] = { value: val }
    }
  }

  const fragSrc = shader.type === 'gasGiant' ? gasFragSrc : rockyFragSrc

  const material = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: commonSrc + '\n' + fragSrc,
    uniforms,
    transparent: true,
  })

  const geometry = new THREE.SphereGeometry(radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  return { mesh, uniforms }
}
