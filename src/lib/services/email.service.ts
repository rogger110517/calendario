/**
 * EmailService — desacoplado para futura integración con SendGrid o Gmail API.
 *
 * SendGrid future:
 *   import sgMail from '@sendgrid/mail'
 *   sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
 *   await sgMail.send({ to, from, subject, html })
 *
 * Gmail API future:
 *   import { google } from 'googleapis'
 *   const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })
 *   await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } })
 */

import type { Campaign, User } from '@/types'

export const EmailService = {
  async sendApprovalEmail(campaign: Campaign, approver: User): Promise<void> {
    console.log('[EmailService] sendApprovalEmail', {
      campaign: campaign.id,
      approver: approver.correo,
    })
  },

  async sendNotificationEmail(campaign: Campaign, recipients: string[]): Promise<void> {
    console.log('[EmailService] sendNotificationEmail', {
      campaign: campaign.id,
      recipients,
    })
  },

  async sendRejectionEmail(campaign: Campaign, reason: string): Promise<void> {
    console.log('[EmailService] sendRejectionEmail', {
      campaign: campaign.id,
      reason,
    })
  },
}
