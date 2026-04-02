<!-- src/components/LoadingScreen.vue -->
<template>
  <Transition name="loading-fade">
    <div v-if="visible" class="loading-screen">
      <div class="loading-content">
        <p class="loading-title">Planetarium</p>
        <div class="loading-bar-track">
          <div class="loading-bar-fill" :style="{ width: progress + '%' }" />
        </div>
        <p class="loading-status">{{ statusText }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  progress: number
}>()

const statusText = computed(() => {
  if (props.progress < 30) return 'Loading textures...'
  if (props.progress < 70) return 'Building solar system...'
  if (props.progress < 100) return 'Preparing orbits...'
  return 'Ready'
})
</script>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #06060c;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-content {
  text-align: center;
  width: 240px;
}
.loading-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 11px;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: rgba(120, 200, 220, 0.5);
  margin-bottom: 32px;
}
.loading-bar-track {
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.loading-bar-fill {
  height: 100%;
  background: rgba(120, 200, 220, 0.4);
  transition: width 0.3s ease-out;
}
.loading-status {
  margin-top: 16px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.15);
}
.loading-fade-leave-active {
  transition: opacity 0.8s ease;
}
.loading-fade-leave-to {
  opacity: 0;
}
</style>
