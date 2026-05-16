import sharp from 'sharp'

// SVG source — dark mode background, centered <D/> monogram
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d1526"/>
      <stop offset="100%" style="stop-color:#060d1f"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>

  <!-- Centered <D/> as a single unit -->
  <text
    x="${size * 0.5}"
    y="${size * 0.63}"
    font-family="'SF Mono', 'Fira Code', 'Consolas', monospace"
    font-size="${size * 0.3}"
    font-weight="500"
    fill="white"
    text-anchor="middle"
  >&lt;D/&gt;</text>

  <!-- Accent dot above the slash -->
  <circle cx="${size * 0.575}" cy="${size * 0.32}" r="${size * 0.042}" fill="#818cf8" opacity="0.95"/>
</svg>
`

async function generate(size, filename) {
  await sharp(Buffer.from(svg(size)))
    .png()
    .toFile(`/home/user/devinterviewlab/public/${filename}`)
  console.log(`✓ ${filename} (${size}x${size})`)
}

await generate(192, 'icon-192.png')
await generate(512, 'icon-512.png')
await generate(180, 'apple-touch-icon.png')
console.log('Icons generated in public/')
