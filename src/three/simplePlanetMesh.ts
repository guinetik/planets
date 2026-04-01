// src/three/simplePlanetMesh.ts
// Textured sphere representation for planets.
import * as THREE from "three";
import { SPHERE_SEGMENTS, SIZE_SCALE } from "@/lib/constants";

const textureLoader = new THREE.TextureLoader();

export interface SimplePlanetMesh {
  mesh: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
}

/**
 * Create a planet as a textured sphere with PBR lighting.
 * Loads the texture from `/textures/{planetId}.jpg`.
 * Falls back to `baseColor` if the texture hasn't loaded yet.
 */
export function createSimplePlanetMesh(
  planetId: string,
  baseColor: number[],
  displayRadius: number,
): SimplePlanetMesh {
  const radius = displayRadius * SIZE_SCALE;
  const geometry = new THREE.SphereGeometry(
    radius,
    SPHERE_SEGMENTS,
    SPHERE_SEGMENTS,
  );

  const color = new THREE.Color(baseColor[0], baseColor[1], baseColor[2]);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.05,
  });

  const texture = textureLoader.load(`/textures/${planetId}.jpg`);
  texture.colorSpace = THREE.SRGBColorSpace;
  material.map = texture;

  const mesh = new THREE.Mesh(geometry, material);
  return { mesh, uniforms: {} };
}
