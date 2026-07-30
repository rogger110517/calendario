import { NextResponse } from 'next/server'
import { DealerRepository } from '@/lib/repositories/dealer.repository'

export async function GET() {
  try {
    const dealers = await DealerRepository.findActivos()
    return NextResponse.json({ data: dealers, success: true })
  } catch {
    return NextResponse.json({ success: false, message: 'Error fetching dealers' }, { status: 500 })
  }
}
