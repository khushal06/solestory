'use client'

const MAX_DIMENSION = 1024
const QUALITY = 0.85

export async function compressImage(file: File): Promise<File> {
  // Already small — skip compression
  if (file.size < 1.5 * 1024 * 1024) return file

  try {
    const compressed = await tryCompress(file)
    return compressed ?? file
  } catch {
    // Any failure → return original file so upload still proceeds
    return file
  }
}

function tryCompress(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null)
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null) // fall back to original
    }

    img.src = url
  })
}
