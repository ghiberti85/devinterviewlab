import sharp from 'sharp'

// SVG source — indigo background, white "DIL" monogram with code bracket accent
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#4f46e5"/>
    </linearGradient>
  </defs>

  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>

  <!-- Subtle inner glow -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="white" opacity="0.04"/>

  <!-- Code bracket left -->
  <text
    x="${size * 0.13}"
    y="${size * 0.68}"
    font-family="'SF Mono', 'Fira Code', monospace"
    font-size="${size * 0.38}"
    font-weight="300"
    fill="white"
    opacity="0.35"
  >&lt;</text>

  <!-- Code bracket right -->
  <text
    x="${size * 0.62}"
    y="${size * 0.68}"
    font-family="'SF Mono', 'Fira Code', monospace"
    font-size="${size * 0.38}"
    font-weight="300"
    fill="white"
    opacity="0.35"
  >/&gt;</text>

  <!-- Main monogram "D" -->
  <text
    x="${size * 0.5}"
    y="${size * 0.63}"
    font-family="'Inter', 'Helvetica Neue', Arial, sans-serif"
    font-size="${size * 0.44}"
    font-weight="800"
    fill="white"
    text-anchor="middle"
    letter-spacing="-1"
  >D</text>

  <!-- Accent dot -->
  <circle cx="${size * 0.72}" cy="${size * 0.31}" r="${size * 0.055}" fill="#a5b4fc" opacity="0.9"/>
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
