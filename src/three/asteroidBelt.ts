import * as THREE from "three";
import { loadGLB, fixMaterials } from "@/three/modelLoader";
import type { AsteroidBelt } from "@/lib/planets";
import { ORBIT_SCALE } from "@/lib/constants";

export interface AsteroidBeltEntry {
  group: THREE.Group;
  tick: (time: number, delta: number) => void;
}

interface InstanceData {
  mesh: THREE.InstancedMesh;
  baseMatrices: THREE.Matrix4[];
  tumbleAxes: THREE.Vector3[];
  tumbleSpeeds: number[];
}

/**
 * Extract all Mesh geometries from a loaded GLB scene.
 * Returns pairs of [geometry, material] for each unique mesh found.
 */
function extractGeometries(
  glbScene: THREE.Group,
): { geometry: THREE.BufferGeometry; material: THREE.Material }[] {
  const results: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
  glbScene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      results.push({
        geometry: child.geometry.clone(),
        material: (Array.isArray(child.material) ? child.material[0] : child.material).clone(),
      });
    }
  });
  return results;
}

/**
 * Compute density at a normalized belt position (0=inner, 1=outer).
 * Returns 0-1 where Kirkwood gaps reduce density via Gaussian falloff.
 */
function beltDensity(
  normalizedPos: number,
  gaps: readonly { position: number; width: number }[],
): number {
  let density = 1.0;
  for (const gap of gaps) {
    const dist = (normalizedPos - gap.position) / gap.width;
    density *= 1.0 - Math.exp(-0.5 * dist * dist);
  }
  return density;
}

/**
 * Sample a radius within the belt using rejection sampling for Kirkwood gaps.
 */
function sampleRadius(
  innerRadius: number,
  outerRadius: number,
  gaps: readonly { position: number; width: number }[],
): number {
  const range = outerRadius - innerRadius;
  for (let attempt = 0; attempt < 100; attempt++) {
    const r = innerRadius + Math.random() * range;
    const normalized = (r - innerRadius) / range;
    const density = beltDensity(normalized, gaps);
    if (Math.random() < density) return r;
  }
  // Fallback: return a random radius (extremely unlikely to reach here)
  return innerRadius + Math.random() * range;
}

/**
 * Sample a scale using power-law distribution.
 * Higher exponent = more small asteroids.
 */
function sampleScale(sizeRange: readonly [number, number], exponent: number): number {
  return sizeRange[0] + (sizeRange[1] - sizeRange[0]) * Math.pow(Math.random(), exponent);
}

/**
 * Sample a Y offset using Rayleigh distribution (toroidal vertical spread).
 * Most asteroids cluster near the ecliptic plane with a natural tail.
 */
function sampleYOffset(thicknessDeg: number): number {
  const sigma = thicknessDeg * (Math.PI / 180);
  const rayleigh = sigma * Math.sqrt(-2 * Math.log(1 - Math.random()));
  // Random sign for above/below ecliptic
  return rayleigh * (Math.random() < 0.5 ? 1 : -1);
}

export async function createAsteroidBelt(
  belt: AsteroidBelt,
): Promise<AsteroidBeltEntry> {
  const group = new THREE.Group();
  group.name = belt.id;

  // Load and extract geometries
  const glbScene = await loadGLB(`/models/${belt.glbFile}`);
  fixMaterials(glbScene);
  const extracted = extractGeometries(glbScene);

  if (extracted.length === 0) {
    console.warn(`No meshes found in ${belt.glbFile}`);
    return { group, tick: () => {} };
  }

  // Distribute particles across geometries roughly equally
  const numGeometries = extracted.length;
  const perGeometry = Math.floor(belt.maxParticles / numGeometries);
  const remainder = belt.maxParticles % numGeometries;

  const instanceDataList: InstanceData[] = [];

  // Reusable math objects
  const position = new THREE.Vector3();
  const rotation = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();

  for (let gi = 0; gi < numGeometries; gi++) {
    const { geometry, material } = extracted[gi];
    const count = perGeometry + (gi < remainder ? 1 : 0);
    if (count === 0) continue;

    // Make material suitable for asteroid rendering
    if (material instanceof THREE.MeshStandardMaterial) {
      material.roughness = Math.max(material.roughness, 0.9);
      material.metalness = Math.min(material.metalness, 0.1);
    }

    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    instancedMesh.frustumCulled = false; // belt is always partially visible

    const baseMatrices: THREE.Matrix4[] = [];
    const tumbleAxes: THREE.Vector3[] = [];
    const tumbleSpeeds: number[] = [];

    for (let i = 0; i < count; i++) {
      // 1. Sample radius with Kirkwood gap rejection
      const r = sampleRadius(belt.innerRadius, belt.outerRadius, belt.kirkwoodGaps) * ORBIT_SCALE;

      // 2. Random angle
      const angle = Math.random() * Math.PI * 2;

      // 3. Y offset (toroidal spread)
      const y = sampleYOffset(belt.thickness) * ORBIT_SCALE * belt.innerRadius;

      // Position in XZ plane (matching keplerToWorld: x→x, z→y swap)
      position.set(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r,
      );

      // 4. Scale (power law)
      const s = sampleScale(belt.sizeRange, belt.sizeExponent);
      scale.set(s, s, s);

      // 5. Random rotation
      rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      quaternion.setFromEuler(rotation);

      // 6. Build base matrix
      matrix.compose(position, quaternion, scale);
      const baseMatrix = matrix.clone();
      baseMatrices.push(baseMatrix);

      // 7. Tumble axis + speed
      const tumbleAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      tumbleAxes.push(tumbleAxis);
      tumbleSpeeds.push((0.5 + Math.random()) * belt.tumbleSpeed);

      // Set initial matrix
      instancedMesh.setMatrixAt(i, baseMatrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    group.add(instancedMesh);

    instanceDataList.push({
      mesh: instancedMesh,
      baseMatrices,
      tumbleAxes,
      tumbleSpeeds,
    });
  }

  // Reusable objects for tick()
  const tumbleQuat = new THREE.Quaternion();
  const tumbleMatrix = new THREE.Matrix4();
  const composedMatrix = new THREE.Matrix4();

  function tick(time: number, delta: number): void {
    // 1. Rotate entire group (slow orbital drift)
    group.rotation.y += delta * belt.orbitalSpeed;

    // 2. Update individual tumble rotations
    for (const data of instanceDataList) {
      for (let i = 0; i < data.mesh.count; i++) {
        const angle = time * data.tumbleSpeeds[i];
        tumbleQuat.setFromAxisAngle(data.tumbleAxes[i], angle);
        tumbleMatrix.makeRotationFromQuaternion(tumbleQuat);
        composedMatrix.multiplyMatrices(data.baseMatrices[i], tumbleMatrix);
        data.mesh.setMatrixAt(i, composedMatrix);
      }
      data.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  return { group, tick };
}
