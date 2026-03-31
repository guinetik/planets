import { describe, it, expect } from 'vitest';
import {
  solveKeplerEquation,
  meanAnomaly,
  trueAnomalyFromEccentric,
  keplerRadius,
  orbitalPosition3D,
  orbitPathPoints,
  type OrbitalElements,
} from './kepler';

const TWO_PI = 2 * Math.PI;

// ---------------------------------------------------------------------------
// solveKeplerEquation
// ---------------------------------------------------------------------------
describe('solveKeplerEquation', () => {
  it('circular orbit (e=0) returns M unchanged', () => {
    const M = 1.23;
    expect(solveKeplerEquation(M, 0)).toBe(M);
  });

  it('M=0 always returns E=0', () => {
    expect(solveKeplerEquation(0, 0.5)).toBeCloseTo(0, 10);
  });

  it('satisfies M = E - e*sin(E) for Mercury eccentricity (e=0.2056)', () => {
    const e = 0.2056;
    const M = 1.0;
    const E = solveKeplerEquation(M, e);
    expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
  });

  it('satisfies Kepler equation for moderate eccentricity (e=0.5)', () => {
    const e = 0.5;
    const M = 2.5;
    const E = solveKeplerEquation(M, e);
    expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
  });

  it('satisfies Kepler equation for high eccentricity (e=0.9)', () => {
    const e = 0.9;
    const M = 0.5;
    const E = solveKeplerEquation(M, e);
    expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
  });

  it('converges across the full [0, 2π] range for high eccentricity', () => {
    const e = 0.9;
    for (let k = 0; k <= 8; k++) {
      const M = (k / 8) * TWO_PI;
      const E = solveKeplerEquation(M, e);
      expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
    }
  });
});

// ---------------------------------------------------------------------------
// meanAnomaly
// ---------------------------------------------------------------------------
describe('meanAnomaly', () => {
  it('returns 0 at epoch (t = epoch)', () => {
    expect(meanAnomaly(365, 100, 100)).toBeCloseTo(0, 10);
  });

  it('returns 2π after one full period', () => {
    expect(meanAnomaly(365, 365, 0)).toBeCloseTo(TWO_PI, 10);
  });

  it('uses epoch=0 by default', () => {
    expect(meanAnomaly(365, 365)).toBeCloseTo(TWO_PI, 10);
  });

  it('returns π at half period', () => {
    expect(meanAnomaly(100, 50, 0)).toBeCloseTo(Math.PI, 10);
  });

  it('handles non-zero epoch offset correctly', () => {
    // t=200, epoch=100, period=100  → (200-100)/100 = 1 → 2π
    expect(meanAnomaly(100, 200, 100)).toBeCloseTo(TWO_PI, 10);
  });
});

// ---------------------------------------------------------------------------
// trueAnomalyFromEccentric
// ---------------------------------------------------------------------------
describe('trueAnomalyFromEccentric', () => {
  it('circular orbit (e=0) returns E unchanged', () => {
    const E = 1.5;
    expect(trueAnomalyFromEccentric(E, 0)).toBe(E);
  });

  it('E=0 → ν=0 for any eccentricity', () => {
    expect(trueAnomalyFromEccentric(0, 0.5)).toBeCloseTo(0, 10);
  });

  it('E=π → ν=π (apoapsis is symmetric)', () => {
    expect(trueAnomalyFromEccentric(Math.PI, 0.5)).toBeCloseTo(Math.PI, 10);
  });

  it('true anomaly exceeds eccentric anomaly for 0 < E < π when e > 0', () => {
    // For a non-circular orbit the planet moves faster near periapsis,
    // so ν > E in the first half of the orbit.
    const E = 1.0;
    const nu = trueAnomalyFromEccentric(E, 0.5);
    expect(nu).toBeGreaterThan(E);
  });

  it('round-trips: E=π/4 with e=0.2056 satisfies the half-angle formula', () => {
    const E = Math.PI / 4;
    const e = 0.2056;
    const nu = trueAnomalyFromEccentric(E, e);
    // Verify using the standard identity directly
    const expected = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    );
    expect(nu).toBeCloseTo(expected, 12);
  });
});

// ---------------------------------------------------------------------------
// keplerRadius
// ---------------------------------------------------------------------------
describe('keplerRadius', () => {
  it('circular orbit (e=0) always returns a', () => {
    expect(keplerRadius(1.0, 0, 0)).toBe(1.0);
    expect(keplerRadius(1.0, 0, Math.PI)).toBe(1.0);
    expect(keplerRadius(1.0, 0, 1.234)).toBe(1.0);
  });

  it('periapsis (ν=0) = a(1-e)', () => {
    const a = 1.0;
    const e = 0.5;
    expect(keplerRadius(a, e, 0)).toBeCloseTo(a * (1 - e), 10);
  });

  it('apoapsis (ν=π) = a(1+e)', () => {
    const a = 1.0;
    const e = 0.5;
    expect(keplerRadius(a, e, Math.PI)).toBeCloseTo(a * (1 + e), 10);
  });

  it('periapsis < apoapsis for e > 0', () => {
    const a = 1.5;
    const e = 0.3;
    const rPeri = keplerRadius(a, e, 0);
    const rApo = keplerRadius(a, e, Math.PI);
    expect(rPeri).toBeLessThan(rApo);
  });

  it('satisfies conic section equation r = a(1-e²)/(1+e·cos ν)', () => {
    const a = 2.0;
    const e = 0.4;
    const nu = 1.2;
    const expected = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    expect(keplerRadius(a, e, nu)).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// orbitalPosition3D
// ---------------------------------------------------------------------------
describe('orbitalPosition3D', () => {
  const circularEcliptic: OrbitalElements = {
    semiMajorAxis: 1,
    eccentricity: 0,
    inclination: 0,
    longitudeOfAscendingNode: 0,
    argumentOfPeriapsis: 0,
    period: 1,
    epoch: 0,
  };

  it('zero inclination at t=0 (periapsis): position on +x axis, z=0', () => {
    const pos = orbitalPosition3D(circularEcliptic, 0);
    expect(pos.x).toBeCloseTo(1, 8);
    expect(pos.y).toBeCloseTo(0, 8);
    expect(pos.z).toBeCloseTo(0, 8);
  });

  it('zero inclination at t=period/4: position on +y axis, z=0', () => {
    const pos = orbitalPosition3D(circularEcliptic, 0.25);
    expect(pos.x).toBeCloseTo(0, 8);
    expect(pos.y).toBeCloseTo(1, 8);
    expect(pos.z).toBeCloseTo(0, 8);
  });

  it('circular ecliptic orbit: radius equals semiMajorAxis at all times', () => {
    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      const p = orbitalPosition3D(circularEcliptic, t);
      const r = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2);
      expect(r).toBeCloseTo(1, 8);
    }
  });

  it('inclined orbit (i=π/2) produces non-zero z-component away from nodes', () => {
    const inclined: OrbitalElements = {
      semiMajorAxis: 1,
      eccentricity: 0,
      inclination: Math.PI / 2,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      period: 1,
      epoch: 0,
    };
    // At t=0.25 (quarter orbit) the body should be off the ecliptic plane
    const pos = orbitalPosition3D(inclined, 0.25);
    expect(Math.abs(pos.z)).toBeGreaterThan(0.5);
  });

  it('respects epoch: same position at t=epoch as at t=0 with epoch=0', () => {
    const withEpoch: OrbitalElements = { ...circularEcliptic, epoch: 42 };
    const p1 = orbitalPosition3D(circularEcliptic, 0);
    const p2 = orbitalPosition3D(withEpoch, 42);
    expect(p1.x).toBeCloseTo(p2.x, 8);
    expect(p1.y).toBeCloseTo(p2.y, 8);
    expect(p1.z).toBeCloseTo(p2.z, 8);
  });

  it('elliptical orbit radius at periapsis equals a(1-e)', () => {
    const elliptic: OrbitalElements = {
      semiMajorAxis: 2,
      eccentricity: 0.5,
      inclination: 0,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      period: 1,
      epoch: 0,
    };
    const pos = orbitalPosition3D(elliptic, 0);
    const r = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    // At t=0, M=0 → E=0 → ν=0 → periapsis
    expect(r).toBeCloseTo(2 * (1 - 0.5), 8);
  });
});

// ---------------------------------------------------------------------------
// orbitPathPoints
// ---------------------------------------------------------------------------
describe('orbitPathPoints', () => {
  const circularEcliptic: OrbitalElements = {
    semiMajorAxis: 1,
    eccentricity: 0,
    inclination: 0,
    longitudeOfAscendingNode: 0,
    argumentOfPeriapsis: 0,
    period: 1,
  };

  it('returns the requested number of points (default 128)', () => {
    const pts = orbitPathPoints(circularEcliptic);
    expect(pts).toHaveLength(128);
  });

  it('returns the requested number of points when overridden', () => {
    const pts = orbitPathPoints(circularEcliptic, 64);
    expect(pts).toHaveLength(64);
  });

  it('circular ecliptic orbit: all points at radius = semiMajorAxis', () => {
    const pts = orbitPathPoints(circularEcliptic, 64);
    for (const p of pts) {
      const r = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2);
      expect(r).toBeCloseTo(1, 8);
    }
  });

  it('circular ecliptic orbit: all z-components are zero', () => {
    const pts = orbitPathPoints(circularEcliptic, 32);
    for (const p of pts) {
      expect(p.z).toBeCloseTo(0, 10);
    }
  });

  it('elliptical orbit: min radius = a(1-e), max radius = a(1+e)', () => {
    const a = 2;
    const e = 0.5;
    const elliptic: OrbitalElements = {
      semiMajorAxis: a,
      eccentricity: e,
      inclination: 0,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      period: 1,
    };
    const pts = orbitPathPoints(elliptic, 256);
    const radii = pts.map(p => Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2));
    const rMin = Math.min(...radii);
    const rMax = Math.max(...radii);
    expect(rMin).toBeCloseTo(a * (1 - e), 4);
    expect(rMax).toBeCloseTo(a * (1 + e), 4);
  });

  it('each point has x, y, z properties', () => {
    const pts = orbitPathPoints(circularEcliptic, 4);
    for (const p of pts) {
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
      expect(typeof p.z).toBe('number');
    }
  });

  it('inclined orbit (i=π/2): points span non-zero z range', () => {
    const inclined: OrbitalElements = {
      semiMajorAxis: 1,
      eccentricity: 0,
      inclination: Math.PI / 2,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      period: 1,
    };
    const pts = orbitPathPoints(inclined, 64);
    const zMax = Math.max(...pts.map(p => Math.abs(p.z)));
    expect(zMax).toBeGreaterThan(0.9);
  });
});
