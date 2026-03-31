<!-- src/components/App.vue -->
<template>
  <div id="app-root">
    <SceneCanvas ref="canvasComp" />
    <SiteNav
      :active-planet-id="activePlanetId"
      @select="onNavSelect"
      @home="onHome"
    />
    <PlanetLabels
      :bodies="labelBodies"
      :camera="activeCamera"
    />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three'
import { ref, computed, watch, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import SceneCanvas from './SceneCanvas.vue'
import SiteNav from './SiteNav.vue'
import PlanetLabels from './PlanetLabels.vue'
import { useScene } from '@/composables/useScene'
import { buildPlanetEntries, tickPlanets, type PlanetEntry } from '@/composables/usePlanets'
import { useSceneState } from '@/composables/useSceneState'
import { createOrbitControls, createRaycaster } from '@/three/controls'
import { PLANET_IDS, SUN } from '@/lib/planets'
import { SIZE_SCALE } from '@/lib/constants'

const route = useRoute()
const router = useRouter()

const canvasComp = ref<InstanceType<typeof SceneCanvas> | null>(null)
const canvasRef = computed(() => canvasComp.value?.canvasEl ?? null)
const { sceneObjects, onFrame } = useScene(canvasRef)

const planetEntries = ref<PlanetEntry[]>([])
const controlsRef = shallowRef<OrbitControls | null>(null)
const sunMeshRef = shallowRef<THREE.Mesh | null>(null)
const sunUniformsRef = shallowRef<Record<string, THREE.IUniform>>({})
const sceneReady = ref(false)
const { view, activePlanetId, selectPlanet, returnToOverview } = useSceneState(sceneObjects, planetEntries, controlsRef, sunMeshRef)

const activeCamera = computed(() => sceneObjects.value?.camera ?? null)

const labelBodies = computed(() => {
  const bodies: { name: string; position: THREE.Vector3; radius: number }[] = []
  bodies.push({ name: 'Sun', position: new THREE.Vector3(0, 0, 0), radius: SUN.displayRadius * SIZE_SCALE * 50 })
  for (const entry of planetEntries.value) {
    bodies.push({ name: entry.name, position: entry.planetGroup.position, radius: 20 })
    for (const moon of entry.moonEntries) {
      const moonWorldPos = moon.meshRef.mesh.getWorldPosition(new THREE.Vector3())
      bodies.push({ name: moon.name, position: moonWorldPos, radius: 14 })
    }
  }
  return bodies
})

function onNavSelect(id: string) {
  router.push(`/${id}`)
}

function onHome() {
  router.push('/')
}

// Route → scene state
watch(() => route.params.planetId as string | undefined, (planetId) => {
  if (!sceneReady.value) return
  if (planetId && PLANET_IDS.includes(planetId)) {
    if (activePlanetId.value !== planetId) selectPlanet(planetId)
  } else {
    if (view.value !== 'overview') returnToOverview()
  }
})

watch(sceneObjects, (objs) => {
  if (!objs) return

  const built = buildPlanetEntries(objs.scene)
  planetEntries.value = built.entries
  sunMeshRef.value = built.sunObjects.mesh
  sunUniformsRef.value = built.sunObjects.uniforms

  const controls = createOrbitControls(objs.camera, objs.renderer.domElement)
  controlsRef.value = controls

  const meshes = planetEntries.value.map(e => e.planetMeshRef.mesh)
  const idMap = new Map(planetEntries.value.map(e => [e.planetMeshRef.mesh, e.id]))

  createRaycaster(
    objs.camera,
    meshes,
    idMap,
    () => {},
    (id) => {
      if (view.value === 'overview') router.push(`/${id}`)
    },
  )

  sceneReady.value = true

  const initialPlanet = route.params.planetId as string | undefined
  if (initialPlanet && PLANET_IDS.includes(initialPlanet)) {
    selectPlanet(initialPlanet)
  }

  onFrame((simTime, delta) => {
    controls.update()
    tickPlanets(planetEntries.value, simTime, sunUniformsRef.value)
  })
})
</script>

<style scoped>
#app-root {
  width: 100%;
  height: 100%;
}
</style>
