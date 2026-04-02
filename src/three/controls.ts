// src/three/controls.ts
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RAYCAST_HOVER_SCALE, RAYCAST_HOVER_TRANSITION_S } from '@/lib/constants'
import gsap from 'gsap'

export function createOrbitControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.03
  controls.minDistance = 2
  controls.maxDistance = 60
  controls.maxPolarAngle = Math.PI * 0.85
  controls.minPolarAngle = Math.PI * 0.05
  controls.zoomSpeed = 0.5
  controls.rotateSpeed = 0.4
  return controls
}

export function createRaycaster(
  camera: THREE.PerspectiveCamera,
  meshes: THREE.Mesh[],
  idMap: Map<THREE.Mesh, string>,
  onHover: (id: string | null) => void,
  onPlanetClick: (id: string) => void,
): () => void {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let hoveredMesh: THREE.Mesh | null = null

  function onMouseMove(event: MouseEvent): void {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(meshes)
    const hit = hits.length > 0 ? (hits[0].object as THREE.Mesh) : null

    if (hit !== hoveredMesh) {
      if (hoveredMesh) {
        gsap.to(hoveredMesh.scale, { x: 1, y: 1, z: 1, duration: RAYCAST_HOVER_TRANSITION_S })
      }
      if (hit) {
        gsap.to(hit.scale, {
          x: RAYCAST_HOVER_SCALE,
          y: RAYCAST_HOVER_SCALE,
          z: RAYCAST_HOVER_SCALE,
          duration: RAYCAST_HOVER_TRANSITION_S,
        })
        onHover(idMap.get(hit) ?? null)
      } else {
        onHover(null)
      }
      hoveredMesh = hit
    }
  }

  function onClickEvent(event: MouseEvent): void {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(meshes)
    if (hits.length > 0) {
      const id = idMap.get(hits[0].object as THREE.Mesh)
      if (id) onPlanetClick(id)
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('click', onClickEvent)

  return () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('click', onClickEvent)
  }
}
