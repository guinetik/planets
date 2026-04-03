// src/lib/planets.ts
// Type definitions and data loader for the solar system.
// All data lives in /planetarium.json — this file has no hardcoded data.

import type { OrbitalElements } from "./kepler";

const DEG = Math.PI / 180;

export type ShaderType = "star" | "rockyPlanet" | "gasGiant";

export interface ShaderConfig {
  readonly type: ShaderType;
  readonly uniforms: Record<string, number | number[]>;
}

export interface Moon {
  readonly name: string;
  readonly orbit: OrbitalElements;
  readonly displayRadius: number;
  readonly shader: ShaderConfig;
  readonly rotationSpeed: number;
}

export interface RingConfig {
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly opacity: number;
  readonly color: number[];
}

export interface KirkwoodGap {
  readonly position: number;
  readonly width: number;
}

export interface AsteroidBelt {
  readonly id: string;
  readonly name: string;
  readonly orbit: OrbitalElements;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly maxParticles: number;
  readonly thickness: number;
  readonly orbitalSpeed: number;
  readonly tumbleSpeed: number;
  readonly sizeRange: readonly [number, number];
  readonly sizeExponent: number;
  readonly kirkwoodGaps: readonly KirkwoodGap[];
  readonly glbFile: string;
  readonly emissiveColor?: readonly [number, number, number];
}

export type PlanetType = 'Terrestrial' | 'Gas Giant' | 'Ice Giant' | 'Dwarf Planet';

export interface Planet {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly type: PlanetType;
  readonly accentColor: string;
  readonly orbit: OrbitalElements;
  readonly displayRadius: number;
  readonly shader: ShaderConfig;
  readonly ring?: RingConfig;
  readonly moons: readonly Moon[];
  readonly prose: readonly string[];
  readonly rotationSpeed: number;
  readonly axialTilt: number;
  readonly useModel?: boolean;
}

export interface SunData {
  readonly name: string;
  readonly displayRadius: number;
  readonly shader: ShaderConfig;
  readonly rotationSpeed: number;
}

// --- JSON shape (angles in degrees) ---

interface OrbitJSON {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  longitudeOfAscendingNode: number;
  argumentOfPeriapsis: number;
  period: number;
}

interface MoonJSON {
  name: string;
  orbit: OrbitJSON;
  displayRadius: number;
  rotationSpeed: number;
  shader: ShaderConfig;
}

interface PlanetJSON {
  id: string;
  name: string;
  order: number;
  type: PlanetType;
  accentColor: string;
  orbit: OrbitJSON;
  displayRadius: number;
  axialTilt: number;
  rotationSpeed: number;
  shader: ShaderConfig;
  ring?: RingConfig;
  moons: MoonJSON[];
  prose: string[];
  useModel?: boolean;
}

interface AsteroidBeltJSON {
  id: string;
  name: string;
  orbit: OrbitJSON;
  innerRadius: number;
  outerRadius: number;
  maxParticles: number;
  thickness: number;
  orbitalSpeed: number;
  tumbleSpeed: number;
  sizeRange: [number, number];
  sizeExponent: number;
  kirkwoodGaps: KirkwoodGap[];
  glbFile: string;
  emissiveColor?: [number, number, number];
}

interface PlanetariumJSON {
  sun: SunData;
  planets: PlanetJSON[];
  asteroidBelts?: AsteroidBeltJSON[];
}

// --- Conversion helpers ---

function convertOrbit(o: OrbitJSON): OrbitalElements {
  return {
    semiMajorAxis: o.semiMajorAxis,
    eccentricity: o.eccentricity,
    inclination: o.inclination * DEG,
    longitudeOfAscendingNode: o.longitudeOfAscendingNode * DEG,
    argumentOfPeriapsis: o.argumentOfPeriapsis * DEG,
    period: o.period,
  };
}

function convertMoon(m: MoonJSON): Moon {
  return {
    name: m.name,
    orbit: convertOrbit(m.orbit),
    displayRadius: m.displayRadius,
    rotationSpeed: m.rotationSpeed,
    shader: m.shader,
  };
}

function convertPlanet(p: PlanetJSON): Planet {
  return {
    id: p.id,
    name: p.name,
    order: p.order,
    type: p.type,
    accentColor: p.accentColor,
    orbit: convertOrbit(p.orbit),
    displayRadius: p.displayRadius,
    axialTilt: p.axialTilt * DEG,
    rotationSpeed: p.rotationSpeed,
    shader: p.shader,
    ring: p.ring,
    moons: p.moons.map(convertMoon),
    prose: p.prose,
    useModel: p.useModel,
  };
}

function convertAsteroidBelt(b: AsteroidBeltJSON): AsteroidBelt {
  return {
    id: b.id,
    name: b.name,
    orbit: convertOrbit(b.orbit),
    innerRadius: b.innerRadius,
    outerRadius: b.outerRadius,
    maxParticles: b.maxParticles,
    thickness: b.thickness,
    orbitalSpeed: b.orbitalSpeed,
    tumbleSpeed: b.tumbleSpeed,
    sizeRange: b.sizeRange,
    sizeExponent: b.sizeExponent,
    kirkwoodGaps: b.kirkwoodGaps,
    glbFile: b.glbFile,
    emissiveColor: b.emissiveColor,
  };
}

// --- Runtime state (populated by loadPlanetarium) ---

export let SUN: SunData = null!;
export let PLANETS: readonly Planet[] = [];
export let PLANET_IDS: string[] = [];
export let ASTEROID_BELTS: readonly AsteroidBelt[] = [];

let _loaded = false;

export async function loadPlanetarium(): Promise<void> {
  if (_loaded) return;
  const resp = await fetch("/planetarium.json");
  const data: PlanetariumJSON = await resp.json();
  SUN = data.sun;
  PLANETS = data.planets.map(convertPlanet);
  PLANET_IDS = PLANETS.map((p) => p.id);
  ASTEROID_BELTS = (data.asteroidBelts ?? []).map(convertAsteroidBelt);
  _loaded = true;
}

export function getPlanet(id: string): Planet {
  const planet = PLANETS.find((p) => p.id === id);
  if (!planet) throw new Error(`Unknown planet id: ${id}`);
  return planet;
}
