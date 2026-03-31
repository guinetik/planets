// src/three/scene.ts
import * as THREE from 'three'
import {
  BACKGROUND_COLOR,
  OVERVIEW_CAMERA_FOV,
  OVERVIEW_CAMERA_Z,
  OVERVIEW_CAMERA_NEAR,
  OVERVIEW_CAMERA_FAR,
} from '@/lib/constants'

export interface SceneObjects {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
}

export function createScene(canvas: HTMLCanvasElement): SceneObjects {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BACKGROUND_COLOR)

  const camera = new THREE.PerspectiveCamera(
    OVERVIEW_CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    OVERVIEW_CAMERA_NEAR,
    OVERVIEW_CAMERA_FAR,
  )
  camera.position.z = OVERVIEW_CAMERA_Z

  return { scene, camera, renderer }
}

export function handleResize(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
