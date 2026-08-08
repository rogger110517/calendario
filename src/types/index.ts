// ─── User ──────────────────────────────────────────────────────────────────
// Autenticación vía Azure App Service Easy Auth (Entra ID) — ver
// src/lib/auth/roles.ts. Solo 2 roles: admin (lista fija de correos) y
// colaborador (cualquier otro usuario autenticado).
export type UserRole = 'admin' | 'colaborador'

export interface User {
  id: string             // = correo (Easy Auth no da un id local propio)
  nombre: string
  correo: string
  rol: UserRole
  departamento?: string
  avatar?: string
}

// ─── Unidad de negocio ─────────────────────────────────────────────────────
export interface Unidad {
  id: string
  nombre: string
  color: string
}

// ─── Dealer ────────────────────────────────────────────────────────────────
export interface Dealer {
  id: string
  nombre: string
  codigo: string
  region?: string
  activo: boolean
}

// ─── Campaign ──────────────────────────────────────────────────────────────
export type CampaignEstado = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Ejecutada' | 'Cancelada'
export type TipoRecurrencia = 'Diario' | 'Semanal' | 'Mensual' | 'Trimestral' | 'Anual'

export interface Campaign {
  id: string
  nombreCampana: string
  subject: string
  dirigidoA: string
  filtrosAplicar: string
  unidad: string                 // Unidad.id
  dealers: string[]              // Dealer.id[] — vacío si no aplica
  cantidadDealers?: number       // cantidad de dealers incluidos en la campaña
  diaEnvio: string               // ISO date — única fecha de envío de esta campaña
  horaEnvio: string              // "HH:mm"
  recurrencia: boolean           // solo informativo: marca que este envío es parte de una serie recurrente
  tipoRecurrencia?: TipoRecurrencia
  linkOneDrive?: string          // URL de OneDrive (reemplaza archivo adjunto)
  comentarios?: string
  solicitante: string            // User.id
  fechaRegistro: string          // ISO datetime
  estado: CampaignEstado
  comunicaciones?: Communication[]
}

// ─── Communication ─────────────────────────────────────────────────────────
export type CommunicationCanal  = 'Email' | 'SMS' | 'Push' | 'WhatsApp'
export type CommunicationEstado = 'Pendiente' | 'Programado' | 'Enviado' | 'Error' | 'Cancelado'

export interface Communication {
  id: string
  campaignId: string
  nombreComunicacion: string
  canal: CommunicationCanal
  fechaProgramada: string
  estadoEnvio: CommunicationEstado
  fechaEnvio?: string
  errorMensaje?: string
}

// ─── Notification ──────────────────────────────────────────────────────────
export type NotificationTipo = 'PENDIENTE_APROBACION' | 'APROBADA' | 'RECHAZADA' | 'ENVIADA'

export interface Notification {
  id: string
  userId: string          // User.id destinatario
  campaignId: string
  tipo: NotificationTipo
  mensaje: string
  leida: boolean
  fecha: string            // ISO datetime
}

// ─── Form DTOs ─────────────────────────────────────────────────────────────
export interface CampaignFormData {
  nombreCampana: string
  subject: string
  dirigidoA: string
  filtrosAplicar: string
  unidad: string
  tieneDealer: boolean
  dealers?: string[]
  cantidadDealers?: number
  diaEnvio: string
  horaEnvio: string
  tieneRecurrencia: boolean
  tipoRecurrencia?: TipoRecurrencia
  linkOneDrive?: string
  comentarios?: string
}

// ─── API ───────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}
