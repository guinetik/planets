import * as THREE from 'three'
import type { RingConfig } from '@/lib/planets'
import { SIZE_SCALE, RING_SEGMENTS } from '@/lib/constants'

export function createRingMesh(ringConfig: RingConfig, planetDisplayRadius: number): THREE.Mesh {
  const planetRadius = planetDisplayRadius * SIZE_SCALE
  const innerR = ringConfig.innerRadius * planetRadius
  const outerR = ringConfig.outerRadius * planetRadius

  const geometry = new THREE.RingGeometry(innerR, outerR, RING_SEGMENTS)
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xdcc38c),
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2 + ringConfig.tilt
  return mesh
}
