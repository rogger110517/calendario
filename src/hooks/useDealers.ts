import { useQuery } from '@tanstack/react-query'
import { DealerService } from '@/lib/services/dealer.service'

export function useDealers() {
  return useQuery({
    queryKey: ['dealers'],
    queryFn: () => DealerService.getActivos(),
    staleTime: 60_000 * 10,
  })
}
