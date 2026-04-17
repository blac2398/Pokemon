import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const iconsDir = path.join(projectRoot, 'public', 'icons')
const sourceIconPath = path.join(iconsDir, 'pikachu-icon-1024.png')

async function ensureInputExists() {
  await fs.access(sourceIconPath)
}

async function generateIcon(size, outputName) {
  const outputPath = path.join(iconsDir, outputName)
  process.stdout.write(`Writing ${outputName}... `)
  await sharp(sourceIconPath).resize(size, size).png().toFile(outputPath)
  console.log('done')
}

async function generateMaskableIcon() {
  const innerSize = Math.round(512 * 0.7)
  const sourceBuffer = await sharp(sourceIconPath).resize(innerSize, innerSize).png().toBuffer()
  const outputPath = path.join(iconsDir, 'icon-512-maskable.png')

  process.stdout.write('Writing icon-512-maskable.png... ')
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: '#e3350d',
    },
  })
    .composite([{ input: sourceBuffer, gravity: 'center' }])
    .png()
    .toFile(outputPath)
  console.log('done')
}

async function main() {
  await ensureInputExists()
  await generateIcon(192, 'icon-192.png')
  await generateIcon(512, 'icon-512.png')
  await generateIcon(180, 'apple-touch-icon.png')
  await generateMaskableIcon()
  console.log('Generated app icons in public/icons/')
}

main().catch((error) => {
  console.error('Failed to generate app icons:', error)
  process.exit(1)
})
