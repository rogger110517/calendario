# Integración de Email

## Arquitectura

El `EmailService` en `src/lib/services/email.service.ts` es el único punto de integración de email. La UI nunca llama directamente a ningún proveedor — siempre pasa por este servicio.

**Métodos disponibles:**
- `sendApprovalEmail(campaign, approver)` — Notifica aprobación
- `sendRejectionEmail(campaign, reason)` — Notifica rechazo
- `sendNotificationEmail(campaign, recipients)` — Notificación general

## Integración SendGrid

### Instalación
```bash
npm install @sendgrid/mail
npm install --save-dev @types/sendgrid__mail
```

### Implementación
```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export const EmailService = {
  async sendApprovalEmail(campaign: Campaign, approver: User): Promise<void> {
    await sgMail.send({
      to: campaign.solicitante, // en producción: buscar email del solicitante
      from: { email: process.env.EMAIL_FROM!, name: 'Sistema de Campañas' },
      subject: `[APROBADA] Campaña: ${campaign.nombreCampana}`,
      html: `
        <div style="font-family: Segoe UI, sans-serif; max-width: 600px;">
          <h2 style="color: #107c10;">✅ Campaña Aprobada</h2>
          <p>Tu campaña <strong>${campaign.nombreCampana}</strong> fue aprobada por <strong>${approver.nombre}</strong>.</p>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td><strong>Subject:</strong></td><td>${campaign.subject}</td></tr>
            <tr><td><strong>Día de envío:</strong></td><td>${campaign.diaEnvio}</td></tr>
            <tr><td><strong>Estado:</strong></td><td>Aprobada</td></tr>
          </table>
        </div>
      `,
    })
  },

  async sendRejectionEmail(campaign: Campaign, reason: string): Promise<void> {
    await sgMail.send({
      to: campaign.solicitante,
      from: process.env.EMAIL_FROM!,
      subject: `[RECHAZADA] Campaña: ${campaign.nombreCampana}`,
      html: `<p>Tu campaña fue rechazada. Motivo: ${reason}</p>`,
    })
  },
}
```

## Integración Gmail API

```bash
npm install googleapis
```

```typescript
import { google } from 'googleapis'

const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI,
)
oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

function encodeMessage(to: string, subject: string, body: string): string {
  const message = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ].join('\n')
  return Buffer.from(message).toString('base64url')
}

await gmail.users.messages.send({
  userId: 'me',
  requestBody: { raw: encodeMessage(to, subject, htmlBody) },
})
```

## Integración via Azure API Route

Para mantener la API key segura en servidor:

```typescript
// src/app/api/send-email/route.ts (producción)
// La API key de SendGrid NUNCA se expone al cliente
// Solo se usa en server-side (API Route o Azure Function)

import sgMail from '@sendgrid/mail'
sgMail.setApiKey(process.env.SENDGRID_API_KEY!) // Variable server-only (sin NEXT_PUBLIC_)
```

## Variables de Entorno

```env
# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@empresa.com

# Gmail API
GMAIL_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxx
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
GMAIL_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Flujo de Emails en el Sistema

```
Crear Campaña → Estado: Pendiente
     ↓
Admin aprueba → EmailService.sendApprovalEmail()
     ↓ (correo enviado al solicitante)
Admin rechaza → EmailService.sendRejectionEmail()
     ↓ (correo enviado al solicitante con motivo)
Campaña ejecutada → EmailService.sendNotificationEmail()
     ↓ (correo de confirmación a stakeholders)
```
