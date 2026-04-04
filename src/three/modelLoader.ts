// src/three/modelLoader.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface LoadedModel {
  scene: THREE.Group;
  radius: number; // bounding sphere radius for scaling
}

const loader = new GLTFLoader();

export function loadGLB(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        // Strip embedded animations — some GLBs auto-deform via morph targets
        if (gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          for (const clip of gltf.animations) {
            const action = mixer.clipAction(clip);
            action.play();
          }
          // Advance to frame 0 and freeze
          mixer.update(0);
          mixer.stopAllAction();

          // Reset any morph target influences to 0
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
              child.morphTargetInfluences.fill(0);
            }
          });
        }
        resolve(gltf.scene);
      },
      undefined,
      reject,
    );
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
  pluto: "pluto.glb",
  moon: "moon.glb",
  io: "io.glb",
  titan: "titan.glb",
  europa: "europa.glb",
  callisto: "calisto.glb",
  enceladus: "enceladus.glb",
  phobos: "phobos.glb",
  deimos: "deimos.glb",
  ganymede: "ganymedes.glb",
  miranda: "miranda.glb",
  titania: "titania.glb",
  triton: "triton.glb",
  charon: "charon.glb",
  ceres: "ceres.glb",
};

export type ModelCache = Map<string, LoadedModel>;

/** Bounding sphere of the loaded model (for centering and scale).
 *  Uses half the max extent of the bounding box rather than the box diagonal,
 *  so spherical models get radius ≈ 1.0 instead of √3 ≈ 1.73. */
function bodyBoundingSphere(group: THREE.Group): THREE.Sphere {
  const box = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = Math.max(size.x, size.y, size.z) / 2;
  return new THREE.Sphere(center, radius);
}

/** Fix common GLB material issues: force double-sided and soften strong specular response. */
export function fixMaterials(group: THREE.Group): void {
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

      // Center on mesh and compute radius for scaling
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
    } else {
      console.warn("Failed to load model:", result.reason);
    }
  }

  return cache;
}
