import type { Communication } from '@/types'
import communicationsData from '@/mocks/communications.json'

let store: Communication[] = communicationsData as Communication[]

export const CommunicationRepository = {
  async findAll(): Promise<Communication[]> {
    return structuredClone(store)
  },

  async findByCampaignId(campaignId: string): Promise<Communication[]> {
    return structuredClone(store.filter((c) => c.campaignId === campaignId))
  },

  async create(data: Omit<Communication, 'id'>): Promise<Communication> {
    const newComm: Communication = { ...data, id: `com-${Date.now()}` }
    store = [...store, newComm]
    return structuredClone(newComm)
  },

  async update(id: string, data: Partial<Communication>): Promise<Communication | null> {
    const index = store.findIndex((c) => c.id === id)
    if (index === -1) return null
    store[index] = { ...store[index], ...data }
    return structuredClone(store[index])
  },
}
