// src/composables/usePretextLayout.ts
import { ref, nextTick, type Ref } from 'vue'
import { layoutProseAlongCurve, type LayoutLine, type CurveLayoutConfig } from '@/typography/layout'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'
import { DETAIL_PLANET_X_RATIO, DETAIL_PLANET_SCREEN_HEIGHT_RATIO } from '@/lib/constants'

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

  function updateCurveLayout(prose: string, _entry: PlanetEntry): void {
    if (_transitioning) return
    const objs = sceneObjects.value
    if (!objs) return

    const w = window.innerWidth
    const h = window.innerHeight

    const screenRadius = (DETAIL_PLANET_SCREEN_HEIGHT_RATIO * h) / 2
    const cx = w * (1 - DETAIL_PLANET_X_RATIO)
    const cy = h / 2

    const planet = { kind: 'circle' as const, cx, cy, r: screenRadius }

    // The div is positioned near the planet's left edge, shifted 20% further left
    const divX = (cx - screenRadius) * 0.7

    // Layout computes widths from a smaller leftX,
    // so lines are wide and their right edges extend into the planet area.
    const layoutLeftX = divX * 0.38

    const config: CurveLayoutConfig = {
      planet,
      padding: 0,
      leftX: layoutLeftX,
    }

    const result = layoutProseAlongCurve(prose, config)
    lines.value = result.lines
    startY.value = result.startY - h * 0.1
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
        // Let Vue render new lines at opacity:0, then wait for browser paint
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
