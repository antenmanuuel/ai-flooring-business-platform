import { useId } from 'react'

// Small seeded random generator so each swatch looks the same on every render.
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function hashString(str) {
  let h = 0
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

// texture: a material's texture object from data/materials.js
// seed:    any stable string (e.g. the material id) so the pattern doesn't change between renders
// label:   material name, used for the accessible label
function MaterialSwatch({ texture, seed, label }) {
  // useId can contain characters that break url(#id) references, so strip them.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const rand = seededRandom(hashString(seed))

  let content
  if (texture.kind === 'plank') content = <Planks id={id} rand={rand} colors={texture.colors} />
  else if (texture.kind === 'tile') content = <Tiles id={id} rand={rand} {...texture} />
  else content = <Carpet id={id} base={texture.base} />

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      role="img"
      aria-label={`${label} sample`}
    >
      {content}
    </svg>
  )
}

function Planks({ id, rand, colors }) {
  const columns = 4
  const width = 100 / columns
  const planks = []
  const joints = []

  for (let col = 0; col < columns; col++) {
    let y = -rand() * 60
    while (y < 100) {
      const length = 45 + rand() * 45
      const fill = colors[Math.floor(rand() * colors.length)]
      planks.push(<rect key={`${col}-${y}`} x={col * width} y={y} width={width} height={length} fill={fill} />)
      joints.push(
        <line
          key={`j${col}-${y}`}
          x1={col * width}
          x2={(col + 1) * width}
          y1={y + length}
          y2={y + length}
          stroke="#000"
          strokeOpacity="0.3"
          strokeWidth="0.4"
        />,
      )
      y += length
    }
  }

  return (
    <>
      <defs>
        <filter id={`grain${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.5 0.025" numOctaves="3" seed="4" />
          <feColorMatrix values="0 0 0 0 0.15  0 0 0 0 0.08  0 0 0 0 0.03  1.4 0 0 0 -0.55" />
        </filter>
      </defs>
      {planks}
      <rect width="100" height="100" filter={`url(#grain${id})`} opacity="0.55" />
      {joints}
      {Array.from({ length: columns - 1 }, (_, i) => (
        <line
          key={`s${i}`}
          x1={(i + 1) * width}
          x2={(i + 1) * width}
          y1="0"
          y2="100"
          stroke="#000"
          strokeOpacity="0.35"
          strokeWidth="0.5"
        />
      ))}
    </>
  )
}

function Tiles({ id, rand, base, grout, perRow, veined }) {
  const size = 100 / perRow
  const tiles = []
  for (let row = 0; row < perRow; row++) {
    for (let col = 0; col < perRow; col++) {
      const shade = rand()
      tiles.push(
        <rect
          key={`${row}-${col}`}
          x={col * size}
          y={row * size}
          width={size}
          height={size}
          fill={shade > 0.5 ? '#fff' : '#000'}
          opacity={Math.abs(shade - 0.5) * 0.12}
        />,
      )
    }
  }

  return (
    <>
      <defs>
        <filter id={`veins${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency="0.035 0.05" numOctaves="4" seed="9" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -2.4 0 0 0 0.62" />
        </filter>
        <radialGradient id={`gloss${id}`} cx="30%" cy="20%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={base} />
      {tiles}
      {veined && <rect width="100" height="100" filter={`url(#veins${id})`} opacity="0.5" />}
      <rect width="100" height="100" fill={`url(#gloss${id})`} />
      {Array.from({ length: perRow - 1 }, (_, i) => (
        <g key={i} stroke={grout} strokeWidth="0.9">
          <line x1={(i + 1) * size} x2={(i + 1) * size} y1="0" y2="100" />
          <line y1={(i + 1) * size} y2={(i + 1) * size} x1="0" x2="100" />
        </g>
      ))}
    </>
  )
}

function Carpet({ id, base }) {
  return (
    <>
      <defs>
        <filter id={`pile${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="2" />
          <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.24  0 0 0 0 0.16  1.6 0 0 0 -0.7" />
        </filter>
        <filter id={`loops${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency="0.22 0.3" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.94  -1.8 0 0 0 0.55" />
        </filter>
      </defs>
      <rect width="100" height="100" fill={base} />
      <rect width="100" height="100" filter={`url(#loops${id})`} opacity="0.6" />
      <rect width="100" height="100" filter={`url(#pile${id})`} opacity="0.7" />
    </>
  )
}

export default MaterialSwatch
