import * as THREE from 'three'
import vertSrc from './shaders/sphere.vert.glsl?raw'
import commonSrc from './shaders/common.glsl?raw'
import fragSrc from './shaders/star.frag.glsl?raw'
import type { SunData } from '@/lib/planets'
import { SPHERE_SEGMENTS, SIZE_SCALE, SUN_LIGHT_INTENSITY, SUN_LIGHT_RANGE } from '@/lib/constants'

export interface SunObjects {
  mesh: THREE.Mesh
  light: THREE.PointLight
  uniforms: Record<string, THREE.IUniform>
}

export function createSunMesh(sunData: SunData): SunObjects {
  const radius = sunData.displayRadius * SIZE_SCALE
  const u = sunData.shader.uniforms

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uStarColor: { value: new THREE.Vector3(...(u.uStarColor as number[])) },
    uTemperature: { value: u.uTemperature as number },
    uActivityLevel: { value: u.uActivityLevel as number },
    uRotationSpeed: { value: u.uRotationSpeed as number },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: commonSrc + '\n' + fragSrc,
    uniforms,
  })

  const geometry = new THREE.SphereGeometry(radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS)
  const mesh = new THREE.Mesh(geometry, material)

  const light = new THREE.PointLight(0xfff0d0, SUN_LIGHT_INTENSITY, SUN_LIGHT_RANGE)
  mesh.add(light)

  return { mesh, light, uniforms }
}
