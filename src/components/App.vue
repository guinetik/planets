<!-- src/components/App.vue -->
<template>
  <div id="app-root">
    <SceneCanvas ref="canvasComp" />
    <SiteNav
      :active-planet-id="activePlanetId"
      @select="onNavSelect"
      @home="returnToOverview"
    />
    <HeroOverlay
      :visible="view === 'overview'"
      :hovered-name="hoveredPlanetName"
    />
    <PlanetDetail
      :planet-id="activePlanetId"
      :lines="lines"
      :top-y="topY"
      :left-x="leftX"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SceneCanvas from './SceneCanvas.vue'
import SiteNav from './SiteNav.vue'
import HeroOverlay from './HeroOverlay.vue'
import PlanetDetail from './PlanetDetail.vue'
import { useScene } from '@/composables/useScene'
import { buildPlanetEntries, tickPlanets, tickOverviewOrbits } from '@/composables/usePlanets'
import { useSceneState } from '@/composables/useSceneState'
import { useObstacles } from '@/composables/useObstacles'
import { usePretextLayout } from '@/composables/usePretextLayout'
import { createOrbitControls, createRaycaster } from '@/three/controls'
import { getPlanet } from '@/lib/planets'
import type { PlanetEntry } from '@/composables/usePlanets'

const canvasComp = ref<InstanceType<typeof SceneCanvas> | null>(null)
const hoveredPlanetId = ref<string | null>(null)
const hoveredPlanetName = computed(() =>
  hoveredPlanetId.value ? getPlanet(hoveredPlanetId.value).name : null,
)

const canvasRef = computed(() => canvasComp.value?.canvasEl ?? null)
const { sceneObjects, onFrame } = useScene(canvasRef)

const planetEntries = ref<PlanetEntry[]>([])
const { view, activePlanetId, selectPlanet, returnToOverview } = useSceneState(sceneObjects, planetEntries)
const { obstacles, updateObstacles } = useObstacles(sceneObjects, planetEntries, activePlanetId)
const { lines, topY, leftX, updateLayout } = usePretextLayout()

function onNavSelect(id: string): void {
  selectPlanet(id)
}

watch(sceneObjects, (objs) => {
  if (!objs) return

  planetEntries.value = buildPlanetEntries(objs.scene)

  const controls = createOrbitControls(objs.camera, objs.renderer.domElement)

  const meshes = planetEntries.value.map(e => e.planetMeshRef.mesh)
  const idMap = new Map(planetEntries.value.map(e => [e.planetMeshRef.mesh, e.id]))

  createRaycaster(
    objs.camera,
    meshes,
    idMap,
    (id) => { hoveredPlanetId.value = id },
    (id) => { if (view.value === 'overview') selectPlanet(id) },
  )

  onFrame((time, delta) => {
    controls.update()
    tickPlanets(planetEntries.value, time, delta)
    if (view.value === 'overview') {
      tickOverviewOrbits(planetEntries.value, delta)
    }
    if (view.value === 'detail' && activePlanetId.value) {
      updateObstacles()
      const planet = getPlanet(activePlanetId.value)
      updateLayout(planet.prose.join('\n\n'), obstacles.value)
    }
  })
})
</script>

<style scoped>
#app-root {
  width: 100%;
  height: 100%;
}
</style>
