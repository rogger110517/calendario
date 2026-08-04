import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CampaignService } from '@/lib/services/campaign.service'
import type { Campaign, CampaignFormData, User } from '@/types'

export const CAMPAIGNS_KEY = ['campaigns'] as const

/** Dataverse es la fuente de verdad — se lee vía el servidor (/api/campaigns), no de memoria local. */
async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch('/api/campaigns')
  const json = (await res.json()) as { data: Campaign[]; success: boolean }
  if (!json.success) throw new Error('Error al obtener campañas')
  return json.data
}

export function useCampaigns() {
  return useQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn:  fetchCampaigns,
    staleTime: 30_000,
  })
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, id],
    queryFn:  () => CampaignService.getById(id),
    enabled:  !!id,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ formData, user }: { formData: CampaignFormData; user: User }) =>
      CampaignService.create(formData, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campaign, data }: { campaign: Campaign; data: Partial<Campaign> }) =>
      CampaignService.update(campaign, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (campaign: Campaign) => CampaignService.delete(campaign),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  })
}

export function useValidateSimilar() {
  return useMutation({
    mutationFn: ({ nombre, subject }: { nombre: string; subject: string }) =>
      CampaignService.validateSimilar(nombre, subject),
  })
}

export function useValidarReglas() {
  return useMutation({
    mutationFn: ({ diaEnvio, dirigidoA }: { diaEnvio: string; dirigidoA: string }) =>
      CampaignService.validarReglas(diaEnvio, dirigidoA),
  })
}
