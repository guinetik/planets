<!-- src/components/SiteNav.vue -->
<template>
  <header class="site-nav">
    <button class="wordmark" @click="emit('home')">Planetarium</button>
    <nav class="planet-nav">
      <button
        v-for="planet in PLANETS"
        :key="planet.id"
        class="nav-link"
        :class="{ active: activePlanetId === planet.id }"
        @click="emit('select', planet.id)"
      >{{ planet.name }}</button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { PLANETS } from '@/lib/planets'

defineProps<{ activePlanetId: string | null }>()
const emit = defineEmits<{
  select: [id: string]
  home: []
}>()
</script>

<style scoped>
.site-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 48px;
  background: rgba(6, 6, 12, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.wordmark {
  background: none;
  border: none;
  cursor: pointer;
  font-family: Georgia, serif;
  font-size: 11px;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}
.wordmark:hover { color: rgba(255, 255, 255, 0.7); }
.planet-nav { display: flex; gap: 28px; }
.nav-link {
  background: none;
  border: none;
  cursor: pointer;
  font-family: Georgia, serif;
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.2);
  transition: color 0.2s;
  padding: 0;
}
.nav-link:hover, .nav-link.active { color: rgba(255, 255, 255, 0.7); }
</style>
