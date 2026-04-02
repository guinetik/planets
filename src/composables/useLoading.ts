// src/composables/useLoading.ts
import * as THREE from 'three'
import { ref } from 'vue'

export function useLoading() {
  const progress = ref(0)
  const loaded = ref(false)

  const mgr = THREE.DefaultLoadingManager
  let totalItems = 0
  let loadedItems = 0

  mgr.onStart = (_url, itemsLoaded, itemsTotal) => {
    totalItems = itemsTotal
    loadedItems = itemsLoaded
  }

  mgr.onProgress = (_url, itemsLoaded, itemsTotal) => {
    totalItems = itemsTotal
    loadedItems = itemsLoaded
    progress.value = totalItems > 0 ? Math.round((loadedItems / totalItems) * 100) : 0
  }

  mgr.onLoad = () => {
    progress.value = 100
    // Small delay so the bar visually fills before we fade out
    setTimeout(() => {
      loaded.value = true
    }, 400)
  }

  mgr.onError = (url) => {
    console.warn(`[Loading] Failed to load: ${url}`)
  }

  /** Call after scene build if no assets were loaded (e.g. all cached) */
  function markReady(): void {
    if (!loaded.value) {
      progress.value = 100
      setTimeout(() => { loaded.value = true }, 400)
    }
  }

  return { progress, loaded, markReady }
}
