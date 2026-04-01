// src/three/moonMesh.ts
import * as THREE from 'three'
import vertSrc from './shaders/sphere.vert.glsl?raw'
import commonSrc from './shaders/common.glsl?raw'
import rockyFragSrc from './shaders/rockyPlanet.frag.glsl?raw'
import type { ShaderConfig } from '@/lib/planets'
import type { LoadedModel } from './modelLoader'
import { MOON_SPHERE_SEGMENTS, SIZE_SCALE } from '@/lib/constants'

export interface MoonMesh {
  mesh: THREE.Mesh
  uniforms: Record<string, THREE.IUniform>
}

export function createMoonMesh(
  shader: ShaderConfig,
  displayRadius: number,
  model?: LoadedModel,
): MoonMesh {
  const radius = displayRadius * SIZE_SCALE
  const geometry = new THREE.SphereGeometry(radius, MOON_SPHERE_SEGMENTS, MOON_SPHERE_SEGMENTS)

  if (model) {
    const material = new THREE.MeshBasicMaterial({ visible: false })
    const mesh = new THREE.Mesh(geometry, material)

    const clone = model.scene.clone()
    clone.scale.setScalar(radius / model.radius)
    mesh.add(clone)

    return { mesh, uniforms: {} }
  }

  // Fallback: procedural shader
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uLightDir: { value: new THREE.Vector3(1, 0.6, 0.4).normalize() },
    uAmbientStrength: { value: 0.24 },
    uBacklightStrength: { value: 0.14 },
  }
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

  return { mesh: new THREE.Mesh(geometry, material), uniforms }
}
