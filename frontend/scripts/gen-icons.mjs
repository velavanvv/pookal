import sharp from 'sharp';
import { writeFileSync } from 'fs';

// Pookal flower icon SVG — rose-coloured petals on dark bg
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${size * 0.18}" fill="#18181b"/>
  <!-- Petals -->
  <g transform="translate(256,256)">
    <ellipse cx="0" cy="-78" rx="34" ry="56" fill="#c0415e" opacity="0.95"/>
    <ellipse cx="0" cy="-78" rx="34" ry="56" fill="#c0415e" opacity="0.95" transform="rotate(51.4)"/>
    <ellipse cx="0" cy="-78" rx="34" ry="56" fill="#a3324d" opacity="0.95" transform="rotate(102.8)"/>
    <ellipse cx="0" cy="-78" rx="34" ry="56" fill="#c0415e" opacity="0.95" transform="rotate(154.2)"/>
    <ellipse cx="0" cy="-78" rx="34" ry="56" fill="#a3324d" opacity="0.95" transform="rotate(205.7)"/>
    <ellipse cx="0" cy="-78" rx="34" ry="56" fill="#c0415e" opacity="0.95" transform="rotate(257.1)"/>
    <ellipse cx="0" cy="-78" rx="34" ry="56" fill="#a3324d" opacity="0.95" transform="rotate(308.5)"/>
    <!-- Center -->
    <circle cx="0" cy="0" r="38" fill="#7d294a"/>
    <circle cx="0" cy="0" r="22" fill="#fda4af" opacity="0.9"/>
  </g>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const s of sizes) {
  await sharp(Buffer.from(svg(s)))
    .resize(s, s)
    .png()
    .toFile(`public/icon-${s}.png`);
  console.log(`✓ icon-${s}.png`);
}

// Maskable icon (safe zone = 40% padding)
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#7d294a"/>
  <g transform="translate(256,256)">
    <ellipse cx="0" cy="-60" rx="26" ry="42" fill="#fda4af" opacity="0.95"/>
    <ellipse cx="0" cy="-60" rx="26" ry="42" fill="#fda4af" opacity="0.95" transform="rotate(51.4)"/>
    <ellipse cx="0" cy="-60" rx="26" ry="42" fill="#e88fa2" opacity="0.95" transform="rotate(102.8)"/>
    <ellipse cx="0" cy="-60" rx="26" ry="42" fill="#fda4af" opacity="0.95" transform="rotate(154.2)"/>
    <ellipse cx="0" cy="-60" rx="26" ry="42" fill="#e88fa2" opacity="0.95" transform="rotate(205.7)"/>
    <ellipse cx="0" cy="-60" rx="26" ry="42" fill="#fda4af" opacity="0.95" transform="rotate(257.1)"/>
    <ellipse cx="0" cy="-60" rx="26" ry="42" fill="#e88fa2" opacity="0.95" transform="rotate(308.5)"/>
    <circle cx="0" cy="0" r="30" fill="#fff" opacity="0.25"/>
    <circle cx="0" cy="0" r="18" fill="#fff" opacity="0.5"/>
  </g>
</svg>`;

await sharp(Buffer.from(maskable))
  .resize(512, 512)
  .png()
  .toFile('public/maskable-icon-512.png');
console.log('✓ maskable-icon-512.png');

console.log('\nAll icons generated.');
