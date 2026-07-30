/**
 * FileStorageService — MVP: saves metadata only, no physical upload.
 *
 * Future Microsoft Graph + OneDrive implementation:
 *   import { Client } from '@microsoft/microsoft-graph-client'
 *   const client = Client.initWithMiddleware({ authProvider })
 *
 *   uploadFile: async (file) => {
 *     const result = await client.api(`/me/drive/root:/Campanas/${file.name}:/content`).put(buffer)
 *     return { nombre: file.name, tamaño: file.size, fechaCarga: new Date().toISOString(),
 *              archivoId: result.id, archivoUrl: result.webUrl }
 *   }
 *
 * Required Azure AD permissions: Files.ReadWrite, Sites.ReadWrite.All
 */

export interface UploadResult {
  nombre: string
  tamaño: number
  fechaCarga: string
  archivoId?: string
  archivoUrl?: string
}

export const FileStorageService = {
  async uploadFile(file: File): Promise<UploadResult> {
    return {
      nombre: file.name,
      tamaño: file.size,
      fechaCarga: new Date().toISOString(),
    }
  },

  async getFile(_archivoId: string): Promise<UploadResult | null> {
    console.warn('[FileStorageService] getFile not implemented in MVP')
    return null
  },

  async downloadFile(_archivoId: string): Promise<void> {
    console.warn('[FileStorageService] downloadFile not implemented in MVP')
  },

  async deleteFile(_archivoId: string): Promise<void> {
    console.warn('[FileStorageService] deleteFile not implemented in MVP')
  },
}
