// src/composables/usePretextLayout.ts
import * as THREE from 'three'
import { ref, type Ref } from 'vue'
import { layoutProseAlongCurve, type LayoutLine, type CurveLayoutConfig } from '@/typography/layout'
import { projectSphere } from './useObstacles'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'
import { TEXT_COLUMN_LEFT_PX } from '@/lib/constants'

const CURVE_PADDING = 20 // px between text and planet edge

export function usePretextLayout(
  sceneObjects: Ref<SceneObjects | null>,
) {
  const lines = ref<LayoutLine[]>([])
  const startY = ref(0)
  const leftX = TEXT_COLUMN_LEFT_PX

  function updateCurveLayout(prose: string, entry: PlanetEntry): void {
    const objs = sceneObjects.value
    if (!objs) return

    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const worldPos = entry.planetGroup.position.clone()
    const geomRadius = (entry.planetMeshRef.mesh.geometry as THREE.SphereGeometry).parameters.radius
    const planetWorldRadius = geomRadius * entry.planetGroup.scale.x

    const circle = projectSphere(worldPos, planetWorldRadius, objs.camera, viewport)

    const config: CurveLayoutConfig = {
      planet: circle,
      padding: CURVE_PADDING,
      leftX,
    }

    lines.value = layoutProseAlongCurve(prose, config)
    startY.value = circle.cy - circle.r
  }

  function clearLayout(): void {
    lines.value = []
  }

  return {
    lines,
    startY,
    leftX,
    updateCurveLayout,
    clearLayout,
  }
}
