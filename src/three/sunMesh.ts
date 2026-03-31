// src/three/sunMesh.ts
import * as THREE from 'three'
import { SUN_RADIUS, SUN_COLOR, SUN_LIGHT_INTENSITY, SUN_SPHERE_SEGMENTS, SUN_MESH_OPACITY, SUN_LIGHT_RANGE } from '@/lib/constants'

export interface SunObjects {
  mesh: THREE.Mesh
  light: THREE.PointLight
}

export function createSunMesh(): SunObjects {
  const geometry = new THREE.SphereGeometry(SUN_RADIUS, SUN_SPHERE_SEGMENTS, SUN_SPHERE_SEGMENTS)
  const material = new THREE.MeshBasicMaterial({
    color: SUN_COLOR,
    transparent: true,
    opacity: SUN_MESH_OPACITY,
  })
  const mesh = new THREE.Mesh(geometry, material)

  const light = new THREE.PointLight(SUN_COLOR, SUN_LIGHT_INTENSITY, SUN_LIGHT_RANGE)
  mesh.add(light)

  return { mesh, light }
}
