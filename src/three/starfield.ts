import * as THREE from 'three'
import { STARFIELD_COUNT, STARFIELD_SPREAD, STARFIELD_MIN_SIZE, STARFIELD_MAX_SIZE } from '@/lib/constants'

export function createStarfield(): THREE.Points {
  const positions = new Float32Array(STARFIELD_COUNT * 3)
  const sizes = new Float32Array(STARFIELD_COUNT)

  for (let i = 0; i < STARFIELD_COUNT; i++) {
    const i3 = i * 3
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = STARFIELD_SPREAD * (0.3 + Math.random() * 0.7)
    positions[i3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = r * Math.cos(phi)
    sizes[i] = STARFIELD_MIN_SIZE + Math.random() * (STARFIELD_MAX_SIZE - STARFIELD_MIN_SIZE)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  })

  return new THREE.Points(geometry, material)
}
