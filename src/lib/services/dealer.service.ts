import { DealerRepository } from '@/lib/repositories/dealer.repository'
import type { Dealer } from '@/types'

export const DealerService = {
  async getAll(): Promise<Dealer[]> {
    return DealerRepository.findAll()
  },

  async getActivos(): Promise<Dealer[]> {
    return DealerRepository.findActivos()
  },
}
