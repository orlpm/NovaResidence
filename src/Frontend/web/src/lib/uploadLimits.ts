export const maxUploadBytes = 8 * 1024 * 1024

export function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function uploadRejection(file: File, allowedExtensions: string[]): string | null {
  if (!allowedExtensions.includes(fileExtension(file.name))) {
    return 'Formato no permitido'
  }

  if (file.size > maxUploadBytes) {
    return 'El archivo no debe superar 8MB'
  }

  return null
}
