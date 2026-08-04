import { NextResponse } from 'next/server'
import { fetchCampaignsFromDataverse } from '@/lib/dataverse/campaign-dataverse.reader'

/** Dataverse es la fuente de verdad para lectura — no la memoria local del navegador. */
export async function GET() {
  try {
    const campaigns = await fetchCampaignsFromDataverse()
    return NextResponse.json({ data: campaigns, success: true })
  } catch (err) {
    console.error('[Dataverse] Error listando campañas', err)
    return NextResponse.json({ success: false, message: 'Error fetching campaigns' }, { status: 500 })
  }
}
