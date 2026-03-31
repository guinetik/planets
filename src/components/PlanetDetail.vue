<!-- src/components/PlanetDetail.vue -->
<template>
  <Transition name="fade">
    <div v-if="planet" class="planet-detail">
      <span class="planet-number" :style="{ color: planet.accentColor + '66' }">
        No. {{ String(planet.order).padStart(2, '0') }} — {{ ordinalLabel(planet.order) }} Planet
      </span>
      <h1 class="planet-name" :style="{ color: planet.accentColor }">
        {{ planet.name }}
      </h1>
      <PretextBlock :lines="lines" :top-y="topY" :left-x="leftX" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getPlanet } from '@/lib/planets'
import PretextBlock from '@/typography/PretextBlock.vue'
import type { LayoutLine } from '@/typography/layout'

const props = defineProps<{
  planetId: string | null
  lines: LayoutLine[]
  topY: number
  leftX: number
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
  top: 100px;
  left: 80px;
  z-index: 5;
  pointer-events: none;
}
.planet-number {
  display: block;
  font-size: 8px;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.planet-name {
  font-family: Georgia, serif;
  font-size: 56px;
  font-weight: normal;
  letter-spacing: 8px;
  text-transform: uppercase;
  line-height: 1;
  margin-bottom: 40px;
}
.fade-enter-active { transition: opacity 0.4s 0.5s; }
.fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
