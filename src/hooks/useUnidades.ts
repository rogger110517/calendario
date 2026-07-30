import { useQuery } from '@tanstack/react-query'
import { UnidadService } from '@/lib/services/unidad.service'

export function useUnidades() {
  return useQuery({
    queryKey: ['unidades'],
    queryFn:  () => UnidadService.getAll(),
    staleTime: Infinity,
  })
}
