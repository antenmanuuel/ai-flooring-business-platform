// Stylized sunlit living room with a wood floor.
// Replace with a real photo later, e.g. <img src={heroPhoto} className="h-full w-full object-cover" />
function HeroIllustration() {
  const vanishX = 230
  const vanishY = 40
  const horizon = 178
  // Floor board lines converge toward a vanishing point for perspective.
  const boardLines = Array.from({ length: 31 }, (_, i) => {
    const bottomX = -600 + i * 60
    const t = (horizon - vanishY) / (300 - vanishY)
    const topX = vanishX + (bottomX - vanishX) * t
    return { topX, bottomX }
  })

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      role="img"
      aria-label="Sunlit living room with a warm hardwood floor"
    >
      <defs>
        <linearGradient id="hero-wall" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#f3ebdf" />
          <stop offset="1" stopColor="#e3d4c0" />
        </linearGradient>
        <linearGradient id="hero-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d49a5c" />
          <stop offset="0.5" stopColor="#c07d42" />
          <stop offset="1" stopColor="#9a5828" />
        </linearGradient>
        <filter id="hero-floor-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.4 0.02" numOctaves="3" seed="3" />
          <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.15  0 0 0 0 0.05  1.2 0 0 0 -0.5" />
        </filter>
        <filter id="hero-blur">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="hero-soft">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <clipPath id="hero-floor-clip">
          <rect x="0" y={horizon} width="400" height={300 - horizon} />
        </clipPath>
        <radialGradient id="hero-vignette" cx="55%" cy="45%" r="75%">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#2a160a" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      {/* Wall */}
      <rect width="400" height={horizon} fill="url(#hero-wall)" />
      <polygon points={`40,0 120,0 230,${horizon} 90,${horizon}`} fill="#fff8ec" opacity="0.35" filter="url(#hero-blur)" />

      {/* Window */}
      <rect x="0" y="0" width="34" height={horizon} fill="#faf6ee" />
      <g stroke="#2d2a27" strokeWidth="3" fill="none">
        <rect x="2" y="-2" width="30" height={horizon} />
        <line x1="17" y1="0" x2="17" y2={horizon} />
      </g>

      {/* Framed art */}
      <rect x="226" y="52" width="54" height="46" fill="#eadfce" stroke="#8a7561" strokeWidth="2" />
      <rect x="236" y="62" width="34" height="26" fill="#d9c7ae" />

      {/* Floor lamp */}
      <line x1="196" y1="70" x2="196" y2={horizon - 2} stroke="#3a2d22" strokeWidth="1.5" />
      <path d="M186 70 L206 70 L201 56 L191 56 Z" fill="#efe3cf" stroke="#c7b597" strokeWidth="0.8" />

      {/* Floor */}
      <rect x="0" y={horizon} width="400" height={300 - horizon} fill="url(#hero-floor)" />
      <g clipPath="url(#hero-floor-clip)">
        <rect x="0" y={horizon} width="400" height={300 - horizon} filter="url(#hero-floor-grain)" opacity="0.6" />
        {boardLines.map(({ topX, bottomX }) => (
          <line
            key={bottomX}
            x1={topX}
            y1={horizon}
            x2={bottomX}
            y2="300"
            stroke="#5e3214"
            strokeOpacity="0.28"
            strokeWidth="0.8"
          />
        ))}
        {/* Sunlight patch */}
        <polygon points="160,205 400,190 400,300 230,300" fill="#ffe2b0" opacity="0.4" filter="url(#hero-blur)" />
      </g>
      <rect x="0" y={horizon - 3} width="400" height="4" fill="#f6efe4" />

      {/* Plant */}
      <ellipse cx="62" cy="182" rx="22" ry="3" fill="#5a3015" opacity="0.25" filter="url(#hero-soft)" />
      <path d="M52 158 L72 158 L69 182 L55 182 Z" fill="#e9e2d6" />
      <g fill="#7d8c5a">
        <ellipse cx="54" cy="140" rx="6" ry="11" transform="rotate(-25 54 140)" />
        <ellipse cx="70" cy="136" rx="6" ry="12" transform="rotate(20 70 136)" />
        <ellipse cx="62" cy="128" rx="5" ry="12" />
        <ellipse cx="48" cy="124" rx="4" ry="9" transform="rotate(-35 48 124)" />
        <ellipse cx="76" cy="120" rx="4" ry="9" transform="rotate(30 76 120)" />
      </g>
      <line x1="62" y1="158" x2="62" y2="130" stroke="#5b6640" strokeWidth="1.2" />

      {/* Sofa */}
      <ellipse cx="200" cy="186" rx="80" ry="6" fill="#4a240c" opacity="0.3" filter="url(#hero-soft)" />
      <rect x="128" y="138" width="144" height="30" rx="8" fill="#f1ebe1" />
      <rect x="124" y="156" width="152" height="26" rx="7" fill="#ebe3d6" />
      <rect x="120" y="146" width="20" height="36" rx="8" fill="#f3eee5" />
      <rect x="260" y="146" width="20" height="36" rx="8" fill="#f3eee5" />
      <rect x="146" y="144" width="34" height="18" rx="5" fill="#f7f3ec" />
      <rect x="220" y="144" width="34" height="18" rx="5" fill="#f7f3ec" />

      {/* Coffee table */}
      <ellipse cx="190" cy="214" rx="44" ry="5" fill="#4a240c" opacity="0.35" filter="url(#hero-soft)" />
      <rect x="150" y="196" width="80" height="8" rx="2" fill="#7a4524" />
      <rect x="156" y="204" width="68" height="8" fill="#5f341b" />
      <rect x="170" y="190" width="18" height="6" rx="1" fill="#e9dfcf" />

      {/* Armchair */}
      <ellipse cx="335" cy="214" rx="36" ry="5" fill="#4a240c" opacity="0.3" filter="url(#hero-soft)" />
      <path d="M306 168 L362 168 L366 204 L302 204 Z" fill="#8a5a33" />
      <rect x="310" y="176" width="48" height="20" rx="5" fill="#f0e9de" />
      <rect x="314" y="156" width="40" height="24" rx="5" fill="#ece4d7" />
      <line x1="306" y1="204" x2="302" y2="214" stroke="#5f3a1f" strokeWidth="2" />
      <line x1="364" y1="204" x2="368" y2="214" stroke="#5f3a1f" strokeWidth="2" />

      <rect width="400" height="300" fill="url(#hero-vignette)" />
    </svg>
  )
}

export default HeroIllustration
