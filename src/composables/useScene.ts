// src/composables/useScene.ts
import { ref, shallowRef, onMounted, onUnmounted, type Ref } from 'vue'
import { createScene, handleResize, type SceneObjects } from '@/three/scene'
import { DEFAULT_TIME_SCALE } from '@/lib/constants'

type FrameCallback = (simTime: number, delta: number) => void

export function useScene(canvasRef: Ref<HTMLCanvasElement | null>) {
  const sceneObjects = shallowRef<SceneObjects | null>(null)
  const frameCallbacks = new Set<FrameCallback>()
  let animationId = 0
  let lastTime = 0
  let simTime = 0
  const timeScale = ref(DEFAULT_TIME_SCALE)
  const paused = ref(false)

  function onFrame(callback: FrameCallback): void {
    frameCallbacks.add(callback)
  }

  function tick(timeMs: number): void {
    const time = timeMs / 1000
    const delta = Math.min(time - lastTime, 0.1)
    lastTime = time

    if (!paused.value) {
      simTime += delta * timeScale.value
    }

    for (const cb of frameCallbacks) cb(simTime, delta)
    const objs = sceneObjects.value
    if (objs) objs.composer.render()
    animationId = requestAnimationFrame(tick)
  }

  function onResize(): void {
    const objs = sceneObjects.value
    if (!objs) return
    handleResize(objs.camera, objs.renderer, objs.composer)
  }

  onMounted(() => {
    if (!canvasRef.value) return
    sceneObjects.value = createScene(canvasRef.value)
    window.addEventListener('resize', onResize)
    animationId = requestAnimationFrame(tick)
  })

  onUnmounted(() => {
    cancelAnimationFrame(animationId)
    window.removeEventListener('resize', onResize)
    sceneObjects.value?.renderer.dispose()
  })

  return { sceneObjects, onFrame, timeScale, paused }
}
