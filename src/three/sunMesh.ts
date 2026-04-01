// src/three/sunMesh.ts
import * as THREE from "three";
import vertSrc from "./shaders/sphere.vert.glsl?raw";
import commonSrc from "./shaders/common.glsl?raw";
import fragSrc from "./shaders/star.frag.glsl?raw";
import type { SunData } from "@/lib/planets";
import type { LoadedModel } from "./modelLoader";
import {
  SPHERE_SEGMENTS,
  SIZE_SCALE,
  SUN_LIGHT_INTENSITY,
  SUN_LIGHT_RANGE,
} from "@/lib/constants";

export interface SunObjects {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  uniforms: Record<string, THREE.IUniform>;
}
const SUN_LIGHT_DECAY = 1.2;

/** Create a radial gradient canvas texture for the corona sprite. */
function createCoronaTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, "rgba(255, 240, 200, 0.6)");
  gradient.addColorStop(0.15, "rgba(255, 200, 100, 0.3)");
  gradient.addColorStop(0.4, "rgba(255, 160, 60, 0.08)");
  gradient.addColorStop(1, "rgba(255, 120, 40, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function createSunMesh(
  sunData: SunData,
  model?: LoadedModel,
): SunObjects {
  const radius = sunData.displayRadius * SIZE_SCALE;
  const geometry = new THREE.SphereGeometry(
    radius,
    SPHERE_SEGMENTS,
    SPHERE_SEGMENTS,
  );

  let mesh: THREE.Mesh;
  let uniforms: Record<string, THREE.IUniform> = {};

  if (model) {
    const material = new THREE.MeshBasicMaterial({ visible: false });
    mesh = new THREE.Mesh(geometry, material);

    const clone = model.scene.clone();
    clone.scale.setScalar(radius / model.radius);
    mesh.add(clone);
  } else {
    const u = sunData.shader.uniforms;
    uniforms = {
      uTime: { value: 0 },
      uStarColor: { value: new THREE.Vector3(...(u.uStarColor as number[])) },
      uTemperature: { value: u.uTemperature as number },
      uActivityLevel: { value: u.uActivityLevel as number },
      uRotationSpeed: { value: u.uRotationSpeed as number },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: vertSrc,
      fragmentShader: commonSrc + "\n" + fragSrc,
      uniforms,
    });

    mesh = new THREE.Mesh(geometry, material);
  }

  // Point light for illuminating planets
  const light = new THREE.PointLight(
    0xfff0d0,
    SUN_LIGHT_INTENSITY,
    SUN_LIGHT_RANGE,
  );
  light.decay = SUN_LIGHT_DECAY;
  mesh.add(light);

  // Corona glow sprite (additive blended)
  const coronaTexture = createCoronaTexture();
  const coronaMaterial = new THREE.SpriteMaterial({
    map: coronaTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const corona = new THREE.Sprite(coronaMaterial);
  corona.scale.setScalar(radius * 6);
  mesh.add(corona);

  return { mesh, light, uniforms };
}
