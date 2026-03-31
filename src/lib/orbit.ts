export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/**
 * Computes a position on a circular orbit in the XZ plane, tilted around X.
 * angle=0 places the object at (radius, 0, 0).
 * tilt rotates the orbit plane around the X axis.
 */
export function orbitPosition(radius: number, angle: number, tilt: number): Vec3 {
  const flatX = radius * Math.cos(angle)
  const flatZ = radius * Math.sin(angle)
  return {
    x: flatX,
    y: flatZ * Math.sin(tilt),
    z: -flatZ * Math.cos(tilt),
  }
}

/**
 * Returns the current orbit angle for a moon given its speed, elapsed time, and initial offset.
 * Negative speed = retrograde orbit.
 */
export function moonOrbitAngle(speed: number, time: number, offset: number): number {
  return speed * time + offset
}
