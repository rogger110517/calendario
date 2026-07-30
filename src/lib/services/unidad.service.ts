import { UnidadRepository } from '@/lib/repositories/unidad.repository'
import type { Unidad } from '@/types'

export const UnidadService = {
  async getAll(): Promise<Unidad[]> {
    return UnidadRepository.findAll()
  },
}
