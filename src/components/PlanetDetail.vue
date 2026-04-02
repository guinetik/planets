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
      <div v-if="telemetry" class="telemetry" :class="{ 'telemetry-bottom': planetId === 'saturn' || planetId === 'uranus' || planetId === 'neptune' }">
        <div class="telemetry-row">
          <span class="telemetry-label">Mass</span>
          <span class="telemetry-value">{{ formatMass(telemetry.massEarths) }}</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Radius</span>
          <span class="telemetry-value">{{ formatRadius(telemetry.radiusKm) }} <span class="telemetry-unit">km</span></span>
        </div>
        <div class="telemetry-divider" />
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

function formatMass(earths: number): string {
  if (earths >= 10) return `${earths.toFixed(1)} M⊕`
  if (earths >= 0.1) return `${earths.toFixed(3)} M⊕`
  return `${earths.toFixed(4)} M⊕`
}

function formatRadius(km: number): string {
  if (km >= 10000) return km.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return km.toLocaleString('en-US', { maximumFractionDigits: 1 })
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
.telemetry {
  margin-top: 1vw;
  display: flex;
  flex-direction: column;
  gap: 0.08vw;
}
.telemetry-divider {
  width: 3vw;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 0.08vw 0;
}
.telemetry-bottom {
  position: fixed;
  bottom: 80px;
  left: 80px;
  margin-top: 0;
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
