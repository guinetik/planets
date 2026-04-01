// src/lib/planets.ts

import type { OrbitalElements } from "./kepler";

const DEG = Math.PI / 180;

export type ShaderType = "star" | "rockyPlanet" | "gasGiant";

export interface ShaderConfig {
  readonly type: ShaderType;
  readonly uniforms: Record<string, number | number[]>;
}

export interface Moon {
  readonly name: string;
  readonly orbit: OrbitalElements;
  readonly displayRadius: number;
  readonly shader: ShaderConfig;
  readonly rotationSpeed: number; // rad/day (simTime units). 0 = tidally locked (no self-spin)
}

export interface Planet {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly accentColor: string;
  readonly orbit: OrbitalElements;
  readonly displayRadius: number;
  readonly shader: ShaderConfig;
  readonly moons: readonly Moon[];
  readonly prose: readonly string[];
  readonly rotationSpeed: number; // rad/day. Negative = retrograde (Venus, Uranus)
  readonly axialTilt: number; // radians — tilt of spin axis from orbital plane normal
}

export interface SunData {
  readonly name: string;
  readonly displayRadius: number;
  readonly shader: ShaderConfig;
  readonly rotationSpeed: number;
}

export const SUN: SunData = {
  name: "Sun",
  displayRadius: 0.045,
  rotationSpeed: 0.2474, // 25.4 day period
  shader: {
    type: "star",
    uniforms: {
      uStarColor: [1.0, 0.85, 0.4],
      uTemperature: 5778,
      uActivityLevel: 0.4,
      uRotationSpeed: 0.3,
    },
  },
};

export const PLANETS: readonly Planet[] = [
  {
    id: "mercury",
    name: "Mercury",
    order: 1,
    accentColor: "#B0A898",
    orbit: {
      semiMajorAxis: 110,
      eccentricity: 0.2056,
      inclination: 7.005 * DEG,
      longitudeOfAscendingNode: 48.331 * DEG,
      argumentOfPeriapsis: 29.124 * DEG,
      period: 87.97,
    },
    displayRadius: 0.0044,
    axialTilt: 0.034 * DEG, // ~0.03°
    rotationSpeed: 0.1071, // 58.6 day period — very slow
    shader: {
      type: "rockyPlanet",
      uniforms: {
        uBaseColor: [0.55, 0.52, 0.5],
        uHasAtmosphere: 0.0,
        uSeed: 1.0,
      },
    },
    moons: [],
    prose: [
      "It is the smallest of the eight, and the fastest — a world that completes its year in eighty-eight of ours, yet turns so slowly that its day outlasts its year. Mercury does not so much orbit the sun as flee it, racing along an ellipse so eccentric that the sun swells and shrinks visibly in its sky.",
      "The surface is a record of early violence: craters upon craters, cliffs hundreds of kilometres long where the planet's crust buckled as the interior cooled and contracted. There is no atmosphere to speak of, no wind to smooth the ancient scars. What the sun strikes blazes at four hundred degrees; what hides in shadow drops to negative one hundred and eighty.",
      "Radar maps have found ice inside permanently shadowed craters at the poles — water that has not seen sunlight in perhaps four billion years, preserved by the same darkness that makes those places the coldest locations in the inner solar system.",
    ],
  },
  {
    id: "venus",
    name: "Venus",
    order: 2,
    accentColor: "#D4B96A",
    orbit: {
      semiMajorAxis: 170,
      eccentricity: 0.0068,
      inclination: 3.395 * DEG,
      longitudeOfAscendingNode: 76.68 * DEG,
      argumentOfPeriapsis: 54.884 * DEG,
      period: 224.7,
    },
    displayRadius: 0.0066,
    axialTilt: 177.4 * DEG, // ~177° (nearly upside-down)
    rotationSpeed: -0.0259, // 243 day period, RETROGRADE
    shader: {
      type: "rockyPlanet",
      uniforms: {
        uBaseColor: [0.85, 0.65, 0.3],
        uHasAtmosphere: 1.0,
        uSeed: 2.0,
      },
    },
    moons: [],
    prose: [
      "Venus is the planet that went wrong. From the outside it is the most beautiful object in the night sky after the moon — brilliant, steady, arriving before the stars. From the inside it is a furnace: surface pressure ninety times that of Earth's atmosphere, temperatures that melt lead, clouds of sulfuric acid cycling endlessly in winds that never stop.",
      "It rotates backwards relative to almost every other body in the solar system, and so slowly that the sun rises in the west and sets in the east over the course of a Venusian day longer than its year. The mechanism behind this retrograde crawl remains debated — a relic of an ancient collision, perhaps, or the tidal drag of that immense atmosphere over geological time.",
      "Beneath the clouds, radar mapping has revealed a world reshaped relatively recently — five hundred million years ago at most, by geological standards almost yesterday. Something reset the surface. The planet exhaled, turned itself inside out, and began again.",
    ],
  },
  {
    id: "earth",
    name: "Earth",
    order: 3,
    accentColor: "#6AA4D4",
    orbit: {
      semiMajorAxis: 240,
      eccentricity: 0.0167,
      inclination: 0.0,
      longitudeOfAscendingNode: 0.0,
      argumentOfPeriapsis: 102.937 * DEG,
      period: 365.25,
    },
    displayRadius: 0.0077,
    axialTilt: 23.44 * DEG, // ~23.4°
    rotationSpeed: 6.3002, // ~1 day period
    shader: {
      type: "rockyPlanet",
      uniforms: {
        uBaseColor: [0.2, 0.4, 0.8],
        uHasAtmosphere: 1.0,
        uSeed: 3.0,
      },
    },
    moons: [
      {
        name: "Moon",
        orbit: {
          semiMajorAxis: 9,
          eccentricity: 0.0549,
          inclination: 5.145 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 27.32,
        },
        displayRadius: 0.0021, // ~27% of Earth (realistic)
        rotationSpeed: 0.23, // tidally locked (27.32d)
        shader: {
          type: "rockyPlanet",
          uniforms: {
            uBaseColor: [0.7, 0.7, 0.7],
            uHasAtmosphere: 0.0,
            uSeed: 10.0,
          },
        },
      },
    ],
    prose: [
      "Seen from the right distance it is unremarkable: a blue marble, third stone from an ordinary star, one of eight in a solar system unremarkable among four hundred billion in this galaxy alone. But it is the one we know from inside, which changes everything.",
      "The atmosphere is a thin, improbable skin — less than two percent of the planet's radius — and it is kept in its present chemical state entirely by life. Without biology, the oxygen would vanish into rust and carbonate within a few million years. The sky stays blue because something keeps exhaling.",
      "The Moon is too large for coincidence. It stabilises the axial tilt that gives us seasons rather than chaos. It drives tides that may have stirred the first chemistry. At this moment in geological time it appears, from Earth's surface, almost precisely the size of the sun — a coincidence that produces total eclipses.",
    ],
  },
  {
    id: "mars",
    name: "Mars",
    order: 4,
    accentColor: "#C87840",
    orbit: {
      semiMajorAxis: 320,
      eccentricity: 0.0934,
      inclination: 1.85 * DEG,
      longitudeOfAscendingNode: 49.558 * DEG,
      argumentOfPeriapsis: 286.502 * DEG,
      period: 686.97,
    },
    displayRadius: 0.0055,
    axialTilt: 25.19 * DEG, // ~25°
    rotationSpeed: 6.124, // 1.03 day period — similar to Earth
    shader: {
      type: "rockyPlanet",
      uniforms: {
        uBaseColor: [0.75, 0.35, 0.15],
        uHasAtmosphere: 0.0,
        uSeed: 4.0,
      },
    },
    moons: [
      {
        name: "Phobos",
        orbit: {
          semiMajorAxis: 7,
          eccentricity: 0.0151,
          inclination: 1.093 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 0.319, // ~7.7 hours
        },
        displayRadius: 0.0008,
        rotationSpeed: 19.6937, // tidally locked
        shader: {
          type: "rockyPlanet",
          uniforms: {
            uBaseColor: [0.55, 0.45, 0.35],
            uHasAtmosphere: 0.0,
            uSeed: 13.0,
          },
        },
      },
      {
        name: "Deimos",
        orbit: {
          semiMajorAxis: 12,
          eccentricity: 0.0002,
          inclination: 0.93 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 1.263, // ~30.3 hours
        },
        displayRadius: 0.0005,
        rotationSpeed: 4.9745, // tidally locked
        shader: {
          type: "rockyPlanet",
          uniforms: {
            uBaseColor: [0.5, 0.42, 0.33],
            uHasAtmosphere: 0.0,
            uSeed: 14.0,
          },
        },
      },
    ],
    prose: [
      "It is a cold world, rust-coloured and still, where the wind carves canyons over millennia and frost retreats each morning from the shadows of ancient calderas. The sky at noon is the colour of a bruise — a pale butterscotch haze of iron dust suspended in an atmosphere less than one percent as thick as ours.",
      "Olympus Mons is a volcano three times the height of Everest and wide enough that if you stood at its base, the summit would be below the horizon. Valles Marineris is a canyon system that would span North America. Mars achieves its record scales partly because it has no plate tectonics — volcanism pours into the same spot for billions of years, building without interruption.",
      "Two moons too small to cast a proper shadow: Phobos rises in the west and sets in the east, orbiting so low that the horizon cuts across it. Deimos drifts so slowly it is barely distinguishable from a slow star. Both are probably captured asteroids, and Phobos is spiralling inward.",
    ],
  },
  {
    id: "jupiter",
    name: "Jupiter",
    order: 5,
    accentColor: "#C8A878",
    orbit: {
      semiMajorAxis: 460,
      eccentricity: 0.0489,
      inclination: 1.303 * DEG,
      longitudeOfAscendingNode: 100.464 * DEG,
      argumentOfPeriapsis: 273.867 * DEG,
      period: 4332.59,
    },
    displayRadius: 0.0165,
    axialTilt: 3.13 * DEG, // ~3°
    rotationSpeed: 15.1951, // 0.41 day period — fastest spinner
    shader: {
      type: "gasGiant",
      uniforms: {
        uBaseColor: [0.85, 0.65, 0.45],
        uSeed: 42.0,
        uStormIntensity: 0.7,
        uRotationSpeed: 1.2,
      },
    },
    moons: [
      {
        name: "Io",
        orbit: {
          semiMajorAxis: 18,
          eccentricity: 0.0041,
          inclination: 0.036 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 1.769,
        },
        displayRadius: 0.0018, // ~11% of Jupiter (realistic)
        rotationSpeed: 3.5518, // tidally locked (1.77d)
        shader: {
          type: "rockyPlanet",
          uniforms: {
            uBaseColor: [0.9, 0.85, 0.35],
            uHasAtmosphere: 0.0,
            uSeed: 11.0,
          },
        },
      },
      {
        name: "Europa",
        orbit: {
          semiMajorAxis: 22,
          eccentricity: 0.0094,
          inclination: 0.47 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 3.551,
        },
        displayRadius: 0.0015,
        rotationSpeed: 1.769, // tidally locked (3.55d)
        shader: {
          type: "rockyPlanet",
          uniforms: {
            uBaseColor: [0.78, 0.72, 0.62],
            uHasAtmosphere: 0.0,
            uSeed: 17.0,
          },
        },
      },
      {
        name: "Callisto",
        orbit: {
          semiMajorAxis: 28,
          eccentricity: 0.0074,
          inclination: 0.192 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 16.689,
        },
        displayRadius: 0.0022,
        rotationSpeed: 0.3764, // tidally locked (16.7d)
        shader: {
          type: "rockyPlanet",
          uniforms: {
            uBaseColor: [0.4, 0.35, 0.3],
            uHasAtmosphere: 0.0,
            uSeed: 16.0,
          },
        },
      },
    ],
    prose: [
      "Jupiter is not quite a planet in the ordinary sense — it is a failed star, a world so massive that it radiates more heat than it receives from the sun, still contracting slowly from the energy of its own formation four and a half billion years ago. Had it been eighty times heavier it would have ignited.",
      "The Great Red Spot is a storm that has been observed continuously for over three hundred and fifty years. It is currently shrinking; in the time of the first telescopic astronomers it was three times the diameter of Earth. Beneath it, and beneath all the visible bands and belts, the planet grades without any distinct surface from gas to liquid to metallic hydrogen conducting electricity like a wire.",
      "The four Galilean moons are worlds in themselves. Io is the most volcanically active body in the solar system, resurfaced continuously by tidal heating. Europa conceals a liquid ocean beneath its ice. Ganymede is larger than Mercury. Callisto is a record of four billion years of impacts, unchanged.",
    ],
  },
  {
    id: "saturn",
    name: "Saturn",
    order: 6,
    accentColor: "#D4C890",
    orbit: {
      semiMajorAxis: 680,
      eccentricity: 0.0565,
      inclination: 2.485 * DEG,
      longitudeOfAscendingNode: 113.665 * DEG,
      argumentOfPeriapsis: 339.392 * DEG,
      period: 10759.22,
    },
    displayRadius: 0.025,
    axialTilt: 26.73 * DEG, // ~27°
    rotationSpeed: 14.1513, // 0.44 day period — fast spinner
    shader: {
      type: "gasGiant",
      uniforms: {
        uBaseColor: [0.85, 0.75, 0.5],
        uSeed: 99.0,
        uStormIntensity: 0.3,
        uRotationSpeed: 1.0,
      },
    },
    moons: [
      {
        name: "Titan",
        orbit: {
          semiMajorAxis: 22,
          eccentricity: 0.0288,
          inclination: 0.33 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 15.945,
        },
        displayRadius: 0.0025, // ~19% of Saturn (realistic)
        rotationSpeed: 0.3941, // tidally locked (15.9d)
        shader: {
          type: "rockyPlanet",
          uniforms: {
            uBaseColor: [0.85, 0.7, 0.4],
            uHasAtmosphere: 1.0,
            uSeed: 12.0,
          },
        },
      },
      {
        name: "Enceladus",
        orbit: {
          semiMajorAxis: 16,
          eccentricity: 0.0047,
          inclination: 0.009 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 1.37,
        },
        displayRadius: 0.0008,
        rotationSpeed: 4.5867, // tidally locked (1.37d)
        shader: {
          type: "rockyPlanet",
          uniforms: {
            uBaseColor: [0.92, 0.93, 0.95],
            uHasAtmosphere: 0.0,
            uSeed: 15.0,
          },
        },
      },
    ],
    prose: [
      "The rings are the first thing anyone notices, and the last thing they forget. They are almost entirely water ice — fragments ranging from grains of frost to boulders the size of houses — arranged into a structure nearly three hundred thousand kilometres wide but averaging only ten metres thick. Seen edge-on they nearly vanish.",
      "Saturn is the least dense planet in the solar system. Given a large enough ocean, it would float. Its winds reach eighteen hundred kilometres per hour at the equator; its poles host persistent hexagonal storm systems whose geometry has no clear explanation.",
      "Titan is the only moon with a dense atmosphere and the only world other than Earth with stable surface liquids — seas of liquid methane and ethane, fed by methane rain, draining into rivers that flow into hydrocarbon coastlines. Beneath Titan's surface, and beneath the smooth ice of Enceladus, liquid water waits in the dark.",
    ],
  },
  {
    id: "uranus",
    name: "Uranus",
    order: 7,
    accentColor: "#78C8D4",
    orbit: {
      semiMajorAxis: 900,
      eccentricity: 0.0457,
      inclination: 0.773 * DEG,
      longitudeOfAscendingNode: 74.006 * DEG,
      argumentOfPeriapsis: 96.998 * DEG,
      period: 30688.5,
    },
    displayRadius: 0.011,
    axialTilt: 97.77 * DEG, // ~98° — rotates on its side
    rotationSpeed: -8.7965, // 0.72 day period, RETROGRADE
    shader: {
      type: "gasGiant",
      uniforms: {
        uBaseColor: [0.55, 0.75, 0.85],
        uSeed: 77.0,
        uStormIntensity: 0.1,
        uRotationSpeed: 0.6,
      },
    },
    moons: [],
    prose: [
      "Uranus rolls around the sun on its side, its axis tilted ninety-eight degrees from the plane of its orbit. One pole spends forty-two years in continuous sunlight; the other spends the same period in total darkness. Something struck it long ago, hard enough to knock it sideways, and it has been tipped ever since.",
      "It is the coldest planetary atmosphere in the solar system, despite being closer to the sun than Neptune — a fact that remains unexplained. The methane in its upper atmosphere absorbs red light and reflects blue-green back into space, giving it its characteristic colour. Beneath the gas lies a dense, hot fluid of water, methane, and ammonia under pressures high enough to produce diamond rain.",
      "Uranus has a faint system of rings, discovered only in 1977 when it passed in front of a star and the starlight winked out before and after the planet itself blocked it. The rings are dark as coal, narrow, and shepherded by small moons. Its larger moons are named for characters from Shakespeare and Pope.",
    ],
  },
  {
    id: "neptune",
    name: "Neptune",
    order: 8,
    accentColor: "#5068C8",
    orbit: {
      semiMajorAxis: 1120,
      eccentricity: 0.0113,
      inclination: 1.77 * DEG,
      longitudeOfAscendingNode: 131.784 * DEG,
      argumentOfPeriapsis: 276.336 * DEG,
      period: 60182.0,
    },
    displayRadius: 0.0099,
    axialTilt: 28.32 * DEG, // ~28°
    rotationSpeed: 9.3625, // 0.67 day period
    shader: {
      type: "gasGiant",
      uniforms: {
        uBaseColor: [0.25, 0.35, 0.75],
        uSeed: 55.0,
        uStormIntensity: 0.5,
        uRotationSpeed: 0.8,
      },
    },
    moons: [],
    prose: [
      "Neptune was found by mathematics before it was found by telescope. Irregularities in the orbit of Uranus implied something unseen pulling at it from beyond; the position was calculated, the telescope turned, and there it was — exactly where it was predicted to be, in 1846, the first planet discovered by pure prediction.",
      "It is a world of wind. The fastest sustained winds in the solar system move at over two thousand kilometres per hour in Neptune's atmosphere, in the opposite direction to the planet's rotation. Neptune's weather is dynamic in a way that suggests a significant internal heat source, for a world so far from the sun.",
      "Triton orbits backwards. Of all the large moons in the solar system, only Triton revolves in the direction opposite to its planet's rotation — a strong indication that it was captured from the outer solar system, perhaps from the same reservoir that gave us Pluto. In perhaps three and a half billion years it will cross the Roche limit and shatter into a ring.",
    ],
  },
];

export const PLANET_IDS = PLANETS.map((p) => p.id);

export function getPlanet(id: string): Planet {
  const planet = PLANETS.find((p) => p.id === id);
  if (!planet) throw new Error(`Unknown planet id: ${id}`);
  return planet;
}
