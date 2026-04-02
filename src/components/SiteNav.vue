<!-- src/components/SiteNav.vue -->
<template>
  <header class="site-nav">
    <div class="wordmark-group">
      <button class="wordmark" @click="emit('home')">Planetarium <span class="wordmark-by">by</span></button>
      <a class="wordmark-logo" href="https://guinetik.com" target="_blank" rel="noopener">
        <img src="/logo.svg" alt="guinetik" />
      </a>
    </div>
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
.wordmark-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.wordmark {
  background: none;
  border: none;
  cursor: pointer;
  font-family: Georgia, serif;
  font-size: 11px;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: rgba(120, 200, 220, 0.5);
}
.wordmark:hover { color: rgba(120, 200, 220, 0.85); }
.wordmark-by {
  font-size: 9px;
  letter-spacing: 2px;
  opacity: 0.5;
  margin-left: 2px;
}
.wordmark-logo {
  display: flex;
  align-items: center;
  margin-left: 6px;
  opacity: 0.4;
  transition: opacity 0.2s;
}
.wordmark-logo:hover { opacity: 0.8; }
.wordmark-logo img {
  height: 12px;
  width: auto;
  filter: brightness(0) invert(1);
}
.planet-nav { display: flex; gap: 28px; }
.nav-link {
  background: none;
  border: none;
  cursor: pointer;
  font-family: Georgia, serif;
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  transition: color 0.2s;
  padding: 0;
}
.nav-link:hover, .nav-link.active { color: rgba(255, 255, 255, 0.7); }
</style>
