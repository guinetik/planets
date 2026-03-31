// src/composables/useObstacles.ts
import * as THREE from 'three'
import { ref, type Ref } from 'vue'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'
import type { Obstacle } from '@/lib/obstacles'
import { ndcToScreen, screenRadius, fitEllipseToNDCPoints } from '@/lib/projection'
import {
  TEXT_COLUMN_WIDTH,
  TEXT_COLUMN_LEFT_PX,
  RING_PROJECTION_SAMPLES,
  RING_TILT_RADIANS,
  RING_INNER_RATIO,
  RING_OUTER_RATIO,
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
) {
  const obstacles = ref<Obstacle[]>([])

  function updateObstacles(): void {
    if (!sceneObjects.value || !activePlanetId.value) {
      obstacles.value = []
      return
    }

    const { camera } = sceneObjects.value
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const entry = planetEntries.value.find(e => e.id === activePlanetId.value)
    if (!entry) { obstacles.value = []; return }

    const result: Obstacle[] = []
    const worldPos = entry.planetGroup.position.clone()
    const planetWorldRadius = entry.planetGroup.scale.x

    // Planet sphere
    result.push(projectSphere(worldPos, planetWorldRadius, camera, viewport))

    // Moon obstacles — only if moon x overlaps text column
    const textColumnRight = TEXT_COLUMN_LEFT_PX + TEXT_COLUMN_WIDTH
    for (const moon of entry.moonEntries) {
      const moonWorldPos = new THREE.Vector3()
      moon.meshRef.mesh.getWorldPosition(moonWorldPos)
      const moonRadius = (moon.meshRef.mesh.geometry as THREE.SphereGeometry).parameters.radius
      const moonObs = projectSphere(moonWorldPos, moonRadius, camera, viewport)
      if (moonObs.cx - moonObs.r < textColumnRight) {
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

    obstacles.value = result
  }

  return { obstacles, updateObstacles }
}
