import { describe, it, expect } from 'vitest'
import { orbitPosition, moonOrbitAngle } from './orbit'

describe('orbitPosition', () => {
  it('places object at (radius, 0, 0) when angle=0 and tilt=0', () => {
    const pos = orbitPosition(5, 0, 0)
    expect(pos.x).toBeCloseTo(5)
    expect(pos.y).toBeCloseTo(0)
    expect(pos.z).toBeCloseTo(0)
  })

  it('places object at (0, 0, -radius) when angle=PI/2 and tilt=0', () => {
    const pos = orbitPosition(5, Math.PI / 2, 0)
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(0)
    expect(pos.z).toBeCloseTo(-5)
  })

  it('applies tilt by rotating the orbit plane around the x-axis', () => {
    const pos = orbitPosition(5, Math.PI / 2, Math.PI / 2)
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(5)
    expect(pos.z).toBeCloseTo(0)
  })

  it('returns origin for radius=0', () => {
    const pos = orbitPosition(0, 1.23, 0.5)
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(0)
    expect(pos.z).toBeCloseTo(0)
  })
})

describe('moonOrbitAngle', () => {
  it('returns offset when time=0', () => {
    expect(moonOrbitAngle(0.5, 0, 1.2)).toBeCloseTo(1.2)
  })

  it('advances by speed * time', () => {
    expect(moonOrbitAngle(0.5, 4, 0)).toBeCloseTo(2.0)
  })

  it('supports negative speed (retrograde orbit)', () => {
    expect(moonOrbitAngle(-0.3, 2, 0)).toBeCloseTo(-0.6)
  })
})
