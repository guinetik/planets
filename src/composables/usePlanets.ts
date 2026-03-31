// src/composables/usePlanets.ts
import * as THREE from 'three'
import { createPlanetMesh, type PlanetMesh } from '@/three/planetMesh'
import { createMoonMesh, type MoonMesh } from '@/three/moonMesh'
import { createSunMesh, type SunObjects } from '@/three/sunMesh'
import { createRingMesh } from '@/three/ringMesh'
import { createStarfield } from '@/three/starfield'
import { orbitalPosition3D, orbitPathPoints, type OrbitalElements } from '@/lib/kepler'
import { PLANETS, SUN } from '@/lib/planets'
import {
  ORBIT_SCALE,
  ORBIT_PATH_SEGMENTS,
  ORBIT_PATH_COLOR,
  ORBIT_PATH_OPACITY,
  MOON_ORBIT_PATH_OPACITY,
} from '@/lib/constants'

export interface MoonEntry {
  name: string
  meshRef: MoonMesh
  orbit: OrbitalElements  // scaled orbit (semiMajorAxis * ORBIT_SCALE)
  epoch: number
}

export interface PlanetEntry {
  id: string
  name: string
  planetGroup: THREE.Group
  planetMeshRef: PlanetMesh
  moonEntries: MoonEntry[]
  ringMesh: THREE.Mesh | null
  orbit: OrbitalElements  // scaled orbit
  epoch: number
  orbitLine: THREE.LineLoop
}

export interface SolarSystemObjects {
  entries: PlanetEntry[]
  sunObjects: SunObjects
}

function keplerToWorld(pos: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(pos.x, pos.z, pos.y)
}

function createOrbitLine(elements: OrbitalElements, isMoon: boolean): THREE.LineLoop {
  const rawPoints = orbitPathPoints(elements, ORBIT_PATH_SEGMENTS)
  const threePoints = rawPoints.map(p =>
    new THREE.Vector3(p.x, p.z, p.y)
  )
  const geometry = new THREE.BufferGeometry().setFromPoints(threePoints)
  const material = new THREE.LineBasicMaterial({
    color: ORBIT_PATH_COLOR,
    transparent: true,
    opacity: isMoon ? MOON_ORBIT_PATH_OPACITY : ORBIT_PATH_OPACITY,
  })
  return new THREE.LineLoop(geometry, material)
}

export function buildPlanetEntries(scene: THREE.Scene): SolarSystemObjects {
  const entries: PlanetEntry[] = []

  scene.add(createStarfield())

  const sunObjects = createSunMesh(SUN)
  scene.add(sunObjects.mesh)

  for (const planet of PLANETS) {
    const planetMeshRef = createPlanetMesh(planet.shader, planet.displayRadius)
    const planetGroup = new THREE.Group()
    planetGroup.add(planetMeshRef.mesh)

    const epoch = -Math.random() * planet.orbit.period
    const scaledOrbit: OrbitalElements = {
      ...planet.orbit,
      semiMajorAxis: planet.orbit.semiMajorAxis * ORBIT_SCALE,
      epoch,
    }

    const moonEntries: MoonEntry[] = []
    for (const moon of planet.moons) {
      const moonMeshRef = createMoonMesh(moon.shader, moon.displayRadius)
      planetGroup.add(moonMeshRef.mesh)

      const moonEpoch = -Math.random() * moon.orbit.period
      const scaledMoonOrbit: OrbitalElements = {
        ...moon.orbit,
        semiMajorAxis: moon.orbit.semiMajorAxis * ORBIT_SCALE,
        epoch: moonEpoch,
      }

      const moonOrbitLine = createOrbitLine(scaledMoonOrbit, true)
      planetGroup.add(moonOrbitLine)

      moonEntries.push({
        name: moon.name,
        meshRef: moonMeshRef,
        orbit: scaledMoonOrbit,
        epoch: moonEpoch,
      })
    }

    let ringMesh: THREE.Mesh | null = null
    if (planet.ring) {
      ringMesh = createRingMesh(planet.ring, planet.displayRadius)
      planetGroup.add(ringMesh)
    }

    const orbitLine = createOrbitLine(scaledOrbit, false)
    scene.add(orbitLine)

    const initialPos = orbitalPosition3D(scaledOrbit, 0)
    planetGroup.position.copy(keplerToWorld(initialPos))

    scene.add(planetGroup)

    entries.push({
      id: planet.id,
      name: planet.name,
      planetGroup,
      planetMeshRef,
      moonEntries,
      ringMesh,
      orbit: scaledOrbit,
      epoch,
      orbitLine,
    })
  }

  return { entries, sunObjects }
}

export function tickPlanets(
  entries: PlanetEntry[],
  simTime: number,
  sunUniforms: Record<string, THREE.IUniform>,
): void {
  sunUniforms.uTime.value = simTime / 365.25

  for (const entry of entries) {
    const planetPos = orbitalPosition3D(entry.orbit, simTime)
    entry.planetGroup.position.copy(keplerToWorld(planetPos))

    entry.planetMeshRef.uniforms.uTime.value = simTime / 365.25

    for (const moon of entry.moonEntries) {
      const moonPos = orbitalPosition3D(moon.orbit, simTime)
      moon.meshRef.mesh.position.copy(keplerToWorld(moonPos))
      moon.meshRef.uniforms.uTime.value = simTime / 365.25
    }
  }
}
