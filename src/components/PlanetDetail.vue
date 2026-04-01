<!-- src/components/PlanetDetail.vue -->
<template>
  <Transition name="detail" mode="out-in">
    <div v-if="planet" :key="planet.id" class="planet-detail">
      <span class="planet-number" :style="{ color: planet.accentColor + '66' }">
        No. {{ String(planet.order).padStart(2, '0') }} — {{ ordinalLabel(planet.order) }} Planet
      </span>
      <h1 class="planet-name" :style="{ color: planet.accentColor }">
        {{ planet.name }}
      </h1>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getPlanet } from '@/lib/planets'

const props = defineProps<{
  planetId: string | null
}>()

const planet = computed(() => props.planetId ? getPlanet(props.planetId) : null)

function ordinalLabel(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0])
}
</script>

<style scoped>
.planet-detail {
  position: fixed;
  top: 80px;
  left: 80px;
  z-index: 5;
  pointer-events: none;
}
.planet-number {
  display: block;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.6vw;
  letter-spacing: 0.25vw;
  text-transform: uppercase;
  margin-bottom: 1.2vw;
}
.planet-name {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 3.5vw;
  font-weight: normal;
  letter-spacing: 0.4vw;
  text-transform: uppercase;
  line-height: 1;
  margin: 0;
}
.detail-enter-active {
  transition: opacity 0.4s ease 0.3s, transform 0.4s ease 0.3s;
}
.detail-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.detail-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.detail-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
