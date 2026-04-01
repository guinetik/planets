// src/composables/usePlanets.ts
import * as THREE from "three";
import { createPlanetMesh, type PlanetMesh } from "@/three/planetMesh";
import { createMoonMesh, type MoonMesh } from "@/three/moonMesh";
import { createSunMesh, type SunObjects } from "@/three/sunMesh";
import { createRingMesh } from "@/three/ringMesh";
import { createStarfield } from "@/three/starfield";
import { loadAllModels, type ModelCache } from "@/three/modelLoader";
import {
  orbitalPosition3D,
  orbitPathPoints,
  type OrbitalElements,
} from "@/lib/kepler";
import { PLANETS, SUN } from "@/lib/planets";
import {
  ORBIT_SCALE,
  SIZE_SCALE,
  ORBIT_PATH_SEGMENTS,
  ORBIT_PATH_COLOR,
  ORBIT_PATH_OPACITY,
  MOON_ORBIT_PATH_OPACITY,
  ROTATION_SPEED_DIVISOR,
  MOON_ORBIT_SPEED_DIVISOR,
} from "@/lib/constants";

export interface MoonEntry {
  name: string;
  meshRef: MoonMesh;
  orbit: OrbitalElements;
  epoch: number;
}

export interface PlanetEntry {
  id: string;
  name: string;
  planetGroup: THREE.Group;
  planetMeshRef: PlanetMesh;
  ringUniforms: Record<string, THREE.IUniform> | null;
  moonEntries: MoonEntry[];
  orbit: OrbitalElements;
  epoch: number;
  orbitLine: THREE.LineLoop;
  axialTilt: number;
  rotationSpeed: number;
}

export interface SolarSystemObjects {
  entries: PlanetEntry[];
  sunObjects: SunObjects;
}

function keplerToWorld(pos: {
  x: number;
  y: number;
  z: number;
}): THREE.Vector3 {
  return new THREE.Vector3(pos.x, pos.z, pos.y);
}

function createOrbitLine(
  elements: OrbitalElements,
  isMoon: boolean,
): THREE.LineLoop {
  const rawPoints = orbitPathPoints(elements, ORBIT_PATH_SEGMENTS);
  const threePoints = rawPoints.map((p) => new THREE.Vector3(p.x, p.z, p.y));
  const geometry = new THREE.BufferGeometry().setFromPoints(threePoints);
  const material = new THREE.LineBasicMaterial({
    color: ORBIT_PATH_COLOR,
    transparent: true,
    opacity: isMoon ? MOON_ORBIT_PATH_OPACITY : ORBIT_PATH_OPACITY,
  });
  return new THREE.LineLoop(geometry, material);
}

const tmpWorldPosition = new THREE.Vector3();
const tmpWorldQuaternion = new THREE.Quaternion();
const tmpLocalLightDirection = new THREE.Vector3();

function ensureDynamicLightUniforms(
  uniforms: Record<string, THREE.IUniform>,
  ambientStrength: number,
  backlightStrength: number,
): void {
  if (!uniforms.uLightDir) {
    uniforms.uLightDir = { value: new THREE.Vector3(1, 0, 0) };
  }
  if (!uniforms.uAmbientStrength) {
    uniforms.uAmbientStrength = { value: ambientStrength };
  }
  if (!uniforms.uBacklightStrength) {
    uniforms.uBacklightStrength = { value: backlightStrength };
  }
}

function enableDynamicSunLighting(
  mesh: THREE.Mesh,
  uniforms: Record<string, THREE.IUniform>,
  ambientStrength: number,
  backlightStrength: number,
): void {
  if (!uniforms.uTime) return;

  const material = Array.isArray(mesh.material)
    ? mesh.material[0]
    : mesh.material;
  if (!(material instanceof THREE.ShaderMaterial)) return;

  ensureDynamicLightUniforms(uniforms, ambientStrength, backlightStrength);

  if (material.userData.dynamicSunLightingEnabled) return;
  material.userData.dynamicSunLightingEnabled = true;
  material.customProgramCacheKey = () => "dynamic-sun-light-v1";

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLightDir = uniforms.uLightDir;
    shader.uniforms.uAmbientStrength = uniforms.uAmbientStrength;
    shader.uniforms.uBacklightStrength = uniforms.uBacklightStrength;

    shader.fragmentShader = shader.fragmentShader.replace(
      "precision highp float;",
      `precision highp float;

uniform vec3  uLightDir;
uniform float uAmbientStrength;
uniform float uBacklightStrength;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      `    // --- Directional lighting ---
    vec3  lightDir = normalize(vec3(1.0, 1.0, 0.5));
    float light    = diffuseLight(vModelNormal, lightDir, 0.3);
    surfaceColor  *= light;
`,
      `    // --- Directional lighting ---
    vec3  lightDir   = normalize(uLightDir);
    float diffuse    = max(0.0, dot(normalize(vModelNormal), lightDir));
    float sunlight   = uAmbientStrength + (1.0 - uAmbientStrength) * diffuse;
    float starlight  = pow(max(0.0, 1.0 - diffuse), 2.0) * uBacklightStrength;
    surfaceColor    *= sunlight + starlight;
`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      `    // --- Directional lighting ---
    vec3  lightDir    = normalize(vec3(1.0, 0.5, 0.3));
    float light       = diffuseLight(vModelNormal, lightDir, 0.4);
    surfaceColor     *= light;
`,
      `    // --- Directional lighting ---
    vec3  lightDir   = normalize(uLightDir);
    float diffuse    = max(0.0, dot(normalize(vModelNormal), lightDir));
    float sunlight   = uAmbientStrength + (1.0 - uAmbientStrength) * diffuse;
    float starlight  = pow(max(0.0, 1.0 - diffuse), 2.0) * uBacklightStrength;
    surfaceColor    *= sunlight + starlight;
`,
    );
  };

  material.needsUpdate = true;
}

function updateDynamicSunLighting(
  mesh: THREE.Object3D,
  uniforms: Record<string, THREE.IUniform>,
  ambientStrength: number,
  backlightStrength: number,
): void {
  if (!uniforms.uTime) return;

  ensureDynamicLightUniforms(uniforms, ambientStrength, backlightStrength);
  uniforms.uAmbientStrength.value = ambientStrength;
  uniforms.uBacklightStrength.value = backlightStrength;

  mesh.getWorldPosition(tmpWorldPosition);
  if (tmpWorldPosition.lengthSq() < 1e-8) {
    tmpLocalLightDirection.set(1, 0, 0);
  } else {
    tmpLocalLightDirection
      .copy(tmpWorldPosition)
      .multiplyScalar(-1)
      .normalize();
  }

  mesh.getWorldQuaternion(tmpWorldQuaternion);
  tmpWorldQuaternion.invert();
  tmpLocalLightDirection.applyQuaternion(tmpWorldQuaternion).normalize();

  const lightDir = uniforms.uLightDir.value as THREE.Vector3;
  lightDir.copy(tmpLocalLightDirection);
}

export async function buildPlanetEntries(
  scene: THREE.Scene,
): Promise<SolarSystemObjects> {
  const entries: PlanetEntry[] = [];

  // Load all GLB models in parallel
  const models: ModelCache = await loadAllModels();

  // Starfield
  scene.add(createStarfield());

  // Sun
  const sunObjects = createSunMesh(SUN, models.get("sun"));
  scene.add(sunObjects.mesh);

  for (const planet of PLANETS) {
    const planetModel = models.get(planet.id);
    const planetMeshRef = createPlanetMesh(
      planet.id,
      planet.shader,
      planet.displayRadius,
      planetModel,
    );
    const planetGroup = new THREE.Group();
    planetGroup.add(planetMeshRef.mesh);

    // Shader-based ring (added to the planet mesh so it tilts with axial tilt)
    let ringUniforms: Record<string, THREE.IUniform> | null = null;
    if (planet.ring) {
      const ringMesh = createRingMesh(planet.ring, planet.displayRadius);
      planetMeshRef.mesh.add(ringMesh);
      ringUniforms = (ringMesh.material as THREE.ShaderMaterial).uniforms;
    }

    enableDynamicSunLighting(
      planetMeshRef.mesh,
      planetMeshRef.uniforms,
      0.22,
      0.1,
    );

    const epoch = -Math.random() * planet.orbit.period;
    const scaledOrbit: OrbitalElements = {
      ...planet.orbit,
      semiMajorAxis: planet.orbit.semiMajorAxis * ORBIT_SCALE,
      epoch,
    };

    // Moons
    const moonEntries: MoonEntry[] = [];
    for (const moon of planet.moons) {
      const moonModel = models.get(moon.name.toLowerCase());
      const moonMeshRef = createMoonMesh(
        moon.shader,
        moon.displayRadius,
        moonModel,
      );
      planetGroup.add(moonMeshRef.mesh);
      enableDynamicSunLighting(
        moonMeshRef.mesh,
        moonMeshRef.uniforms,
        0.26,
        0.14,
      );

      const moonEpoch = -Math.random() * moon.orbit.period;
      // Moon orbits are in the same pixel units as planet display radii,
      // so they must scale with SIZE_SCALE (not ORBIT_SCALE) to stay outside the planet body
      const scaledMoonOrbit: OrbitalElements = {
        ...moon.orbit,
        semiMajorAxis: (moon.orbit.semiMajorAxis * SIZE_SCALE) / 900,
        epoch: moonEpoch,
      };

      const moonOrbitLine = createOrbitLine(scaledMoonOrbit, true);
      planetGroup.add(moonOrbitLine);

      moonEntries.push({
        name: moon.name,
        meshRef: moonMeshRef,
        orbit: scaledMoonOrbit,
        epoch: moonEpoch,
      });
    }

    // Planet orbit line
    const orbitLine = createOrbitLine(scaledOrbit, false);
    scene.add(orbitLine);

    // Initial position
    const initialPos = orbitalPosition3D(scaledOrbit, 0);
    planetGroup.position.copy(keplerToWorld(initialPos));

    // For procedural meshes, apply axial tilt (models already have it baked in)
    if (!planetMeshRef.isModel) {
      planetMeshRef.mesh.rotation.order = "ZYX";
      planetMeshRef.mesh.rotation.z = planet.axialTilt;
    }

    scene.add(planetGroup);

    entries.push({
      id: planet.id,
      name: planet.name,
      planetGroup,
      planetMeshRef,
      ringUniforms,
      moonEntries,
      orbit: scaledOrbit,
      epoch,
      orbitLine,
      axialTilt: planet.axialTilt,
      rotationSpeed: planet.rotationSpeed,
    });
  }

  return { entries, sunObjects };
}

export function tickPlanets(
  entries: PlanetEntry[],
  simTime: number,
  sunUniforms: Record<string, THREE.IUniform>,
  sunMesh?: THREE.Mesh | null,
  activePlanetId?: string | null,
): void {
  const shaderTime = simTime / 365.25;
  const inDetail = !!activePlanetId;

  // Update sun
  if (sunUniforms.uTime) {
    sunUniforms.uTime.value = shaderTime;
  }
  if (sunMesh && !inDetail) {
    sunMesh.rotation.y = (simTime * 0.05) / ROTATION_SPEED_DIVISOR;
  }

  for (const entry of entries) {
    const isActive = entry.id === activePlanetId;

    // Orbital translation: only update positions in overview, or freeze them in detail
    if (!inDetail) {
      const planetPos = orbitalPosition3D(entry.orbit, simTime);
      entry.planetGroup.position.copy(keplerToWorld(planetPos));
    }

    // Self-rotation: always runs for the active planet, paused for others in detail
    if (!inDetail || isActive) {
      entry.planetMeshRef.mesh.rotation.y =
        (simTime * entry.rotationSpeed) / ROTATION_SPEED_DIVISOR;
    }

    // Update planet shader time (if procedural)
    if (entry.planetMeshRef.uniforms.uTime) {
      entry.planetMeshRef.uniforms.uTime.value = shaderTime;
    }

    // Update Earth night-side light direction (world space)
    if (entry.planetMeshRef.uniforms.uLightDir) {
      const lightDir = entry.planetMeshRef.uniforms.uLightDir.value as THREE.Vector3;
      if (inDetail) {
        lightDir.set(-2, 1.5, 3).normalize();
      } else {
        lightDir.copy(entry.planetGroup.position).negate().normalize();
      }
    }
    // Update ring shader time
    if (entry.ringUniforms?.uTime) {
      entry.ringUniforms.uTime.value = shaderTime;
    }
    updateDynamicSunLighting(
      entry.planetMeshRef.mesh,
      entry.planetMeshRef.uniforms,
      0.22,
      0.1,
    );

    // Moons: keep orbiting for active planet, pause for others in detail
    // In detail view, slow moons further so they don't zip across the close-up frame
    const moonSpeedDivisor = (inDetail && isActive)
      ? MOON_ORBIT_SPEED_DIVISOR * 4
      : MOON_ORBIT_SPEED_DIVISOR;
    for (const moon of entry.moonEntries) {
      if (!inDetail || isActive) {
        const moonPos = orbitalPosition3D(
          moon.orbit,
          simTime / moonSpeedDivisor,
        );
        moon.meshRef.mesh.position.copy(keplerToWorld(moonPos));
        moon.meshRef.mesh.rotation.y = (simTime * 0.15) / ROTATION_SPEED_DIVISOR;
      }
      if (moon.meshRef.uniforms.uTime) {
        moon.meshRef.uniforms.uTime.value = shaderTime;
      }
      updateDynamicSunLighting(
        moon.meshRef.mesh,
        moon.meshRef.uniforms,
        0.26,
        0.14,
      );
    }
  }
}
