import type { Dealer } from '@/types'
import dealersData from '@/mocks/dealers.json'

const store: Dealer[] = dealersData as Dealer[]

export const DealerRepository = {
  async findAll(): Promise<Dealer[]> {
    return structuredClone(store)
  },

  async findById(id: string): Promise<Dealer | null> {
    return structuredClone(store.find((d) => d.id === id) ?? null)
  },

  async findActivos(): Promise<Dealer[]> {
    return structuredClone(store.filter((d) => d.activo))
  },
}
