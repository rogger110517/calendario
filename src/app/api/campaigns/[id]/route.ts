import { NextRequest, NextResponse } from 'next/server'
import { CampaignRepository } from '@/lib/repositories/campaign.repository'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const campaign = await CampaignRepository.findById(id)
    if (!campaign)
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: campaign, success: true })
  } catch {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await CampaignRepository.update(id, body)
    if (!updated)
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: updated, success: true })
  } catch {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const deleted = await CampaignRepository.delete(id)
    if (!deleted)
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: null, success: true })
  } catch {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
