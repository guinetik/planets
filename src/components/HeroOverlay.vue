<!-- src/components/HeroOverlay.vue -->
<template>
  <Transition name="fade">
    <div v-if="visible" class="hero-overlay">
      <p class="hero-title">The Solar System</p>
      <p class="hero-sub">Select a planet to begin</p>
      <p v-if="hoveredName" class="hover-label">{{ hoveredName }}</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean; hoveredName: string | null }>()
</script>

<style scoped>
.hero-overlay {
  position: fixed;
  bottom: 60px;
  left: 0; right: 0;
  text-align: center;
  z-index: 5;
  pointer-events: none;
}
.hero-title {
  font-size: 11px;
  letter-spacing: 10px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.18);
  margin-bottom: 8px;
}
.hero-sub {
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.1);
}
.hover-label {
  margin-top: 24px;
  font-size: 13px;
  letter-spacing: 5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
