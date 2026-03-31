// src/composables/useSceneState.ts
import { ref, type Ref } from 'vue'
import { transitionToDetail, transitionToOverview } from '@/three/transitions'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'
import {
  OVERVIEW_SIZES,
  DETAIL_SIZES,
  DETAIL_PLANET_X_RATIO,
} from '@/lib/constants'

export type ViewState = 'overview' | 'detail'

export function useSceneState(
  sceneObjects: Ref<SceneObjects | null>,
  planetEntries: Ref<PlanetEntry[]>,
) {
  const view = ref<ViewState>('overview')
  const activePlanetId = ref<string | null>(null)

  function selectPlanet(id: string): void {
    const objs = sceneObjects.value
    if (!objs) return
    const entry = planetEntries.value.find(e => e.id === id)
    if (!entry) return

    view.value = 'detail'
    activePlanetId.value = id

    const overviewRadius = OVERVIEW_SIZES[id]
    const detailRadius = DETAIL_SIZES[id]
    const targetScale = detailRadius / overviewRadius
    const targetX = window.innerWidth * (1 - DETAIL_PLANET_X_RATIO)

    transitionToDetail(entry, planetEntries.value, objs.camera, targetX, targetScale)
  }

  function returnToOverview(): void {
    const objs = sceneObjects.value
    if (!objs) return
    view.value = 'overview'
    activePlanetId.value = null
    transitionToOverview(planetEntries.value, objs.camera)
  }

  return { view, activePlanetId, selectPlanet, returnToOverview }
}
