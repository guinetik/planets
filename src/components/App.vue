<!-- src/components/App.vue -->
<template>
  <div id="app-root">
    <LoadingScreen :visible="!assetsLoaded" :progress="loadingProgress" />
    <SceneCanvas ref="canvasComp" />
    <template v-if="assetsLoaded">
      <SiteNav
        :active-planet-id="activePlanetId"
        @select="onNavSelect"
        @home="onHome"
      />
      <PlanetLabels
        :bodies="showLabels ? labelBodies : []"
        :camera="activeCamera"
      />
      <ConfigPane
        :orbits="showOrbits"
        :labels="showLabels"
        :visible="view === 'overview'"
        @update:orbits="showOrbits = $event"
        @update:labels="showLabels = $event"
      />
      <router-view />
      <PlanetDetail :planet-id="activePlanetId" :telemetry="telemetry" />
      <PretextBlock
        :lines="proseLines"
        :top-y="proseStartY"
        :left-x="proseLeftX"
        :font-size="proseFontSize"
        :line-height="proseLineHeight"
        :visible="proseVisible"
      />
    </template>
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
import { createOrbitControls } from '@/three/controls'
import { playIntroAnimation } from '@/three/transitions'
import { PLANET_IDS, PLANETS, SUN, getPlanet, loadPlanetarium } from '@/lib/planets'
import { SIZE_SCALE, CAMERA_FOV } from '@/lib/constants'
import PlanetDetail from './PlanetDetail.vue'
import ConfigPane from './ConfigPane.vue'
import LoadingScreen from './LoadingScreen.vue'
import PretextBlock from '@/typography/PretextBlock.vue'
import { usePretextLayout } from '@/composables/usePretextLayout'
import { computeTelemetry, type TelemetryData } from '@/lib/telemetry'
import { useLoading } from '@/composables/useLoading'

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
const { lines: proseLines, startY: proseStartY, leftX: proseLeftX, fontSize: proseFontSize, lineHeight: proseLineHeight, visible: proseVisible, updateCurveLayout, transitionTo, hideAndThen, clearLayout } = usePretextLayout(sceneObjects)
const telemetry = ref<TelemetryData | null>(null)
const showOrbits = ref(true)
const showLabels = ref(true)
const { progress: loadingProgress, loaded: assetsLoaded, markReady } = useLoading()

const activeCamera = computed(() => sceneObjects.value?.camera ?? null)

const labelBodies = computed(() => {
  const bodies: { name: string; position: THREE.Vector3; radius: number }[] = []

  if (view.value === 'detail') {
    // No labels in detail view
  } else {
    bodies.push({ name: 'Sun', position: new THREE.Vector3(0, 0, 0), radius: SUN.displayRadius * SIZE_SCALE * 50 })
    for (const entry of planetEntries.value) {
      bodies.push({ name: entry.name, position: entry.planetGroup.position, radius: 20 })
      for (const moon of entry.moonEntries) {
        const moonWorldPos = moon.meshRef.mesh.getWorldPosition(new THREE.Vector3())
        bodies.push({ name: moon.name, position: moonWorldPos, radius: 14 })
      }
    }
  }
  return bodies
})

watch(showOrbits, (show) => {
  for (const entry of planetEntries.value) {
    if (entry.orbitLine) entry.orbitLine.visible = show
    for (const child of entry.planetGroup.children) {
      if (child instanceof THREE.LineLoop) child.visible = show
    }
  }
})

function onNavSelect(id: string) {
  router.push(`/${id}`)
}

function onHome() {
  router.push('/')
}

// Route → scene state
watch(() => route.params.planetId as string | undefined, (planetId) => {
  if (!sceneReady.value || !assetsLoaded.value) return
  if (planetId && PLANET_IDS.includes(planetId)) {
    if (activePlanetId.value !== planetId) selectPlanet(planetId)
  } else {
    if (view.value !== 'overview') {
      hideAndThen(() => returnToOverview())
    }
  }
})

watch(sceneObjects, async (objs) => {
  if (!objs) return

  await loadPlanetarium()
  const built = await buildPlanetEntries(objs.scene)
  planetEntries.value = built.entries
  sunMeshRef.value = built.sunObjects.mesh
  sunUniformsRef.value = built.sunObjects.uniforms

  const controls = createOrbitControls(objs.camera, objs.renderer.domElement)
  controlsRef.value = controls

  sceneReady.value = true
  markReady()

  // Play intro or deep-link after assets are loaded
  const initialPlanet = route.params.planetId as string | undefined
  const stopWatch = watch(assetsLoaded, (ready) => {
    if (!ready) return
    stopWatch()
    if (initialPlanet && PLANET_IDS.includes(initialPlanet)) {
      // Deep-link: skip intro, go straight to planet
      selectPlanet(initialPlanet)
    } else {
      // Normal entry: play the intro swoop
      playIntroAnimation(
        planetEntries.value,
        objs.camera,
        controls,
        sunMeshRef.value,
      )
    }
  }, { immediate: true })

  // DEBUG: Press D in detail view to dump camera state
  // Press E to re-enable OrbitControls for manual positioning
  // Set to true to enable debug key handlers
  const DEBUG_CAMERA = false
  window.addEventListener('keydown', (e) => {
    if (!DEBUG_CAMERA) return
    if (e.key === 'e' || e.key === 'E') {
      if (controls) {
        controls.enabled = true
        controls.enablePan = true
        controls.enableRotate = true
        controls.enableZoom = true
        controls.minDistance = 0.01
        controls.maxDistance = 1000
        console.log(`[DEBUG] OrbitControls FULLY UNLOCKED — zoom/pan/rotate all enabled, no distance limits`)
      }
    }
    if (e.key === 'd' || e.key === 'D') {
      const cam = objs.camera
      const entry = planetEntries.value.find(e => e.id === activePlanetId.value)
      if (!entry) return
      const planetData = PLANETS.find(p => p.id === entry.id)!
      const planetPos = entry.planetGroup.position
      const visualRadius = planetData.displayRadius * SIZE_SCALE
      const halfFOV = (CAMERA_FOV / 2) * Math.PI / 180

      // Camera-to-planet vector
      const offset = cam.position.clone().sub(planetPos)
      const dist = offset.length()

      // What fraction of screen height does the planet fill?
      const angularSize = Math.atan(visualRadius / dist)
      const screenFraction = angularSize / Math.tan(halfFOV)

      // Where does the planet project on screen? (NDC)
      const projected = planetPos.clone().project(cam)

      console.log('=== DETAIL VIEW DEBUG ===')
      console.log(`Planet: ${entry.id}`)
      console.log(`Planet world pos: (${planetPos.x.toFixed(4)}, ${planetPos.y.toFixed(4)}, ${planetPos.z.toFixed(4)})`)
      console.log(`Planet visualRadius: ${visualRadius.toFixed(4)}`)
      console.log(`Camera pos: (${cam.position.x.toFixed(4)}, ${cam.position.y.toFixed(4)}, ${cam.position.z.toFixed(4)})`)
      console.log(`Controls target: (${controls.target.x.toFixed(4)}, ${controls.target.y.toFixed(4)}, ${controls.target.z.toFixed(4)})`)
      console.log(`Camera→Planet offset: (${offset.x.toFixed(4)}, ${offset.y.toFixed(4)}, ${offset.z.toFixed(4)})`)
      console.log(`Distance to planet: ${dist.toFixed(4)}`)
      console.log(`Planet screen fraction (radius/halfH): ${screenFraction.toFixed(4)}`)
      console.log(`Planet NDC: x=${projected.x.toFixed(4)}, y=${projected.y.toFixed(4)}`)
      console.log(`Planet screen %: x=${((projected.x * 0.5 + 0.5) * 100).toFixed(1)}%, y=${((1 - (projected.y * 0.5 + 0.5)) * 100).toFixed(1)}%`)
      console.log(`Aspect ratio: ${cam.aspect.toFixed(4)}`)
      console.log('========================')
    }
  })

  onFrame((simTime, delta) => {
    if (view.value === 'overview') {
      controls.update()
    }
    tickPlanets(planetEntries.value, simTime, sunUniformsRef.value, sunMeshRef.value, activePlanetId.value)

    if (view.value === 'detail' && activePlanetId.value) {
      const entry = planetEntries.value.find(e => e.id === activePlanetId.value)
      if (entry) {
        const planet = getPlanet(entry.id)
        const prose = planet.prose.join('\n\n')
        // transitionTo handles animation; updateCurveLayout keeps position in sync each frame
        transitionTo(activePlanetId.value, prose, entry)
        updateCurveLayout(prose, entry)
        telemetry.value = computeTelemetry(entry.id, planet.orbit, simTime)
      }
    } else {
      telemetry.value = null
      clearLayout()
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
