import { NextRequest, NextResponse } from 'next/server'
import { CampaignRepository } from '@/lib/repositories/campaign.repository'

export async function GET() {
  try {
    const campaigns = await CampaignRepository.findAll()
    return NextResponse.json({ data: campaigns, success: true })
  } catch {
    return NextResponse.json({ success: false, message: 'Error fetching campaigns' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const campaign = await CampaignRepository.create(body)
    return NextResponse.json({ data: campaign, success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, message: 'Error creating campaign' }, { status: 500 })
  }
}
