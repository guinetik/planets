// src/composables/useScene.ts
import { shallowRef, onMounted, onUnmounted, type Ref } from 'vue'
import { createScene, handleResize, type SceneObjects } from '@/three/scene'

type FrameCallback = (time: number, delta: number) => void

export function useScene(canvasRef: Ref<HTMLCanvasElement | null>) {
  const sceneObjects = shallowRef<SceneObjects | null>(null)
  const frameCallbacks = new Set<FrameCallback>()
  let animationId = 0
  let lastTime = 0

  function onFrame(callback: FrameCallback): void {
    frameCallbacks.add(callback)
  }

  function tick(timeMs: number): void {
    const time = timeMs / 1000
    const delta = time - lastTime
    lastTime = time
    for (const cb of frameCallbacks) cb(time, delta)
    const objs = sceneObjects.value
    if (objs) objs.renderer.render(objs.scene, objs.camera)
    animationId = requestAnimationFrame(tick)
  }

  function onResize(): void {
    const objs = sceneObjects.value
    if (!objs) return
    handleResize(objs.camera, objs.renderer)
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

  return { sceneObjects, onFrame }
}
