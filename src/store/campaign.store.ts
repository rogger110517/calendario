import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Campaign } from '@/types'

interface CampaignState {
  selectedCampaign: Campaign | null
  setSelectedCampaign: (c: Campaign | null) => void
  newCampaignDate: string | null
  setNewCampaignDate: (d: string | null) => void
  isDetailOpen: boolean
  setDetailOpen: (v: boolean) => void
  isFormOpen: boolean
  setFormOpen: (v: boolean) => void
  // Unidad preferida del usuario en sesión (pre-rellena el formulario)
  myUnidad: string
  setMyUnidad: (id: string) => void
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set) => ({
      selectedCampaign:   null,
      setSelectedCampaign: (c) => set({ selectedCampaign: c }),
      newCampaignDate:    null,
      setNewCampaignDate:  (d) => set({ newCampaignDate: d }),
      isDetailOpen:       false,
      setDetailOpen:       (v) => set({ isDetailOpen: v }),
      isFormOpen:         false,
      setFormOpen:         (v) => set({ isFormOpen: v }),
      myUnidad:           '',
      setMyUnidad:         (id) => set({ myUnidad: id }),
    }),
    {
      name: 'cc_campaign_prefs',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      // Solo persistir la preferencia de unidad, no el estado de modales
      partialize: (s) => ({ myUnidad: s.myUnidad }),
    },
  ),
)
