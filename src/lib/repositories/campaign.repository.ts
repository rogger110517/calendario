/**
 * CampaignRepository
 *
 * Currently backed by local JSON mock data.
 * To migrate to Dataverse / REST API, replace the implementations below
 * with HTTP calls to your endpoint — the interface stays the same.
 *
 * Future Dataverse example:
 *   async findAll(): Promise<Campaign[]> {
 *     const res = await fetch(`${DATAVERSE_URL}/cr_campaigns`, { headers: { Authorization: `Bearer ${token}` } })
 *     const { value } = await res.json()
 *     return value.map(mapDataverseToCampaign)
 *   }
 */

import type { Campaign } from '@/types'
import campaignsData from '@/mocks/campaigns.json'

// In-memory store so mutations persist during the browser session
let store: Campaign[] = campaignsData as Campaign[]

export const CampaignRepository = {
  async findAll(): Promise<Campaign[]> {
    return structuredClone(store)
  },

  async findById(id: string): Promise<Campaign | null> {
    return structuredClone(store.find((c) => c.id === id) ?? null)
  },

  async create(data: Omit<Campaign, 'id'>): Promise<Campaign> {
    const newCampaign: Campaign = {
      ...data,
      id: `cmp-${Date.now()}`,
    }
    store = [...store, newCampaign]
    return structuredClone(newCampaign)
  },

  async update(id: string, data: Partial<Campaign>): Promise<Campaign | null> {
    const index = store.findIndex((c) => c.id === id)
    if (index === -1) return null
    store[index] = { ...store[index], ...data }
    return structuredClone(store[index])
  },

  async delete(id: string): Promise<boolean> {
    const prev = store.length
    store = store.filter((c) => c.id !== id)
    return store.length < prev
  },
}
