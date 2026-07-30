import type { Unidad } from '@/types'
import unidadesData from '@/mocks/unidades.json'

const store: Unidad[] = unidadesData as Unidad[]

export const UnidadRepository = {
  async findAll(): Promise<Unidad[]> {
    return structuredClone(store)
  },

  async findById(id: string): Promise<Unidad | null> {
    return structuredClone(store.find((u) => u.id === id) ?? null)
  },
}
