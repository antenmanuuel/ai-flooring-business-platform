// Each material's `texture` controls how its sample swatch is drawn:
//   { kind: 'plank', colors: [...] }                          wood/vinyl/laminate boards
//   { kind: 'tile', base, grout, perRow, veined? }            ceramic/porcelain tiles
//   { kind: 'carpet', base }                                  carpet pile
export const materials = [
  {
    id: 'solid-hardwood',
    name: 'Solid hardwood',
    pricePerSqFt: 7.5,
    texture: { kind: 'plank', colors: ['#b8763a', '#a9682f', '#c4854b', '#9d602c'] },
  },
  {
    id: 'engineered-wood',
    name: 'Engineered wood',
    pricePerSqFt: 5.25,
    texture: { kind: 'plank', colors: ['#d8bd98', '#cdb089', '#e2caa8', '#c6a67e'] },
  },
  {
    id: 'laminate',
    name: 'Laminate',
    pricePerSqFt: 2.95,
    texture: { kind: 'plank', colors: ['#9b9a97', '#8d8c8a', '#a8a7a4', '#81807e'] },
  },
  {
    id: 'luxury-vinyl-plank',
    name: 'Luxury vinyl plank',
    pricePerSqFt: 4.25,
    texture: { kind: 'plank', colors: ['#5b3b29', '#4f3223', '#65432f', '#442b1e'] },
  },
  {
    id: 'ceramic-tile',
    name: 'Ceramic tile',
    pricePerSqFt: 2.75,
    texture: { kind: 'tile', base: '#e1e3e5', grout: '#b4b8bc', perRow: 4 },
  },
  {
    id: 'porcelain-tile',
    name: 'Porcelain tile',
    pricePerSqFt: 3.95,
    texture: { kind: 'tile', base: '#4c4d4e', grout: '#3b3c3d', perRow: 2, veined: true },
  },
  {
    id: 'carpet',
    name: 'Carpet',
    pricePerSqFt: 3.25,
    texture: { kind: 'carpet', base: '#cdb89b' },
  },
]
