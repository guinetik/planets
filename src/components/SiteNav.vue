<!-- src/components/SiteNav.vue -->
<template>
  <header class="site-nav">
    <div class="nav-bar">
      <div class="wordmark-group">
        <button class="wordmark" @click="onHomeClick">Planetarium <span class="wordmark-by">by</span></button>
        <a class="wordmark-logo" href="https://guinetik.com" target="_blank" rel="noopener">
          <img src="/logo.svg" alt="guinetik" />
        </a>
      </div>
      <nav class="planet-nav desktop-nav">
        <button
          v-for="planet in planets"
          :key="planet.id"
          class="nav-link"
          :class="{ active: activePlanetId === planet.id }"
          @click="emit('select', planet.id)"
        >{{ planet.name }}</button>
        <span class="nav-separator">·</span>
        <button
          v-for="planet in dwarfPlanets"
          :key="planet.id"
          class="nav-link"
          :class="{ active: activePlanetId === planet.id }"
          @click="emit('select', planet.id)"
        >{{ planet.name }}</button>
      </nav>
      <button class="hamburger" @click="menuOpen = !menuOpen" :class="{ open: menuOpen }">
        <span /><span /><span />
      </button>
    </div>
    <Transition name="dropdown">
      <nav v-if="menuOpen" class="planet-nav mobile-nav">
        <button
          v-for="planet in planets"
          :key="planet.id"
          class="nav-link"
          :class="{ active: activePlanetId === planet.id }"
          @click="onMobileSelect(planet.id)"
        >{{ planet.name }}</button>
        <span class="nav-separator">·</span>
        <button
          v-for="planet in dwarfPlanets"
          :key="planet.id"
          class="nav-link"
          :class="{ active: activePlanetId === planet.id }"
          @click="onMobileSelect(planet.id)"
        >{{ planet.name }}</button>
      </nav>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PLANETS } from '@/lib/planets'

const planets = computed(() => PLANETS.filter(p => p.type !== 'Dwarf Planet'))
const dwarfPlanets = computed(() => PLANETS.filter(p => p.type === 'Dwarf Planet'))

const props = defineProps<{ activePlanetId: string | null }>()
const emit = defineEmits<{
  select: [id: string]
  home: []
}>()

const menuOpen = ref(false)

// Close menu when planet changes
watch(() => props.activePlanetId, () => { menuOpen.value = false })

function onMobileSelect(id: string) {
  menuOpen.value = false
  emit('select', id)
}

function onHomeClick() {
  menuOpen.value = false
  emit('home')
}
</script>

<style scoped>
.site-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 10;
  background: rgba(6, 6, 12, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 48px;
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
.nav-separator {
  color: rgba(255, 255, 255, 0.15);
  font-size: 12px;
  user-select: none;
}

/* Hamburger — hidden on desktop */
.hamburger {
  display: none;
}

/* Mobile dropdown nav — hidden on desktop */
.mobile-nav {
  display: none;
}

@media (max-width: 1024px) {
  .nav-bar {
    padding: 14px 20px;
  }
  .wordmark {
    font-size: 9px;
    letter-spacing: 4px;
  }
  .desktop-nav {
    display: none;
  }
  .mobile-planet-title {
    display: block;
    font-family: Georgia, serif;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }
  .hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    width: 28px;
    height: 28px;
  }
  .hamburger span {
    display: block;
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.4);
    transition: transform 0.25s ease, opacity 0.25s ease;
  }
  .hamburger.open span:nth-child(1) {
    transform: translateY(5px) rotate(45deg);
  }
  .hamburger.open span:nth-child(2) {
    opacity: 0;
  }
  .hamburger.open span:nth-child(3) {
    transform: translateY(-5px) rotate(-45deg);
  }
  .mobile-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 20px;
    padding: 14px 20px 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.04);
  }
  .mobile-nav .nav-link {
    font-size: 9px;
    letter-spacing: 2px;
  }
  .dropdown-enter-active {
    transition: opacity 0.2s ease, max-height 0.25s ease;
    overflow: hidden;
  }
  .dropdown-leave-active {
    transition: opacity 0.15s ease, max-height 0.2s ease;
    overflow: hidden;
  }
  .dropdown-enter-from,
  .dropdown-leave-to {
    opacity: 0;
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
  .dropdown-enter-to,
  .dropdown-leave-from {
    max-height: 80px;
  }
}
</style>
