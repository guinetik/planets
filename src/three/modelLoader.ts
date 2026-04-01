// src/three/modelLoader.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface LoadedModel {
  scene: THREE.Group;
  radius: number; // bounding sphere radius for scaling
}

const loader = new GLTFLoader();

function loadGLB(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

/** Model filename lookup. Keys are lowercase body names. */
const MODEL_FILES: Record<string, string> = {
  sun: "sun.glb",
  mercury: "mercury.glb",
  venus: "venus.glb",
  earth: "earth.glb",
  mars: "mars.glb",
  jupiter: "jupiter.glb",
  saturn: "saturn.glb",
  uranus: "uranus.glb",
  neptune: "neptune.glb",
  moon: "moon.glb",
  io: "io.glb",
  titan: "titan.glb",
  europa: "europa.glb",
  callisto: "calisto.glb",
  enceladus: "enceladus.glb",
  phobos: "phobos.glb",
  deimos: "deimos.glb",
};

/** Prefixes for ring mesh node names baked into planet GLBs. */
const RING_NODE_PREFIXES = ["ring", "pierscien"];

export type ModelCache = Map<string, LoadedModel>;

/** Compute bounding sphere of the planet body only (hides ring nodes during measurement). */
function bodyBoundingSphere(group: THREE.Group): THREE.Sphere {
  const hidden: THREE.Object3D[] = [];
  group.traverse((child) => {
    if (RING_NODE_PREFIXES.some((p) => child.name.toLowerCase().startsWith(p)) && child.visible) {
      child.visible = false;
      hidden.push(child);
    }
  });

  const box = new THREE.Box3().setFromObject(group);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);

  for (const obj of hidden) obj.visible = true;
  return sphere;
}

/** Brighten ring meshes so they read as sunlit ice/dust against the dark sky. */
function fixRingMaterials(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const name = child.name.toLowerCase();
    if (!RING_NODE_PREFIXES.some((p) => name.startsWith(p))) return;

    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const mat of mats) {
      mat.blending = THREE.AdditiveBlending;
      mat.transparent = true;
      mat.opacity = 0.4;
      mat.depthWrite = false;
      mat.side = THREE.DoubleSide;

      // Boost the ring surface so it's not swallowed by the dark scene
      if ("emissive" in mat) {
        mat.emissive = new THREE.Color(0xc8b888);
        mat.emissiveIntensity = 0.6;
      }
      if ("color" in mat) {
        mat.color.lerp(new THREE.Color(0xffffff), 0.4);
      }

      mat.needsUpdate = true;
    }
  });
}

/** Fix common GLB material issues: force double-sided and soften strong specular response. */
function fixMaterials(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;

    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const mat of mats) {
      mat.side = THREE.DoubleSide;

      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.roughness = Math.max(mat.roughness, 0.78);
        mat.metalness = Math.min(mat.metalness, 0.08);
        mat.envMapIntensity = Math.min(mat.envMapIntensity, 0.45);
      }

      if (mat instanceof THREE.MeshPhysicalMaterial) {
        mat.clearcoat = Math.min(mat.clearcoat, 0.05);
        mat.clearcoatRoughness = Math.max(mat.clearcoatRoughness, 0.85);
      }

      if (mat instanceof THREE.MeshPhongMaterial) {
        mat.shininess = Math.min(mat.shininess, 8);
        mat.specular.multiplyScalar(0.35);
      }

      mat.needsUpdate = true;
    }
  });
}

export async function loadAllModels(): Promise<ModelCache> {
  const cache: ModelCache = new Map();

  const entries = Object.entries(MODEL_FILES);
  const results = await Promise.allSettled(
    entries.map(async ([name, file]) => {
      const group = await loadGLB(`/models/${file}`);
      fixMaterials(group);
      fixRingMaterials(group);

      // Center on body (excluding rings) and compute body-only radius for scaling
      const sphere1 = bodyBoundingSphere(group);
      group.position.sub(sphere1.center);
      const sphere2 = bodyBoundingSphere(group);

      return {
        name,
        model: { scene: group, radius: sphere2.radius } as LoadedModel,
      };
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      cache.set(result.value.name, result.value.model);
    }
  }

  return cache;
}
