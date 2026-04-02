// src/three/scene.ts
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import {
  BACKGROUND_COLOR,
  CAMERA_FOV,
  CAMERA_POSITION_Y,
  CAMERA_POSITION_Z,
  CAMERA_NEAR,
  CAMERA_FAR,
  BLOOM_STRENGTH,
  BLOOM_RADIUS,
  BLOOM_THRESHOLD,
} from "@/lib/constants";

export interface SceneObjects {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  detailLight: THREE.DirectionalLight;
}

export function createScene(canvas: HTMLCanvasElement): SceneObjects {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  // Layered starlight fill so the outer planets stay readable without flattening the scene
  scene.add(new THREE.AmbientLight(0x2a3858, 0.55));

  // Cool sky / warm bounce to keep night sides visible while preserving shape
  scene.add(new THREE.HemisphereLight(0x7f97c8, 0x1f160f, 0.6));

  // Faint distant stellar fill so the sun is not the only light source in the scene
  const galacticFill = new THREE.DirectionalLight(0xa9bfe6, 0.35);
  galacticFill.position.set(-1.5, 0.8, -1.0);
  scene.add(galacticFill);

  const galacticRim = new THREE.DirectionalLight(0x6f86c8, 0.25);
  galacticRim.position.set(1.2, -0.4, 1.5);
  scene.add(galacticRim);

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    CAMERA_NEAR,
    CAMERA_FAR,
  );
  // Start high above for intro swoop — will animate to final position
  camera.position.set(0, 40, 2);
  camera.lookAt(0, 0, 0);

  // Soft camera fill to keep close fly-bys readable without overpowering the sun
  const cameraLight = new THREE.PointLight(0xcad4ff, 0.55, 0);
  cameraLight.decay = 1.5;
  camera.add(cameraLight);
  scene.add(camera); // camera must be in scene graph for its children to render

  // Key light for detail view — starts off, transitions fade it in/out
  const detailLight = new THREE.DirectionalLight(0xffeedd, 0);
  detailLight.position.set(-2, 1.5, 3);
  scene.add(detailLight);

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  );
  composer.addPass(bloomPass);

  return { scene, camera, renderer, composer, detailLight };
}

export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  composer: EffectComposer,
): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
