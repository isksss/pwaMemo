export async function compressImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPEG、PNG、WebPだけ添付できます')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('画像を変換できませんでした'))),
      'image/webp',
      0.82,
    ),
  )
  if (blob.size > 2 * 1024 * 1024) throw new Error('圧縮後の画像が2MBを超えています')
  return {
    fileName: file.name.replace(/\.[^.]+$/, '.webp'),
    data: new Uint8Array(await blob.arrayBuffer()),
    width,
    height,
  }
}
