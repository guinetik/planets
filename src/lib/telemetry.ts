// src/lib/telemetry.ts
// Pure-math telemetry derived from Keplerian orbital elements + simulation time.
// No Three.js or Vue dependencies.

import type { OrbitalElements } from './kepler'
import { meanAnomaly, solveKeplerEquation, trueAnomalyFromEccentric, keplerRadius } from './kepler'

const TWO_PI = 2 * Math.PI
const DEG = 180 / Math.PI

// Real-world scale factors for display (our orbit units are arbitrary)
// semiMajorAxis in planet data is in scene units; these are the real AU values
const REAL_AU: Record<string, number> = {
  mercury: 0.387,
  venus: 0.723,
  earth: 1.0,
  mars: 1.524,
  jupiter: 5.203,
  saturn: 9.537,
  uranus: 19.191,
  neptune: 30.069,
}

// Real orbital periods in Earth days
const REAL_PERIOD_DAYS: Record<string, number> = {
  mercury: 87.97,
  venus: 224.7,
  earth: 365.25,
  mars: 686.97,
  jupiter: 4332.59,
  saturn: 10759.22,
  uranus: 30688.5,
  neptune: 60182.0,
}

// Real rotation periods in Earth hours (negative = retrograde)
const REAL_ROTATION_HOURS: Record<string, number> = {
  mercury: 1407.6,
  venus: -5832.5,
  earth: 23.934,
  mars: 24.623,
  jupiter: 9.925,
  saturn: 10.656,
  uranus: -17.24,
  neptune: 16.11,
}

const SPEED_OF_LIGHT_AU_PER_MIN = 0.002004 // ~1 AU in 8.317 minutes

export interface TelemetryData {
  solarDistanceAU: number
  orbitalVelocityKmS: number
  trueAnomalyDeg: number
  meanAnomalyDeg: number
  localSolarTime: string  // HH:MM:SS format
  lightTravelMin: number
  orbitalPeriodDays: number
  phaseAngleDeg: number
  // Datatype font chart strings
  orbitProgressPie: string    // {p:XX} — % through current orbit
  velocitySparkline: string   // {l:v1,v2,...} — recent velocity history
  distanceSparkline: string   // {l:v1,v2,...} — recent distance history
}

// Rolling history buffers for sparklines (per planet)
const SPARKLINE_LENGTH = 16
const SAMPLE_INTERVAL = 30  // only sample every N calls (~0.5s at 60fps)
const velocityHistory: Record<string, number[]> = {}
const distanceHistory: Record<string, number[]> = {}
let _lastPlanetId = ''
let _sampleCounter = 0

function pushHistory(buf: Record<string, number[]>, planetId: string, value: number): number[] {
  if (!buf[planetId]) buf[planetId] = []
  buf[planetId].push(value)
  if (buf[planetId].length > SPARKLINE_LENGTH) buf[planetId].shift()
  return buf[planetId]
}

function toSparkline(values: number[]): string {
  if (values.length < 2) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const mean = (max + min) / 2
  // For nearly-circular orbits the range is tiny — use at least 5% of the mean
  // so the sparkline shows meaningful variation, not amplified noise
  const effectiveRange = Math.max(range, mean * 0.05) || 1
  const center = mean
  const scaled = values.map(v => Math.round(Math.min(100, Math.max(0, ((v - center) / effectiveRange + 0.5) * 100))))
  return `{l:${scaled.join(',')}}`
}

export function resetTelemetryHistory(): void {
  for (const key of Object.keys(velocityHistory)) delete velocityHistory[key]
  for (const key of Object.keys(distanceHistory)) delete distanceHistory[key]
  _lastPlanetId = ''
}

export function computeTelemetry(
  planetId: string,
  orbit: OrbitalElements,
  simTime: number,
): TelemetryData {
  // Compute orbital position using the same pipeline as the scene
  const M = meanAnomaly(orbit.period, simTime, orbit.epoch ?? 0)
  const E = solveKeplerEquation(M, orbit.eccentricity)
  const nu = trueAnomalyFromEccentric(E, orbit.eccentricity)

  // Current radius in scene units, then scale to real AU
  const realAU = REAL_AU[planetId] ?? 1.0
  const sceneR = keplerRadius(orbit.semiMajorAxis, orbit.eccentricity, nu)
  const sceneA = orbit.semiMajorAxis
  const currentAU = (sceneR / sceneA) * realAU

  // Orbital velocity via vis-viva: v = sqrt(GM * (2/r - 1/a))
  // GM_sun in AU^3/day^2, then convert to km/s
  const realPeriod = REAL_PERIOD_DAYS[planetId] ?? orbit.period
  const GM = (4 * Math.PI * Math.PI * realAU * realAU * realAU) / (realPeriod * realPeriod)
  const vAuPerDay = Math.sqrt(GM * (2 / currentAU - 1 / realAU))
  const vKmS = vAuPerDay * 149597870.7 / 86400

  // Light travel time
  const lightTravelMin = currentAU / SPEED_OF_LIGHT_AU_PER_MIN

  // Local solar time: derived from planet rotation + orbital position
  // The true anomaly gives the planet's angle around the sun.
  // Rotation angle = simTime * rotationRate. The "solar noon" happens
  // when the sub-solar point faces the sun.
  const rotHours = REAL_ROTATION_HOURS[planetId] ?? 24
  const rotPeriodDays = Math.abs(rotHours) / 24
  const retrograde = rotHours < 0
  // Fractional solar day: combine self-rotation and orbital motion
  const rotAngle = (simTime / rotPeriodDays) * TWO_PI
  const solarAngle = retrograde ? -rotAngle - nu : rotAngle - nu
  // Normalize to [0, 2π)
  const normalizedAngle = ((solarAngle % TWO_PI) + TWO_PI) % TWO_PI
  // Convert to hours (0 = midnight, π = noon)
  const solarHours = (normalizedAngle / TWO_PI) * 24
  const h = Math.floor(solarHours)
  const m = Math.floor((solarHours - h) * 60)
  const s = Math.floor(((solarHours - h) * 60 - m) * 60)
  const localSolarTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  // Phase angle (sun-planet-observer angle approximation — use true anomaly as proxy)
  const phaseAngleDeg = ((nu * DEG) % 360 + 360) % 360

  // Mean anomaly in degrees
  const meanAnomalyDeg = (((M % TWO_PI) + TWO_PI) % TWO_PI) * DEG

  // Orbit progress as percentage (mean anomaly is linear in time)
  const orbitPercent = Math.round((meanAnomalyDeg / 360) * 100)
  const orbitProgressPie = `{p:${orbitPercent}}`

  // Clear history when switching planets
  if (planetId !== _lastPlanetId) {
    delete velocityHistory[planetId]
    delete distanceHistory[planetId]
    _lastPlanetId = planetId
    _sampleCounter = 0
  }

  // Sample sparkline data at throttled rate so values span meaningful orbital change
  _sampleCounter++
  if (_sampleCounter >= SAMPLE_INTERVAL) {
    _sampleCounter = 0
    pushHistory(velocityHistory, planetId, vKmS)
    pushHistory(distanceHistory, planetId, currentAU)
  }

  const velHist = velocityHistory[planetId] ?? []
  const distHist = distanceHistory[planetId] ?? []
  const velocitySparkline = toSparkline(velHist)
  const distanceSparkline = toSparkline(distHist)

  return {
    solarDistanceAU: currentAU,
    orbitalVelocityKmS: vKmS,
    trueAnomalyDeg: ((nu * DEG) % 360 + 360) % 360,
    meanAnomalyDeg,
    localSolarTime,
    lightTravelMin,
    orbitalPeriodDays: realPeriod,
    phaseAngleDeg,
    orbitProgressPie,
    velocitySparkline,
    distanceSparkline,
  }
}
