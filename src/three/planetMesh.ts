// src/three/planetMesh.ts
import * as THREE from "three";
import vertSrc from "./shaders/sphere.vert.glsl?raw";
import commonSrc from "./shaders/common.glsl?raw";
import rockyFragSrc from "./shaders/rockyPlanet.frag.glsl?raw";
import gasFragSrc from "./shaders/gasGiant.frag.glsl?raw";
import type { ShaderConfig } from "@/lib/planets";
import type { LoadedModel } from "./modelLoader";
import { SPHERE_SEGMENTS, SIZE_SCALE, ENABLE_GLB_PLANETS } from "@/lib/constants";
import { createSimplePlanetMesh } from "./simplePlanetMesh";

export interface PlanetMesh {
  mesh: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  isModel: boolean;
}

export function createPlanetMesh(
  planetId: string,
  shader: ShaderConfig,
  displayRadius: number,
  model?: LoadedModel,
  useModel?: boolean,
): PlanetMesh {
  // --- New default: textured sphere (unless useModel forces GLB) ---
  if (!ENABLE_GLB_PLANETS && !useModel) {
    const baseColor = shader.uniforms.uBaseColor as number[];
    const simple = createSimplePlanetMesh(planetId, baseColor, displayRadius);
    return { mesh: simple.mesh, uniforms: simple.uniforms, isModel: false };
  }

  // --- Legacy: GLB model + procedural shader fallback (behind ENABLE_GLB_PLANETS) ---
  const radius = displayRadius * SIZE_SCALE;
  const geometry = new THREE.SphereGeometry(
    radius,
    SPHERE_SEGMENTS,
    SPHERE_SEGMENTS,
  );

  if (model) {
    // Invisible sphere for raycasting; model renders as child
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geometry, material);

    const clone = model.scene.clone();
    clone.scale.setScalar(radius / model.radius);
    mesh.add(clone);

    return { mesh, uniforms: {}, isModel: true };
  }

  // Fallback: procedural shader
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uLightDir: { value: new THREE.Vector3(1, 0.5, 0.25).normalize() },
    uAmbientStrength: { value: shader.type === "gasGiant" ? 0.34 : 0.24 },
    uBacklightStrength: { value: shader.type === "gasGiant" ? 0.18 : 0.12 },
  };
  for (const [key, val] of Object.entries(shader.uniforms)) {
    if (Array.isArray(val)) {
      uniforms[key] = { value: new THREE.Vector3(...val) };
    } else {
      uniforms[key] = { value: val };
    }
  }

  const fragSrc = shader.type === "gasGiant" ? gasFragSrc : rockyFragSrc;
  const material = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: commonSrc + "\n" + fragSrc,
    uniforms,
    transparent: true,
  });

  return { mesh: new THREE.Mesh(geometry, material), uniforms, isModel: false };
}
