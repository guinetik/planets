// src/composables/useSceneState.ts
import * as THREE from 'three'
import { ref, type Ref, type ShallowRef } from 'vue'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { transitionToDetail, transitionToOverview } from '@/three/transitions'
import type { PlanetEntry } from './usePlanets'
import type { SceneObjects } from '@/three/scene'

export type ViewState = 'overview' | 'detail'

export function useSceneState(
  sceneObjects: Ref<SceneObjects | null>,
  planetEntries: Ref<PlanetEntry[]>,
  controlsRef: ShallowRef<OrbitControls | null>,
  sunMeshRef: ShallowRef<THREE.Mesh | null>,
) {
  const view = ref<ViewState>('overview')
  const activePlanetId = ref<string | null>(null)

  function selectPlanet(id: string): void {
    const objs = sceneObjects.value
    const controls = controlsRef.value
    if (!objs || !controls) return
    const entry = planetEntries.value.find(e => e.id === id)
    if (!entry) return

    const previousEntry = view.value === 'detail'
      ? planetEntries.value.find(e => e.id === activePlanetId.value) ?? null
      : null

    view.value = 'detail'
    activePlanetId.value = id

    transitionToDetail(entry, planetEntries.value, objs.camera, controls, sunMeshRef.value, previousEntry, objs.detailLight)
  }

  function returnToOverview(): void {
    const objs = sceneObjects.value
    const controls = controlsRef.value
    if (!objs || !controls) return
    view.value = 'overview'
    activePlanetId.value = null
    transitionToOverview(planetEntries.value, objs.camera, controls, sunMeshRef.value, objs.detailLight)
  }

  return { view, activePlanetId, selectPlanet, returnToOverview }
}
