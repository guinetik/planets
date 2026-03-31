// src/three/transitions.ts
import * as THREE from 'three'
import gsap from 'gsap'
import type { PlanetEntry } from '@/composables/usePlanets'
import {
  TRANSITION_DURATION_S,
  OVERVIEW_CAMERA_Z,
} from '@/lib/constants'

export function transitionToDetail(
  entry: PlanetEntry,
  allEntries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  targetX: number,
  targetScale: number,
): void {
  for (const other of allEntries) {
    if (other.id === entry.id) continue
    const mat = other.planetMeshRef.mesh.material as THREE.ShaderMaterial
    mat.transparent = true
    gsap.to(mat, { opacity: 0, duration: TRANSITION_DURATION_S })
    for (const moon of other.moonEntries) {
      const moonMat = moon.meshRef.mesh.material as THREE.ShaderMaterial
      gsap.to(moonMat, { opacity: 0, duration: TRANSITION_DURATION_S })
    }
  }

  gsap.to(entry.planetGroup.position, {
    x: targetX, y: 0, z: 0,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })
  gsap.to(entry.planetGroup.scale, {
    x: targetScale, y: targetScale, z: targetScale,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })
}

export function transitionToOverview(
  entries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
): void {
  for (const entry of entries) {
    const mat = entry.planetMeshRef.mesh.material as THREE.ShaderMaterial
    mat.transparent = false
    gsap.to(mat, { opacity: 1, duration: TRANSITION_DURATION_S })
    gsap.to(entry.planetGroup.scale, {
      x: 1, y: 1, z: 1,
      duration: TRANSITION_DURATION_S,
      ease: 'power2.inOut',
    })
    for (const moon of entry.moonEntries) {
      const moonMat = moon.meshRef.mesh.material as THREE.ShaderMaterial
      gsap.to(moonMat, { opacity: 1, duration: TRANSITION_DURATION_S })
    }
  }
  gsap.to(camera.position, {
    z: OVERVIEW_CAMERA_Z,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })
}
