import { NextRequest, NextResponse } from 'next/server'
import { CampaignDataverseService } from '@/lib/dataverse/campaign-dataverse.service'
import type { Campaign } from '@/types'

/**
 * Único punto donde se usan las credenciales DATAVERSE_* — corre en el
 * servidor. El cliente (CampaignService) llama a este endpoint en vez de
 * hablarle a Dataverse directamente. El upsert por cre47_campanaid hace
 * innecesario rastrear GUIDs: "create" y "update" solo difieren en qué
 * campos se mandan (ver CampaignDataverseService).
 */
export async function POST(req: NextRequest) {
  const { campaign, mode } = (await req.json()) as { campaign: Campaign; mode: 'create' | 'update' | 'delete' }

  if (mode === 'update') {
    await CampaignDataverseService.syncOnUpdate(campaign)
  } else if (mode === 'delete') {
    await CampaignDataverseService.deleteCampaign(campaign)
  } else {
    await CampaignDataverseService.syncOnCreate(campaign)
  }

  return NextResponse.json({ ok: true })
}
