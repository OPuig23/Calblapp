import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Notifications system removed' },
    { status: 410 }
  )
}
