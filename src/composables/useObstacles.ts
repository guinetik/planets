// src/composables/useObstacles.ts
import * as THREE from 'three'
import { ref, type Ref } from 'vue'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'
import type { Obstacle } from '@/lib/obstacles'
import { ndcToScreen, screenRadius, fitEllipseToNDCPoints } from '@/lib/projection'
import type { ViewState } from './useSceneState'
import {
  TEXT_COLUMN_LEFT_PX,
  RING_PROJECTION_SAMPLES,
  RING_TILT_RADIANS,
  RING_INNER_RATIO,
  RING_OUTER_RATIO,
  SUN_RADIUS,
} from '@/lib/constants'

const _vec = new THREE.Vector3()
const _vecEdge = new THREE.Vector3()

function projectSphere(
  worldPos: THREE.Vector3,
  worldRadius: number,
  camera: THREE.PerspectiveCamera,
  viewport: { width: number; height: number },
): { kind: 'circle'; cx: number; cy: number; r: number } {
  _vec.copy(worldPos)
  const centerNDC = _vec.clone().project(camera)

  _vecEdge.copy(worldPos).add(new THREE.Vector3(worldRadius, 0, 0))
  const edgeNDC = _vecEdge.clone().project(camera)

  const center = ndcToScreen({ x: centerNDC.x, y: centerNDC.y }, viewport)
  const r = screenRadius(
    { x: centerNDC.x, y: centerNDC.y },
    { x: edgeNDC.x, y: edgeNDC.y },
    viewport,
  )

  return { kind: 'circle', cx: center.x, cy: center.y, r }
}

export function useObstacles(
  sceneObjects: Ref<SceneObjects | null>,
  planetEntries: Ref<PlanetEntry[]>,
  activePlanetId: Ref<string | null>,
  view: Ref<ViewState>,
) {
  const obstacles = ref<Obstacle[]>([])

  function updateObstacles(): void {
    if (!sceneObjects.value) {
      obstacles.value = []
      return
    }

    const { camera } = sceneObjects.value
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const textColumnRight = viewport.width - TEXT_COLUMN_LEFT_PX
    const result: Obstacle[] = []

    // Always project the sun
    const sunObs = projectSphere(new THREE.Vector3(0, 0, 0), SUN_RADIUS, camera, viewport)
    if (sunObs.cx + sunObs.r > TEXT_COLUMN_LEFT_PX && sunObs.cx - sunObs.r < textColumnRight) {
      result.push(sunObs)
    }

    // Project all planet spheres
    for (const entry of planetEntries.value) {
      const mat = entry.planetMeshRef.mesh.material as THREE.ShaderMaterial
      if (mat.opacity < 0.1) continue  // skip faded-out planets

      const worldPos = entry.planetGroup.position.clone()
      const geomRadius = (entry.planetMeshRef.mesh.geometry as THREE.SphereGeometry).parameters.radius
      const planetWorldRadius = geomRadius * entry.planetGroup.scale.x

      const obs = projectSphere(worldPos, planetWorldRadius, camera, viewport)
      // Only include if it could potentially overlap the text column
      if (obs.cx + obs.r > TEXT_COLUMN_LEFT_PX && obs.cx - obs.r < textColumnRight + 100) {
        result.push(obs)
      }

      // In detail mode, also project moons and ring of the active planet
      if (view.value === 'detail' && entry.id === activePlanetId.value) {
        for (const moon of entry.moonEntries) {
          const moonWorldPos = new THREE.Vector3()
          moon.meshRef.mesh.getWorldPosition(moonWorldPos)
          const moonGeomRadius = (moon.meshRef.mesh.geometry as THREE.SphereGeometry).parameters.radius
          const moonWorldRadius = moonGeomRadius * entry.planetGroup.scale.x
          const moonObs = projectSphere(moonWorldPos, moonWorldRadius, camera, viewport)
          if (moonObs.cx + moonObs.r > TEXT_COLUMN_LEFT_PX && moonObs.cx - moonObs.r < textColumnRight) {
            result.push(moonObs)
          }
        }

        // Ring obstacle (Saturn)
        if (entry.ringMesh) {
          const avgRadius = ((RING_INNER_RATIO + RING_OUTER_RATIO) / 2) * planetWorldRadius
          const ndcPoints: { x: number; y: number }[] = []
          for (let i = 0; i < RING_PROJECTION_SAMPLES; i++) {
            const angle = (i / RING_PROJECTION_SAMPLES) * Math.PI * 2
            const localX = avgRadius * Math.cos(angle)
            const localZ = avgRadius * Math.sin(angle)
            const ringWorldPos = new THREE.Vector3(
              worldPos.x + localX,
              worldPos.y + localZ * Math.sin(RING_TILT_RADIANS),
              worldPos.z + localZ * Math.cos(RING_TILT_RADIANS),
            )
            _vec.copy(ringWorldPos)
            const ndc = _vec.clone().project(camera)
            ndcPoints.push({ x: ndc.x, y: ndc.y })
          }
          const ellipse = fitEllipseToNDCPoints(ndcPoints, viewport)
          result.push({ kind: 'ellipse', ...ellipse })
        }
      }
    }

    obstacles.value = result
  }

  return { obstacles, updateObstacles }
}
