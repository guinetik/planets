// src/lib/planets.ts

export interface Moon {
  readonly name: string
  readonly orbitRadius: number   // world units, relative to planet radius = 1
  readonly orbitSpeed: number    // radians/second
  readonly size: number          // world units
  readonly orbitTilt: number     // radians
  readonly orbitOffset: number   // initial angle offset, radians
}

export interface Planet {
  readonly id: string
  readonly name: string
  readonly order: number
  readonly accentColor: string
  readonly prose: readonly string[]   // array of paragraphs
  readonly moons: readonly Moon[]
}

export const PLANETS: readonly Planet[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    order: 1,
    accentColor: '#B0A898',
    prose: [
      'It is the smallest of the eight, and the fastest — a world that completes its year in eighty-eight of ours, yet turns so slowly that its day outlasts its year. Mercury does not so much orbit the sun as flee it, racing along an ellipse so eccentric that the sun swells and shrinks visibly in its sky.',
      'The surface is a record of early violence: craters upon craters, cliffs hundreds of kilometres long where the planet\'s crust buckled as the interior cooled and contracted. There is no atmosphere to speak of, no wind to smooth the ancient scars. What the sun strikes blazes at four hundred degrees; what hides in shadow drops to negative one hundred and eighty. No other world spans so extreme a range within a single rotation.',
      'Radar maps have found ice inside permanently shadowed craters at the poles — water that has not seen sunlight in perhaps four billion years, preserved by the same darkness that makes those places the coldest locations in the inner solar system.',
    ],
    moons: [],
  },
  {
    id: 'venus',
    name: 'Venus',
    order: 2,
    accentColor: '#D4B96A',
    prose: [
      'Venus is the planet that went wrong. From the outside it is the most beautiful object in the night sky after the moon — brilliant, steady, arriving before the stars. From the inside it is a furnace: surface pressure ninety times that of Earth\'s atmosphere, temperatures that melt lead, clouds of sulfuric acid cycling endlessly in winds that never stop.',
      'It rotates backwards relative to almost every other body in the solar system, and so slowly that the sun rises in the west and sets in the east over the course of a Venusian day longer than its year. The mechanism behind this retrograde crawl remains debated — a relic of an ancient collision, perhaps, or the tidal drag of that immense atmosphere over geological time.',
      'Beneath the clouds, radar mapping has revealed a world reshaped relatively recently — five hundred million years ago at most, by geological standards almost yesterday. Something reset the surface. The planet exhaled, turned itself inside out, and began again.',
    ],
    moons: [],
  },
  {
    id: 'earth',
    name: 'Earth',
    order: 3,
    accentColor: '#6AA4D4',
    prose: [
      'Seen from the right distance it is unremarkable: a blue marble, third stone from an ordinary star, one of eight in a solar system unremarkable among four hundred billion in this galaxy alone. But it is the one we know from inside, which changes everything.',
      'The atmosphere is a thin, improbable skin — less than two percent of the planet\'s radius — and it is kept in its present chemical state entirely by life. Without biology, the oxygen would vanish into rust and carbonate within a few million years. The sky stays blue because something keeps exhaling.',
      'The Moon is too large for coincidence. It stabilises the axial tilt that gives us seasons rather than chaos. It drives tides that may have stirred the first chemistry. At this moment in geological time it appears, from Earth\'s surface, almost precisely the size of the sun — a coincidence that produces total eclipses, and that will end as the Moon slowly spirals outward, one centimetre per year, away from us.',
    ],
    moons: [
      { name: 'Moon', orbitRadius: 2.4, orbitSpeed: 0.18, size: 0.27, orbitTilt: 0.09, orbitOffset: 0 },
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    order: 4,
    accentColor: '#C87840',
    prose: [
      'It is a cold world, rust-coloured and still, where the wind carves canyons over millennia and frost retreats each morning from the shadows of ancient calderas. The sky at noon is the colour of a bruise — a pale butterscotch haze of iron dust suspended in an atmosphere less than one percent as thick as ours.',
      'Olympus Mons is a volcano three times the height of Everest and wide enough that if you stood at its base, the summit would be below the horizon. Valles Marineris is a canyon system that would span North America. Mars achieves its record scales partly because it has no plate tectonics — volcanism pours into the same spot for billions of years, building without interruption.',
      'Two moons too small to cast a proper shadow: Phobos rises in the west and sets in the east, orbiting so low that the horizon cuts across it. Deimos drifts so slowly it is barely distinguishable from a slow star. Both are probably captured asteroids, and Phobos is spiralling inward — in thirty million years it will either crash into Mars or break apart into a brief, thin ring.',
    ],
    moons: [
      { name: 'Phobos', orbitRadius: 2.0, orbitSpeed: 0.72, size: 0.08, orbitTilt: 0.02, orbitOffset: 0 },
      { name: 'Deimos', orbitRadius: 3.2, orbitSpeed: 0.31, size: 0.05, orbitTilt: 0.06, orbitOffset: 2.1 },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    order: 5,
    accentColor: '#C8A878',
    prose: [
      'Jupiter is not quite a planet in the ordinary sense — it is a failed star, a world so massive that it radiates more heat than it receives from the sun, still contracting slowly from the energy of its own formation four and a half billion years ago. Had it been eighty times heavier it would have ignited.',
      'The Great Red Spot is a storm that has been observed continuously for over three hundred and fifty years. It is currently shrinking; in the time of the first telescopic astronomers it was three times the diameter of Earth. What it will look like in another century is unknown. Beneath it, and beneath all the visible bands and belts, the planet grades without any distinct surface from gas to liquid to metallic hydrogen conducting electricity like a wire, generating a magnetic field fourteen times stronger than Earth\'s.',
      'The four Galilean moons are worlds in themselves. Io is the most volcanically active body in the solar system, resurfaced continuously by tidal heating. Europa conceals a liquid ocean beneath its ice. Ganymede is larger than Mercury. Callisto is a record of four billion years of impacts, unchanged.',
    ],
    moons: [
      { name: 'Io',       orbitRadius: 2.2, orbitSpeed: 0.60, size: 0.16, orbitTilt: 0.00, orbitOffset: 0.0 },
      { name: 'Europa',   orbitRadius: 3.0, orbitSpeed: 0.42, size: 0.14, orbitTilt: 0.01, orbitOffset: 1.6 },
      { name: 'Ganymede', orbitRadius: 4.0, orbitSpeed: 0.28, size: 0.20, orbitTilt: 0.02, orbitOffset: 3.1 },
      { name: 'Callisto', orbitRadius: 5.2, orbitSpeed: 0.18, size: 0.18, orbitTilt: 0.03, orbitOffset: 4.7 },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    order: 6,
    accentColor: '#D4C890',
    prose: [
      'The rings are the first thing anyone notices, and the last thing they forget. They are almost entirely water ice — fragments ranging from grains of frost to boulders the size of houses — arranged into a structure nearly three hundred thousand kilometres wide but averaging only ten metres thick. Seen edge-on they nearly vanish.',
      'Saturn is the least dense planet in the solar system. Given a large enough ocean, it would float. Its winds reach eighteen hundred kilometres per hour at the equator; its poles host persistent hexagonal storm systems whose geometry has no clear explanation. The planet hums with radio emissions; its magnetic field is almost perfectly aligned with its rotation axis, which is itself unusual and unexplained.',
      'Titan is the only moon with a dense atmosphere and the only world other than Earth with stable surface liquids — seas of liquid methane and ethane, fed by methane rain, draining into rivers that flow into hydrocarbon coastlines. Beneath Titan\'s surface, and beneath the smooth ice of Enceladus, liquid water waits in the dark.',
    ],
    moons: [
      { name: 'Titan',     orbitRadius: 4.5, orbitSpeed: 0.14, size: 0.22, orbitTilt: 0.02, orbitOffset: 0.0 },
      { name: 'Enceladus', orbitRadius: 2.8, orbitSpeed: 0.38, size: 0.09, orbitTilt: 0.01, orbitOffset: 2.4 },
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    order: 7,
    accentColor: '#78C8D4',
    prose: [
      'Uranus rolls around the sun on its side, its axis tilted ninety-eight degrees from the plane of its orbit. One pole spends forty-two years in continuous sunlight; the other spends the same period in total darkness. Something struck it long ago, hard enough to knock it sideways, and it has been tipped ever since.',
      'It is the coldest planetary atmosphere in the solar system, despite being closer to the sun than Neptune — a fact that remains unexplained. The methane in its upper atmosphere absorbs red light and reflects blue-green back into space, giving it its characteristic colour. Beneath the gas lies what planetary scientists call an ice giant interior: a dense, hot fluid of water, methane, and ammonia under pressures high enough to produce diamond rain.',
      'Uranus has a faint system of rings, discovered only in 1977 when it passed in front of a star and the starlight winked out before and after the planet itself blocked it. The rings are dark as coal, narrow, and shepherded by small moons. Its larger moons are named for characters from Shakespeare and Pope.',
    ],
    moons: [
      { name: 'Titania', orbitRadius: 3.6, orbitSpeed: 0.22, size: 0.15, orbitTilt: 1.57, orbitOffset: 0.0 },
      { name: 'Oberon',  orbitRadius: 4.6, orbitSpeed: 0.16, size: 0.14, orbitTilt: 1.57, orbitOffset: 2.0 },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    order: 8,
    accentColor: '#5068C8',
    prose: [
      'Neptune was found by mathematics before it was found by telescope. Irregularities in the orbit of Uranus implied something unseen pulling at it from beyond; the position was calculated, the telescope turned, and there it was — exactly where it was predicted to be, in 1846, the first planet discovered by pure prediction.',
      'It is a world of wind. The fastest sustained winds in the solar system move at over two thousand kilometres per hour in Neptune\'s atmosphere, in the opposite direction to the planet\'s rotation. A storm system called the Great Dark Spot, analogous to Jupiter\'s Great Red Spot, was observed by Voyager 2 in 1989 and had disappeared by 1994, replaced by another in the northern hemisphere by 1995. Neptune\'s weather is dynamic in a way that suggests a significant internal heat source, for a world so far from the sun.',
      'Triton orbits backwards. Of all the large moons in the solar system, only Triton revolves in the direction opposite to its planet\'s rotation — a strong indication that it was captured from the outer solar system, perhaps from the same reservoir that gave us Pluto. The tidal forces generated by this retrograde orbit are slowly spiralling Triton inward. In perhaps three and a half billion years it will cross the Roche limit and shatter into a ring.',
    ],
    moons: [
      { name: 'Triton', orbitRadius: 2.8, orbitSpeed: -0.24, size: 0.18, orbitTilt: 0.50, orbitOffset: 0.0 },
    ],
  },
]

export const PLANET_IDS = PLANETS.map(p => p.id)

export function getPlanet(id: string): Planet {
  const planet = PLANETS.find(p => p.id === id)
  if (!planet) throw new Error(`Unknown planet id: ${id}`)
  return planet
}
