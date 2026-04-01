// src/composables/usePretextLayout.ts
import * as THREE from 'three'
import { ref, nextTick, type Ref } from 'vue'
import { layoutProseAlongCurve, type LayoutLine, type CurveLayoutConfig } from '@/typography/layout'
import { projectSphere } from './useObstacles'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'

export function usePretextLayout(
  sceneObjects: Ref<SceneObjects | null>,
) {
  const lines = ref<LayoutLine[]>([])
  const startY = ref(0)
  const leftX = ref(0)
  const fontSize = ref(26)
  const lineHeight = ref(46)
  const visible = ref(false)
  let _currentPlanetId = ''
  let _pendingPlanetId = ''
  let _hideTimer: ReturnType<typeof setTimeout> | null = null
  let _transitioning = false

  function updateCurveLayout(prose: string, entry: PlanetEntry): void {
    if (_transitioning) return
    const objs = sceneObjects.value
    if (!objs) return

    const w = window.innerWidth
    const h = window.innerHeight
    const viewport = { width: w, height: h }

    // Project the actual planet sphere to screen space
    const worldPos = entry.planetGroup.position.clone()
    const geomRadius = (entry.planetMeshRef.mesh.geometry as THREE.SphereGeometry).parameters.radius
    const planetWorldRadius = geomRadius * entry.planetGroup.scale.x

    const circle = projectSphere(worldPos, planetWorldRadius, objs.camera, viewport)

    // Perspective silhouette correction: visual edge > projected equatorial edge
    const dist = objs.camera.position.distanceTo(worldPos)
    const ratio = dist > planetWorldRadius
      ? 1 / Math.sqrt(1 - (planetWorldRadius / dist) ** 2)
      : 1
    const screenRadius = circle.r * ratio
    const cx = circle.cx
    const cy = circle.cy

    const planet = { kind: 'circle' as const, cx, cy, r: screenRadius }

    // Position div well left of the planet edge
    const divX = (cx - screenRadius) * 0.22

    // Layout uses a smaller leftX so lines extend toward (but not over) the planet
    const layoutLeftX = divX * 0.3

    // Padding scales with planet size — keeps text off the planet surface
    const padding = screenRadius * 0.32

    const config: CurveLayoutConfig = {
      planet,
      padding,
      leftX: layoutLeftX,
    }

    const result = layoutProseAlongCurve(prose, config)
    lines.value = result.lines
    startY.value = result.startY
    leftX.value = divX
    fontSize.value = result.fontSize
    lineHeight.value = result.lineHeight
  }

  /** Call when the active planet changes — triggers leave/enter animation */
  function transitionTo(planetId: string, prose: string, entry: PlanetEntry): void {
    // Already showing this planet, or already transitioning to it
    if (planetId === _currentPlanetId && visible.value) return
    if (planetId === _pendingPlanetId) return

    _pendingPlanetId = planetId
    if (_hideTimer) clearTimeout(_hideTimer)

    if (_currentPlanetId && _currentPlanetId !== planetId) {
      // Hide current lines with reverse stagger, then show new
      _transitioning = true
      visible.value = false
      const leaveMs = lines.value.length * 25 + 350
      _hideTimer = setTimeout(() => {
        _currentPlanetId = planetId
        _transitioning = false
        updateCurveLayout(prose, entry)
        nextTick(() => {
          requestAnimationFrame(() => {
            visible.value = true
          })
        })
        _hideTimer = null
      }, leaveMs)
    } else {
      // First planet — wait for camera transition to finish before showing
      _currentPlanetId = planetId
      _transitioning = true
      _hideTimer = setTimeout(() => {
        _transitioning = false
        updateCurveLayout(prose, entry)
        nextTick(() => {
          requestAnimationFrame(() => {
            visible.value = true
          })
        })
        _hideTimer = null
      }, 900)
    }
  }

  /** Fade out text, then call onComplete when leave animation finishes */
  function hideAndThen(onComplete: () => void): void {
    if (_hideTimer) clearTimeout(_hideTimer)
    if (!visible.value || lines.value.length === 0) {
      clearLayout()
      onComplete()
      return
    }
    visible.value = false
    const leaveMs = lines.value.length * 25 + 350
    _hideTimer = setTimeout(() => {
      clearLayout()
      onComplete()
    }, leaveMs)
  }

  function clearLayout(): void {
    visible.value = false
    _currentPlanetId = ''
    _pendingPlanetId = ''
    _transitioning = false
    if (_hideTimer) clearTimeout(_hideTimer)
    _hideTimer = null
  }

  return {
    lines,
    startY,
    leftX,
    fontSize,
    lineHeight,
    visible,
    updateCurveLayout,
    transitionTo,
    hideAndThen,
    clearLayout,
  }
}
