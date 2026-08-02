import { NextRequest, NextResponse } from 'next/server'
import { CampaignDataverseService } from '@/lib/dataverse/campaign-dataverse.service'
import type { Campaign } from '@/types'

/**
 * Único punto donde se usan las credenciales DATAVERSE_* — corre en el
 * servidor. El cliente (CampaignService) llama a este endpoint en vez de
 * hablarle a Dataverse directamente.
 */
export async function POST(req: NextRequest) {
  const { campaign } = (await req.json()) as { campaign: Campaign }

  if (campaign.dataverseIds && campaign.dataverseIds.length > 0) {
    await CampaignDataverseService.syncOnUpdate(campaign.dataverseIds, campaign)
    return NextResponse.json({ dataverseIds: campaign.dataverseIds })
  }

  const dataverseIds = await CampaignDataverseService.syncOnCreate(campaign)
  return NextResponse.json({ dataverseIds })
}
