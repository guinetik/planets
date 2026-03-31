<!-- src/components/PlanetLabels.vue -->
<template>
  <div class="planet-labels">
    <span
      v-for="label in visibleLabels"
      :key="label.name"
      class="planet-label"
      :style="{ left: label.x + 'px', top: label.y + 'px' }"
    >{{ label.name }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as THREE from 'three'

interface BodyRef {
  name: string
  position: THREE.Vector3
  radius: number
}

const props = defineProps<{
  bodies: BodyRef[]
  camera: THREE.PerspectiveCamera | null
}>()

const visibleLabels = computed(() => {
  if (!props.camera) return []
  const cam = props.camera
  const w = window.innerWidth
  const h = window.innerHeight

  return props.bodies.map(body => {
    const pos = body.position.clone().project(cam)
    const x = (pos.x * 0.5 + 0.5) * w
    const y = (-pos.y * 0.5 + 0.5) * h + body.radius * 0.5 + 18
    return { name: body.name, x, y, z: pos.z }
  }).filter(l => l.z > 0 && l.z < 1)
})
</script>

<style scoped>
.planet-labels {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.planet-label {
  position: absolute;
  transform: translateX(-50%);
  font: 11px monospace;
  color: #999;
  white-space: nowrap;
}
</style>
