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
 * For Earth, also loads a night texture that shows city lights on the dark side.
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

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
  });

  const texture = textureLoader.load(`/textures/${planetId}.jpg`);
  texture.colorSpace = THREE.SRGBColorSpace;
  material.map = texture;

  const uniforms: Record<string, THREE.IUniform> = {};

  // Earth: city lights on the dark side
  if (planetId === 'earth') {
    const nightTexture = textureLoader.load('/textures/earth-night.jpg');
    nightTexture.colorSpace = THREE.SRGBColorSpace;
    material.emissiveMap = nightTexture;
    material.emissive = new THREE.Color(1, 0.9, 0.7); // warm city light tint

    const lightDirUniform = { value: new THREE.Vector3(1, 0.5, 0.25).normalize() };
    uniforms.uLightDir = lightDirUniform;

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uLightDir = lightDirUniform;
      shader.fragmentShader = 'uniform vec3 uLightDir;\n' + shader.fragmentShader;

      // Compute nightMask early so both diffuse and emissive can use it
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        // Transform world-space light dir to view space to match vNormal
        vec3 lightDirView = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
        float sunFacing = dot(vNormal, lightDirView);
        float nightMask = smoothstep(0.15, -0.25, sunFacing);
        // Fade day texture to black on the dark side
        diffuseColor.rgb *= (1.0 - nightMask * 0.9);
        `
      );

      // Show city lights only on the dark side
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #ifdef USE_EMISSIVEMAP
          vec4 emissiveColor = texture2D(emissiveMap, vEmissiveMapUv);
          totalEmissiveRadiance *= emissiveColor.rgb * nightMask;
        #endif
        `
      );
    };
  }

  const mesh = new THREE.Mesh(geometry, material);
  return { mesh, uniforms };
}
