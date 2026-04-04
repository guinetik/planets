// src/composables/usePretextLayout.ts
import * as THREE from 'three'
import { ref, nextTick, type Ref } from 'vue'
import { layoutProseAlongCurve, layoutProseInsideCircle, type LayoutLine, type CurveLayoutConfig } from '@/typography/layout'
import { projectSphere } from './useObstacles'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'
import type { ScreenCircle } from '@/lib/obstacles'
import { getPlanet } from '@/lib/planets'
import { isMobile } from '@/lib/constants'

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

    // Mobile: circular text layout inside the planet silhouette
    if (isMobile()) {
      // Project moons that overlap the planet disc
      const moonCircles: ScreenCircle[] = []
      for (const moon of entry.moonEntries) {
        const moonWorldPos = new THREE.Vector3()
        moon.meshRef.mesh.getWorldPosition(moonWorldPos)
        const moonGeomRadius = (moon.meshRef.mesh.geometry as THREE.SphereGeometry).parameters.radius
        const moonWorldRadius = moonGeomRadius * entry.planetGroup.scale.x
        const moonCircle = projectSphere(moonWorldPos, moonWorldRadius, objs.camera, viewport)

        const moonDist = objs.camera.position.distanceTo(moonWorldPos)
        const moonRatio = moonDist > moonWorldRadius
          ? 1 / Math.sqrt(1 - (moonWorldRadius / moonDist) ** 2)
          : 1
        const correctedMoonR = moonCircle.r * moonRatio

        // Include if the moon overlaps the planet circle
        const distBetween = Math.sqrt((moonCircle.cx - cx) ** 2 + (moonCircle.cy - cy) ** 2)
        if (distBetween < screenRadius + correctedMoonR) {
          moonCircles.push({ kind: 'circle', cx: moonCircle.cx, cy: moonCircle.cy, r: correctedMoonR })
        }
      }

      const mobileFontSize = Math.max(9, screenRadius * 0.055)
      const mobileLineHeight = mobileFontSize * 1.6
      const circlePadding = screenRadius * 0.12
      const result = layoutProseInsideCircle(prose, {
        cx,
        cy,
        r: screenRadius,
        padding: circlePadding,
        fontSizePx: mobileFontSize,
        lineHeightPx: mobileLineHeight,
        moons: moonCircles.length > 0 ? moonCircles : undefined,
        moonPadding: circlePadding * 0.6,
      })
      lines.value = result.lines
      startY.value = result.startY
      leftX.value = cx - (screenRadius - circlePadding)
      fontSize.value = result.fontSize
      lineHeight.value = result.lineHeight
      return
    }

    const planet = { kind: 'circle' as const, cx, cy, r: screenRadius }

    // Position div well left of the planet edge
    const divX = (cx - screenRadius) * 0.22

    // Layout uses a smaller leftX so lines extend toward (but not over) the planet
    const layoutLeftX = divX * 0.3

    // Padding scales with planet size — keeps text off the planet surface
    const padding = screenRadius * 0.008

    // Project moons — include any that overlap the text column
    const textRight = cx - screenRadius
    const moonCircles: ScreenCircle[] = []
    for (const moon of entry.moonEntries) {
      const moonWorldPos = new THREE.Vector3()
      moon.meshRef.mesh.getWorldPosition(moonWorldPos)
      const moonGeomRadius = (moon.meshRef.mesh.geometry as THREE.SphereGeometry).parameters.radius
      const moonWorldRadius = moonGeomRadius * entry.planetGroup.scale.x
      const moonCircle = projectSphere(moonWorldPos, moonWorldRadius, objs.camera, viewport)

      // Perspective silhouette correction for moon too
      const moonDist = objs.camera.position.distanceTo(moonWorldPos)
      const moonRatio = moonDist > moonWorldRadius
        ? 1 / Math.sqrt(1 - (moonWorldRadius / moonDist) ** 2)
        : 1
      const correctedMoonR = moonCircle.r * moonRatio

      // Include if any part of the moon is over the text area (left of the planet edge)
      if (moonCircle.cx - correctedMoonR < textRight) {
        moonCircles.push({ kind: 'circle', cx: moonCircle.cx, cy: moonCircle.cy, r: correctedMoonR })
      }
    }

    // For ringed planets, shift text upward so it sits above the ring crossing zone.
    // Scale bias by how horizontal the rings appear (cos of axial tilt) —
    // nearly-vertical rings (Uranus, tilt ~98°) don't block text vertically.
    const planetData = getPlanet(entry.id)
    const tiltFactor = planetData.ring
      ? Math.abs(Math.cos(planetData.axialTilt * Math.PI / 180))
      : 0
    const verticalBias = planetData.ring ? -screenRadius * 0.35 * tiltFactor : 0

    // Push prose below the detail panel so they don't overlap
    let minStartY: number | undefined
    const detailEl = document.querySelector('.planet-detail') as HTMLElement | null
    if (detailEl) {
      const rect = detailEl.getBoundingClientRect()
      minStartY = rect.bottom + padding * 0.3
    }

    const config: CurveLayoutConfig = {
      planet,
      padding,
      leftX: layoutLeftX,
      minStartY,
      moons: moonCircles.length > 0 ? moonCircles : undefined,
      moonPadding: 50,
      verticalBias,
    }

    const result = layoutProseAlongCurve(prose, config)
    lines.value = result.lines
    startY.value = result.startY
    leftX.value = 0  // fragments carry absolute screen positions
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
