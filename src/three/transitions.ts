// src/three/transitions.ts
import * as THREE from 'three'
import gsap from 'gsap'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { PlanetEntry } from '@/composables/usePlanets'
import { PLANETS } from '@/lib/planets'
import {
  TRANSITION_DURATION_S,
  CAMERA_POSITION_Y,
  CAMERA_POSITION_Z,
  SIZE_SCALE,
  DETAIL_PLANET_SCREEN_HEIGHT_RATIO,
  DETAIL_PLANET_X_RATIO,
  ORBIT_PATH_OPACITY,
} from '@/lib/constants'

/**
 * Compute detail camera so the planet appears on the right side of the screen.
 * Returns both camera position and a look-at target offset to the LEFT of the planet.
 * OrbitControls will orbit around this offset target, keeping the planet on the right.
 */
function computeDetailCamera(
  planetPos: THREE.Vector3,
  planetVisualRadius: number,
  camera: THREE.PerspectiveCamera,
) {
  const halfFOV = (camera.fov / 2) * Math.PI / 180
  const distance = planetVisualRadius / (Math.tan(halfFOV) * DETAIL_PLANET_SCREEN_HEIGHT_RATIO / 2)

  // Offset so planet projects to ~72% from left (NDC x = 0.44)
  const ndcX = 2 * (1 - DETAIL_PLANET_X_RATIO) - 1
  const offsetX = ndcX * camera.aspect * Math.tan(halfFOV) * distance

  // Look-at target is offset LEFT of the planet
  const targetX = planetPos.x - offsetX
  const targetY = planetPos.y
  const targetZ = planetPos.z

  // Camera sits behind the target, looking forward
  const camX = targetX
  const camY = targetY + distance * 0.1
  const camZ = targetZ + distance

  return { camX, camY, camZ, targetX, targetY, targetZ, distance }
}

export function transitionToDetail(
  entry: PlanetEntry,
  allEntries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  sunMesh: THREE.Mesh | null,
): void {
  // Fully disable controls — stays disabled for entire detail view
  controls.enabled = false

  const planetData = PLANETS.find(p => p.id === entry.id)!
  const planetVisualRadius = planetData.displayRadius * SIZE_SCALE
  const planetPos = entry.planetGroup.position.clone()
  const detail = computeDetailCamera(planetPos, planetVisualRadius, camera)

  // Fade out sun
  if (sunMesh) {
    const sunMat = sunMesh.material as THREE.ShaderMaterial
    sunMat.transparent = true
    gsap.to(sunMat, { opacity: 0, duration: TRANSITION_DURATION_S })
  }

  // Fade out other planets + all orbit lines
  for (const other of allEntries) {
    if (other.orbitLine) {
      const lineMat = other.orbitLine.material as THREE.LineBasicMaterial
      gsap.to(lineMat, { opacity: 0, duration: TRANSITION_DURATION_S })
    }

    if (other.id === entry.id) continue
    const mat = other.planetMeshRef.mesh.material as THREE.ShaderMaterial
    mat.transparent = true
    gsap.to(mat, { opacity: 0, duration: TRANSITION_DURATION_S })
    for (const moon of other.moonEntries) {
      const moonMat = moon.meshRef.mesh.material as THREE.ShaderMaterial
      gsap.to(moonMat, { opacity: 0, duration: TRANSITION_DURATION_S })
    }
  }

  // Animate look-at from current controls target to the offset target
  const startLookAt = controls.target.clone()
  const lookAtProxy = { x: startLookAt.x, y: startLookAt.y, z: startLookAt.z }

  gsap.to(camera.position, {
    x: detail.camX, y: detail.camY, z: detail.camZ,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })

  gsap.to(lookAtProxy, {
    x: detail.targetX, y: detail.targetY, z: detail.targetZ,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z)
    },
    onComplete: () => {
      // Keep controls disabled in detail — no mouse interaction
      controls.target.set(detail.targetX, detail.targetY, detail.targetZ)
    },
  })
}

export function transitionToOverview(
  entries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  sunMesh: THREE.Mesh | null,
): void {
  controls.enabled = false

  const startLookAt = controls.target.clone()
  const lookAtProxy = { x: startLookAt.x, y: startLookAt.y, z: startLookAt.z }

  // Fade sun back in
  if (sunMesh) {
    const sunMat = sunMesh.material as THREE.ShaderMaterial
    gsap.to(sunMat, { opacity: 1, duration: TRANSITION_DURATION_S })
  }

  for (const entry of entries) {
    const mat = entry.planetMeshRef.mesh.material as THREE.ShaderMaterial
    mat.transparent = false
    gsap.to(mat, { opacity: 1, duration: TRANSITION_DURATION_S })
    for (const moon of entry.moonEntries) {
      const moonMat = moon.meshRef.mesh.material as THREE.ShaderMaterial
      gsap.to(moonMat, { opacity: 1, duration: TRANSITION_DURATION_S })
    }

    if (entry.orbitLine) {
      const lineMat = entry.orbitLine.material as THREE.LineBasicMaterial
      gsap.to(lineMat, { opacity: ORBIT_PATH_OPACITY, duration: TRANSITION_DURATION_S })
    }
  }

  gsap.to(camera.position, {
    x: 0, y: CAMERA_POSITION_Y, z: CAMERA_POSITION_Z,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })

  gsap.to(lookAtProxy, {
    x: 0, y: 0, z: 0,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z)
    },
    onComplete: () => {
      controls.target.set(0, 0, 0)
      controls.minDistance = 4
      controls.maxDistance = 40
      controls.enablePan = true
      controls.enableRotate = true
      controls.enableZoom = true
      controls.enabled = true
    },
  })
}
