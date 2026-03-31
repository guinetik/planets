// src/three/sunMesh.ts
import * as THREE from 'three'
import { SUN_RADIUS, SUN_COLOR, SUN_LIGHT_INTENSITY } from '@/lib/constants'

export interface SunObjects {
  mesh: THREE.Mesh
  light: THREE.PointLight
}

export function createSunMesh(): SunObjects {
  const geometry = new THREE.SphereGeometry(SUN_RADIUS, 32, 32)
  const material = new THREE.MeshBasicMaterial({
    color: SUN_COLOR,
    transparent: true,
    opacity: 0.9,
  })
  const mesh = new THREE.Mesh(geometry, material)

  const light = new THREE.PointLight(SUN_COLOR, SUN_LIGHT_INTENSITY, 100)
  mesh.add(light)

  return { mesh, light }
}
