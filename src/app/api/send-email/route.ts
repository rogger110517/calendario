import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/services/email.service'
import { CampaignRepository } from '@/lib/repositories/campaign.repository'
import { UserRepository } from '@/lib/repositories/user.repository'

export async function POST(req: NextRequest) {
  try {
    const { type, campaignId, userId } = await req.json()

    const campaign = await CampaignRepository.findById(campaignId)
    if (!campaign)
      return NextResponse.json({ success: false, message: 'Campaign not found' }, { status: 404 })

    const user = await UserRepository.findById(userId)
    if (!user)
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })

    switch (type) {
      case 'approval':
        await EmailService.sendApprovalEmail(campaign, user)
        break
      case 'rejection':
        await EmailService.sendRejectionEmail(campaign, 'Rechazada por el equipo de revisión')
        break
      default:
        await EmailService.sendNotificationEmail(campaign, [user.correo])
    }

    return NextResponse.json({ success: true, message: 'Email enviado correctamente' })
  } catch {
    return NextResponse.json({ success: false, message: 'Error sending email' }, { status: 500 })
  }
}
