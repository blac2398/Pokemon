export async function resizeImage(file, maxDim = 1024, quality = 0.85) {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  const { width, height } = getScaledDimensions(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    maxDim,
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to process image: canvas context unavailable.')
  }

  context.drawImage(image, 0, 0, width, height)
  const resizedDataUrl = canvas.toDataURL('image/jpeg', quality)
  return { dataUrl: resizedDataUrl, mediaType: 'image/jpeg' }
}

// Resize an image for local on-device storage.
// Smaller than API uploads because these are stored in IndexedDB, not transmitted.
export async function resizeImageForStorage(file, maxDim = 400, quality = 0.8) {
  return resizeImage(file, maxDim, quality)
}

function getScaledDimensions(width, height, maxDim) {
  if (width <= maxDim && height <= maxDim) {
    return { width, height }
  }

  const scale = Math.min(maxDim / width, maxDim / height)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () =>
      reject(new Error('Failed to read image file for upload.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to decode captured image.'))
    image.src = src
  })
}
