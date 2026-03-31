// src/composables/usePlanets.ts
import * as THREE from 'three'
import type { SceneObjects } from '@/three/scene'
import { createPlanetMesh, type PlanetMesh } from '@/three/planetMesh'
import { createMoonMesh, type MoonMesh } from '@/three/moonMesh'
import { createSunMesh } from '@/three/sunMesh'
import { createRingMesh } from '@/three/ringMesh'
import { orbitPosition, moonOrbitAngle } from '@/lib/orbit'
import { PLANETS } from '@/lib/planets'
import {
  OVERVIEW_ORBITS,
  OVERVIEW_SIZES,
  MOON_ROTATION_SPEED,
  OVERVIEW_ORBIT_SPEED,
} from '@/lib/constants'

export interface MoonEntry {
  name: string
  meshRef: MoonMesh
  orbitSpeed: number
  orbitRadius: number
  orbitTilt: number
  orbitOffset: number
}

export interface PlanetEntry {
  id: string
  planetGroup: THREE.Group
  planetMeshRef: PlanetMesh
  moonEntries: MoonEntry[]
  ringMesh: THREE.Mesh | null
  orbitAngle: number
}

export function buildPlanetEntries(scene: THREE.Scene): PlanetEntry[] {
  const entries: PlanetEntry[] = []

  const { mesh: sunMesh } = createSunMesh()
  scene.add(sunMesh)

  for (const planet of PLANETS) {
    const radius = OVERVIEW_SIZES[planet.id]
    const planetMeshRef = createPlanetMesh(planet.accentColor, radius)
    const planetGroup = new THREE.Group()
    planetGroup.add(planetMeshRef.mesh)

    const moonEntries: MoonEntry[] = []
    for (const moon of planet.moons) {
      const moonRadius = moon.size
      const moonMeshRef = createMoonMesh(planet.accentColor, moonRadius)
      planetGroup.add(moonMeshRef.mesh)
      moonEntries.push({
        name: moon.name,
        meshRef: moonMeshRef,
        orbitSpeed: moon.orbitSpeed,
        orbitRadius: moon.orbitRadius * radius,
        orbitTilt: moon.orbitTilt,
        orbitOffset: moon.orbitOffset,
      })
    }

    let ringMesh: THREE.Mesh | null = null
    if (planet.id === 'saturn') {
      ringMesh = createRingMesh(planet.accentColor, radius)
      planetGroup.add(ringMesh)
    }

    const orbitRadius = OVERVIEW_ORBITS[planet.id]
    const orbitAngle = Math.random() * Math.PI * 2
    const startPos = orbitPosition(orbitRadius, orbitAngle, 0)
    planetGroup.position.set(startPos.x, startPos.y, startPos.z)

    scene.add(planetGroup)

    entries.push({ id: planet.id, planetGroup, planetMeshRef, moonEntries, ringMesh, orbitAngle })
  }

  return entries
}

export function tickPlanets(entries: PlanetEntry[], time: number): void {
  for (const entry of entries) {
    entry.planetMeshRef.uniforms.uTime.value = time
    for (const moon of entry.moonEntries) {
      const angle = moonOrbitAngle(moon.orbitSpeed, time, moon.orbitOffset)
      const pos = orbitPosition(moon.orbitRadius, angle, moon.orbitTilt)
      moon.meshRef.mesh.position.set(pos.x, pos.y, pos.z)
      moon.meshRef.uniforms.uTime.value = time
      moon.meshRef.mesh.rotation.y += MOON_ROTATION_SPEED * 0.016
    }
  }
}

export function tickOverviewOrbits(entries: PlanetEntry[], delta: number): void {
  for (const entry of entries) {
    entry.orbitAngle += OVERVIEW_ORBIT_SPEED * delta
    const orbitRadius = OVERVIEW_ORBITS[entry.id]
    const pos = orbitPosition(orbitRadius, entry.orbitAngle, 0)
    entry.planetGroup.position.set(pos.x, pos.y, pos.z)
  }
}
