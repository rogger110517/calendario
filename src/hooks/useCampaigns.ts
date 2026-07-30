import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CampaignService } from '@/lib/services/campaign.service'
import type { Campaign, CampaignFormData, User } from '@/types'

export const CAMPAIGNS_KEY = ['campaigns'] as const

export function useCampaigns() {
  return useQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn:  () => CampaignService.getAll(),
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Campaign> }) =>
      CampaignService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => CampaignService.delete(id),
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
