// src/three/ringMesh.ts
import * as THREE from 'three'
import {
  RING_TUBE_SEGMENTS,
  RING_RADIAL_SEGMENTS,
  RING_TILT_RADIANS,
  RING_INNER_RATIO,
  RING_OUTER_RATIO,
  RING_TUBE_RATIO,
  RING_OPACITY,
} from '@/lib/constants'

export function createRingMesh(accentHex: string, planetRadius: number): THREE.Mesh {
  const avgRadius = ((RING_INNER_RATIO + RING_OUTER_RATIO) / 2) * planetRadius
  const tubeRadius = RING_TUBE_RATIO * planetRadius

  const geometry = new THREE.TorusGeometry(avgRadius, tubeRadius, RING_RADIAL_SEGMENTS, RING_TUBE_SEGMENTS)
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentHex),
    transparent: true,
    opacity: RING_OPACITY,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = RING_TILT_RADIANS
  return mesh
}
