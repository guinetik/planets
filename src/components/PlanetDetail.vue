<!-- src/components/PlanetDetail.vue -->
<template>
  <Transition name="detail" mode="out-in">
    <div v-if="planet" :key="planet.id" class="planet-detail">
      <span class="planet-number" :style="{ color: planet.accentColor + '66' }">
        No. {{ String(planet.order).padStart(2, '0') }} — {{ planet.type === 'Dwarf Planet' ? planet.type : ordinalLabel(planet.order) + ' Planet' }}
      </span>
      <h1 class="planet-name" :style="{ color: planet.accentColor }">
        {{ planet.name }}
      </h1>

      <!-- Planet info card -->
      <div class="planet-info">
        <span class="info-type" :style="{ borderColor: planet.accentColor + '44', color: planet.accentColor + 'aa' }">
          {{ planet.type }}
        </span>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Mass</span>
            <span class="info-value">{{ formatMass(telemetry?.massEarths) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Radius</span>
            <span class="info-value">{{ formatRadius(telemetry?.radiusKm) }} <span class="info-unit">km</span></span>
          </div>
          <div class="info-item">
            <span class="info-label">Day</span>
            <span class="info-value">{{ formatDayLength(planetId) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Year</span>
            <span class="info-value">{{ formatYearLength(planetId) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Moons</span>
            <span class="info-value">{{ planet.moons.length }}</span>
          </div>
        </div>
      </div>

      <!-- Live telemetry (bottom) -->
      <div v-if="telemetry" class="telemetry">
        <div class="telemetry-row">
          <span class="telemetry-label">Orbit</span>
          <span class="telemetry-chart">{{ telemetry.orbitProgressPie }}</span>
          <span class="telemetry-value">{{ telemetry.trueAnomalyDeg.toFixed(2) }}<span class="telemetry-unit">°</span></span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Solar Distance</span>
          <span class="telemetry-chart" v-if="telemetry.distanceSparkline">{{ telemetry.distanceSparkline }}</span>
          <span class="telemetry-value">{{ telemetry.solarDistanceAU.toFixed(4) }} <span class="telemetry-unit">AU</span></span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Velocity</span>
          <span class="telemetry-chart" v-if="telemetry.velocitySparkline">{{ telemetry.velocitySparkline }}</span>
          <span class="telemetry-value">{{ telemetry.orbitalVelocityKmS.toFixed(2) }} <span class="telemetry-unit">km/s</span></span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Light Travel</span>
          <span class="telemetry-value">{{ formatLightTravel(telemetry.lightTravelMin) }}</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Local Solar Time</span>
          <span class="telemetry-value telemetry-mono">{{ telemetry.localSolarTime }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getPlanet } from '@/lib/planets'
import type { TelemetryData } from '@/lib/telemetry'

const ROTATION_HOURS: Record<string, number> = {
  mercury: 1407.6, venus: -5832.5, earth: 23.934, mars: 24.623,
  jupiter: 9.925, saturn: 10.656, uranus: -17.24, neptune: 16.11, pluto: -153.29,
}
const PERIOD_DAYS: Record<string, number> = {
  mercury: 87.97, venus: 224.7, earth: 365.25, mars: 686.97,
  jupiter: 4332.59, saturn: 10759.22, uranus: 30688.5, neptune: 60182.0, pluto: 90560.0,
}

const props = defineProps<{
  planetId: string | null
  telemetry: TelemetryData | null
}>()

const planet = computed(() => props.planetId ? getPlanet(props.planetId) : null)

function ordinalLabel(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0])
}

function formatMass(earths?: number): string {
  if (earths == null) return '—'
  if (earths >= 10) return `${earths.toFixed(1)} M⊕`
  if (earths >= 0.1) return `${earths.toFixed(3)} M⊕`
  return `${earths.toFixed(4)} M⊕`
}

function formatRadius(km?: number): string {
  if (km == null) return '—'
  if (km >= 10000) return km.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return km.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

function formatDayLength(id: string | null): string {
  if (!id) return '—'
  const h = ROTATION_HOURS[id]
  if (h == null) return '—'
  const abs = Math.abs(h)
  const retro = h < 0 ? ' ®' : ''
  if (abs < 48) return `${abs.toFixed(1)}h${retro}`
  return `${(abs / 24).toFixed(1)}d${retro}`
}

function formatYearLength(id: string | null): string {
  if (!id) return '—'
  const d = PERIOD_DAYS[id]
  if (d == null) return '—'
  if (d < 365.25) return `${d.toFixed(1)} days`
  const years = d / 365.25
  if (years < 10) return `${years.toFixed(2)} yrs`
  return `${years.toFixed(1)} yrs`
}

function formatLightTravel(minutes: number): string {
  if (minutes < 1) return `${(minutes * 60).toFixed(1)} sec`
  if (minutes < 60) return `${minutes.toFixed(1)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m}m`
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

/* --- Planet info card --- */
.planet-info {
  margin-top: 1vw;
}
.info-type {
  display: inline-block;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.42vw;
  letter-spacing: 0.18vw;
  text-transform: uppercase;
  border: 1px solid;
  padding: 0.15vw 0.5vw;
  margin-bottom: 0.6vw;
}
.info-grid {
  display: grid;
  grid-template-columns: auto auto;
  gap: 0.1vw 1.6vw;
}
.info-item {
  display: flex;
  align-items: baseline;
  gap: 0.6vw;
}
.info-label {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.4vw;
  letter-spacing: 0.12vw;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  min-width: 3vw;
}
.info-value {
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.45vw;
  letter-spacing: 0.05vw;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
}
.info-unit {
  font-size: 0.42vw;
  color: rgba(255, 255, 255, 0.18);
  letter-spacing: 0.08vw;
}

/* --- Live telemetry (bottom) --- */
.telemetry {
  position: fixed;
  bottom: 80px;
  left: 80px;
  display: flex;
  flex-direction: column;
  gap: 0.08vw;
  animation: telemetry-in 0.5s ease 0.6s both;
}
@keyframes telemetry-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.telemetry-row {
  display: flex;
  align-items: baseline;
  gap: 0.8vw;
}
.telemetry-label {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.4vw;
  letter-spacing: 0.12vw;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  min-width: 6vw;
}
.telemetry-value {
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.45vw;
  letter-spacing: 0.05vw;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
}
.telemetry-chart {
  font-family: 'Datatype', sans-serif;
  font-size: 1.1vw;
  font-variation-settings: 'wdth' 60, 'wght' 300;
  font-feature-settings: 'liga' 1, 'calt' 1;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1;
}
.telemetry-mono {
  letter-spacing: 0.1vw;
}
.telemetry-unit {
  font-size: 0.42vw;
  color: rgba(255, 255, 255, 0.18);
  letter-spacing: 0.08vw;
}

/* --- Transitions --- */
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

/* --- Mobile --- */
@media (max-width: 1024px) {
  .planet-detail {
    top: 80px;
    left: 20px;
    right: auto;
  }
  .planet-number {
    font-size: 2.2vw;
    letter-spacing: 0.5vw;
    margin-bottom: 2vw;
  }
  .planet-name {
    font-size: 8vw;
    letter-spacing: 1vw;
  }
  .info-type {
    font-size: 2vw;
    letter-spacing: 0.3vw;
    padding: 0.5vw 1.5vw;
    margin-bottom: 2vw;
  }
  .info-grid {
    grid-template-columns: auto;
    gap: 0.4vw;
  }
  .info-item {
    gap: 2vw;
  }
  .info-label {
    font-size: 2.6vw;
    letter-spacing: 0.2vw;
    min-width: 20vw;
  }
  .info-value {
    font-size: 2.8vw;
    letter-spacing: 0.1vw;
  }
  .info-unit {
    font-size: 2.4vw;
  }
  .telemetry {
    bottom: 24px;
    left: 20px;
    right: auto;
    align-items: flex-start;
  }
  .telemetry-row {
    display: grid;
    grid-template-columns: 32vw 14vw auto;
    gap: 0;
    align-items: baseline;
  }
  .telemetry-label {
    font-size: 2.6vw;
    letter-spacing: 0.2vw;
    min-width: auto;
  }
  .telemetry-value {
    font-size: 2.8vw;
    letter-spacing: 0.1vw;
    white-space: nowrap;
  }
  .telemetry-chart {
    font-size: 5vw;
  }
  .telemetry-unit {
    font-size: 2.4vw;
  }
}
</style>
