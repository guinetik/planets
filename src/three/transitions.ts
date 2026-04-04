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
  MOBILE_DETAIL_PLANET_SCREEN_HEIGHT_RATIO,
  MOBILE_DETAIL_PLANET_X_RATIO,
  ORBIT_PATH_OPACITY,
  CAMERA_FOV,
  CAMERA_NEAR,
  MOON_ORBIT_PATH_OPACITY,
  isMobile,
} from '@/lib/constants'

/** Fixed world-space position where the planet sits during detail view. */
const DETAIL_PLANET_POS = new THREE.Vector3(0, 0, 0)

/** Per-planet scale overrides for the detail view (1.0 = default). */
const DETAIL_SCALE: Record<string, number> = {}

/** How far the camera pulls back during planet-to-planet switch. */
const PULLBACK_DISTANCE = 5

function computeDetailCamera(
  planetVisualRadius: number,
  aspect: number,
) {
  const mobile = isMobile()
  const heightRatio = mobile ? MOBILE_DETAIL_PLANET_SCREEN_HEIGHT_RATIO : DETAIL_PLANET_SCREEN_HEIGHT_RATIO
  const xRatio = mobile ? MOBILE_DETAIL_PLANET_X_RATIO : DETAIL_PLANET_X_RATIO

  const halfFOV = (CAMERA_FOV / 2) * Math.PI / 180
  const tanHalf = Math.tan(halfFOV)

  const distance = planetVisualRadius / (tanHalf * heightRatio)

  const ndcX = 2 * (1 - xRatio) - 1
  const offsetX = ndcX * aspect * tanHalf * distance

  const target = new THREE.Vector3(
    DETAIL_PLANET_POS.x - offsetX,
    DETAIL_PLANET_POS.y,
    DETAIL_PLANET_POS.z,
  )

  const cam = new THREE.Vector3(
    target.x,
    target.y + distance * 0.1,
    target.z + distance,
  )

  // Ensure near plane doesn't clip the planet surface
  const nearestSurface = distance - planetVisualRadius
  const near = Math.min(CAMERA_NEAR, nearestSurface * 0.5)

  return { cam, target, distance, near }
}

/** Animate directly from overview into a planet detail view. */
function animateToDetail(
  entry: PlanetEntry,
  allEntries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  sunMesh: THREE.Mesh | null,
  detail: ReturnType<typeof computeDetailCamera>,
  detailLight?: THREE.DirectionalLight | null,
) {
  // Move the active planet to the showcase position
  gsap.to(entry.planetGroup.position, {
    x: DETAIL_PLANET_POS.x,
    y: DETAIL_PLANET_POS.y,
    z: DETAIL_PLANET_POS.z,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })

  // Hide sun
  if (sunMesh) {
    gsap.to(sunMesh, {
      duration: TRANSITION_DURATION_S,
      onComplete: () => { sunMesh.visible = false },
    })
    for (const child of sunMesh.children) {
      if (child instanceof THREE.Sprite) {
        gsap.to(child.material, { opacity: 0, duration: TRANSITION_DURATION_S })
      }
      if (child instanceof THREE.PointLight) {
        sunMesh.userData.originalLightIntensity = child.intensity
        gsap.to(child, { intensity: 0, duration: TRANSITION_DURATION_S })
      }
    }
  }

  // Hide other planets + all orbit lines
  for (const other of allEntries) {
    if (other.orbitLine) {
      const lineMat = other.orbitLine.material as THREE.LineBasicMaterial
      gsap.to(lineMat, {
        opacity: 0,
        duration: TRANSITION_DURATION_S,
        onComplete: () => { other.orbitLine.visible = false },
      })
    }
    if (other.id === entry.id) continue
    gsap.to({}, {
      duration: TRANSITION_DURATION_S,
      onComplete: () => { other.planetGroup.visible = false },
    })
  }

  // Fade active planet's moon orbit lines
  for (const child of entry.planetGroup.children) {
    if (child instanceof THREE.LineLoop) {
      const lineMat = child.material as THREE.LineBasicMaterial
      gsap.to(lineMat, { opacity: 0, duration: TRANSITION_DURATION_S })
    }
  }

  // Fade in detail key light, dim camera fill light
  if (detailLight) {
    gsap.to(detailLight, { intensity: DETAIL_LIGHT_INTENSITY, duration: TRANSITION_DURATION_S, ease: 'power2.inOut' })
  }
  for (const child of camera.children) {
    if (child instanceof THREE.PointLight) {
      child.userData.overviewIntensity ??= child.intensity
      gsap.to(child, { intensity: 0.15, duration: TRANSITION_DURATION_S, ease: 'power2.inOut' })
    }
  }

  // Adjust near plane to avoid clipping small planets
  gsap.to(camera, {
    near: detail.near,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
    onUpdate: () => { camera.updateProjectionMatrix() },
  })

  // Animate camera
  const startLookAt = controls.target.clone()
  const lookAtProxy = { x: startLookAt.x, y: startLookAt.y, z: startLookAt.z }

  gsap.to(camera.position, {
    x: detail.cam.x, y: detail.cam.y, z: detail.cam.z,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
  })

  gsap.to(lookAtProxy, {
    x: detail.target.x, y: detail.target.y, z: detail.target.z,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z)
    },
    onComplete: () => {
      controls.target.copy(detail.target)
    },
  })
}

const DETAIL_LIGHT_INTENSITY = 0.9

export function transitionToDetail(
  entry: PlanetEntry,
  allEntries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  sunMesh: THREE.Mesh | null,
  previousEntry?: PlanetEntry | null,
  detailLight?: THREE.DirectionalLight | null,
): void {
  controls.enabled = false

  const planetData = PLANETS.find(p => p.id === entry.id)!
  const scale = DETAIL_SCALE[entry.id] ?? 1.0
  const planetVisualRadius = planetData.displayRadius * SIZE_SCALE * scale
  const detail = computeDetailCamera(planetVisualRadius, camera.aspect)

  entry.planetGroup.visible = true
  entry.planetMeshRef.mesh.visible = true

  // Hide moon orbit lines on the incoming planet
  for (const child of entry.planetGroup.children) {
    if (child instanceof THREE.LineLoop) {
      const lineMat = child.material as THREE.LineBasicMaterial
      lineMat.opacity = 0
    }
  }

  if (!previousEntry) {
    // Overview → detail: animate directly
    animateToDetail(entry, allEntries, camera, controls, sunMesh, detail, detailLight)
    return
  }

  // Planet → planet: pull back, swap, zoom in
  const halfDuration = TRANSITION_DURATION_S * 0.6

  // Phase 1: pull camera back
  const pullbackTarget = new THREE.Vector3(0, 0, 0)
  const pullbackCam = new THREE.Vector3(0, PULLBACK_DISTANCE * 0.3, PULLBACK_DISTANCE)

  const lookAtProxy = {
    x: controls.target.x,
    y: controls.target.y,
    z: controls.target.z,
  }

  // Hide previous planet
  gsap.to({}, {
    duration: halfDuration,
    onComplete: () => { previousEntry.planetGroup.visible = false },
  })

  gsap.to(camera.position, {
    x: pullbackCam.x, y: pullbackCam.y, z: pullbackCam.z,
    duration: halfDuration,
    ease: 'power2.in',
    onComplete: () => {
      // Phase 2: move new planet to showcase position instantly, then zoom in
      entry.planetGroup.position.copy(DETAIL_PLANET_POS)

      gsap.to(camera, {
        near: detail.near,
        duration: halfDuration,
        ease: 'power2.out',
        onUpdate: () => { camera.updateProjectionMatrix() },
      })

      gsap.to(camera.position, {
        x: detail.cam.x, y: detail.cam.y, z: detail.cam.z,
        duration: halfDuration,
        ease: 'power2.out',
      })

      gsap.to(lookAtProxy, {
        x: detail.target.x, y: detail.target.y, z: detail.target.z,
        duration: halfDuration,
        ease: 'power2.out',
        onUpdate: () => {
          camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z)
        },
        onComplete: () => {
          controls.target.copy(detail.target)
        },
      })
    },
  })

  gsap.to(lookAtProxy, {
    x: pullbackTarget.x, y: pullbackTarget.y, z: pullbackTarget.z,
    duration: halfDuration,
    ease: 'power2.in',
    onUpdate: () => {
      camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z)
    },
  })
}

export function transitionToOverview(
  entries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  sunMesh: THREE.Mesh | null,
  detailLight?: THREE.DirectionalLight | null,
): void {
  controls.enabled = false

  const startLookAt = controls.target.clone()
  const lookAtProxy = { x: startLookAt.x, y: startLookAt.y, z: startLookAt.z }

  // Restore near plane
  gsap.to(camera, {
    near: CAMERA_NEAR,
    duration: TRANSITION_DURATION_S,
    ease: 'power2.inOut',
    onUpdate: () => { camera.updateProjectionMatrix() },
  })

  // Fade out detail key light, restore camera fill light
  if (detailLight) {
    gsap.to(detailLight, { intensity: 0, duration: TRANSITION_DURATION_S, ease: 'power2.inOut' })
  }
  for (const child of camera.children) {
    if (child instanceof THREE.PointLight) {
      gsap.to(child, { intensity: child.userData.overviewIntensity ?? 0.55, duration: TRANSITION_DURATION_S, ease: 'power2.inOut' })
    }
  }

  // Restore sun
  if (sunMesh) {
    sunMesh.visible = true
    for (const child of sunMesh.children) {
      if (child instanceof THREE.Sprite) {
        gsap.to(child.material, { opacity: 1, duration: TRANSITION_DURATION_S })
      }
      if (child instanceof THREE.PointLight) {
        gsap.to(child, { intensity: sunMesh.userData.originalLightIntensity ?? 22, duration: TRANSITION_DURATION_S })
      }
    }
  }

  // Restore all planet groups and orbit lines
  for (const entry of entries) {
    entry.planetGroup.visible = true
    entry.planetMeshRef.mesh.visible = true

    if (entry.orbitLine) {
      entry.orbitLine.visible = true
      const lineMat = entry.orbitLine.material as THREE.LineBasicMaterial
      gsap.to(lineMat, { opacity: ORBIT_PATH_OPACITY, duration: TRANSITION_DURATION_S })
    }

    for (const child of entry.planetGroup.children) {
      if (child instanceof THREE.LineLoop) {
        const lineMat = child.material as THREE.LineBasicMaterial
        gsap.to(lineMat, { opacity: ORBIT_PATH_OPACITY, duration: TRANSITION_DURATION_S })
      }
    }
  }

  const maxOrbitRadius = Math.max(...entries.map(e => e.orbit.semiMajorAxis))
  const halfVFov = (CAMERA_FOV / 2) * Math.PI / 180
  const halfHFov = Math.atan(Math.tan(halfVFov) * camera.aspect)
  const fitZ = (maxOrbitRadius * 1.15) / Math.tan(halfHFov)

  gsap.to(camera.position, {
    x: 0, y: CAMERA_POSITION_Y, z: fitZ,
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
      controls.maxDistance = 100
      controls.enablePan = true
      controls.enableRotate = true
      controls.enableZoom = true
      controls.enabled = true
    },
  })
}

const INTRO_DURATION = 2.5

/** Intro animation: camera swoops from above, planets and sun fade in. */
export function playIntroAnimation(
  entries: PlanetEntry[],
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  sunMesh: THREE.Mesh | null,
  onComplete?: () => void,
): void {
  controls.enabled = false

  // Start everything invisible
  if (sunMesh) {
    sunMesh.visible = true
    sunMesh.scale.setScalar(0.01)
    for (const child of sunMesh.children) {
      if (child instanceof THREE.Sprite) {
        child.material.opacity = 0
      }
    }
  }

  for (const entry of entries) {
    entry.planetGroup.visible = true

    if (entry.planetMeshRef.isModel) {
      // GLB model: hide the entire mesh initially, reveal it during fade-in
      entry.planetMeshRef.mesh.visible = false
    } else {
      const mat = entry.planetMeshRef.mesh.material as THREE.Material
      mat.transparent = true
      mat.opacity = 0
    }

    // Hide orbit lines initially
    if (entry.orbitLine) {
      entry.orbitLine.visible = true
      const lineMat = entry.orbitLine.material as THREE.LineBasicMaterial
      lineMat.opacity = 0
    }
    for (const child of entry.planetGroup.children) {
      if (child instanceof THREE.LineLoop) {
        const lineMat = child.material as THREE.LineBasicMaterial
        lineMat.opacity = 0
      }
    }
  }

  // Compute Z so the whole solar system fits the viewport width
  const maxOrbitRadius = Math.max(...entries.map(e => e.orbit.semiMajorAxis))
  const halfVFov = (CAMERA_FOV / 2) * Math.PI / 180
  const halfHFov = Math.atan(Math.tan(halfVFov) * camera.aspect)
  const fitZ = (maxOrbitRadius * 1.15) / Math.tan(halfHFov) // 15% padding

  // Camera swoop from above to fitted position
  const lookAtProxy = { x: 0, y: 0, z: 0 }
  gsap.to(camera.position, {
    x: 0,
    y: CAMERA_POSITION_Y,
    z: fitZ,
    duration: INTRO_DURATION,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.lookAt(lookAtProxy.x, lookAtProxy.y, lookAtProxy.z)
    },
    onComplete: () => {
      controls.target.set(0, 0, 0)
      controls.enabled = true
      onComplete?.()
    },
  })

  // Sun scales up
  if (sunMesh) {
    gsap.to(sunMesh.scale, {
      x: 1, y: 1, z: 1,
      duration: INTRO_DURATION * 0.6,
      ease: 'power2.out',
    })
    for (const child of sunMesh.children) {
      if (child instanceof THREE.Sprite) {
        gsap.to(child.material, {
          opacity: 1,
          duration: INTRO_DURATION * 0.8,
          delay: INTRO_DURATION * 0.2,
        })
      }
    }
  }

  // Planets fade in proportional to distance from the sun
  const maxAxis = Math.max(...entries.map(e => e.orbit.semiMajorAxis))
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const distFraction = entry.orbit.semiMajorAxis / maxAxis
    const delay = 0.15 + distFraction * 1.8

    if (entry.planetMeshRef.isModel) {
      // GLB model: just make visible after delay
      gsap.to({}, {
        duration: 0.01,
        delay,
        onComplete: () => { entry.planetMeshRef.mesh.visible = true },
      })
    } else {
      const mat = entry.planetMeshRef.mesh.material as THREE.Material
      gsap.to(mat, {
        opacity: 1,
        duration: 1.2,
        delay,
        onComplete: () => {
          mat.transparent = false
        },
      })
    }

    // Orbit lines fade in
    if (entry.orbitLine) {
      const lineMat = entry.orbitLine.material as THREE.LineBasicMaterial
      gsap.to(lineMat, {
        opacity: ORBIT_PATH_OPACITY,
        duration: 1.0,
        delay: delay + 0.3,
      })
    }

    // Moon orbit lines
    for (const child of entry.planetGroup.children) {
      if (child instanceof THREE.LineLoop) {
        const lineMat = child.material as THREE.LineBasicMaterial
        gsap.to(lineMat, {
          opacity: MOON_ORBIT_PATH_OPACITY,
          duration: 1.0,
          delay: delay + 0.5,
        })
      }
    }
  }
}
