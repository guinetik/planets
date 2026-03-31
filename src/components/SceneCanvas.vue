<!-- src/components/SceneCanvas.vue -->
<template>
  <canvas ref="canvasEl" class="scene-canvas" />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const canvasEl = ref<HTMLCanvasElement | null>(null)
defineExpose({ canvasEl })
</script>

<style scoped>
.scene-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
