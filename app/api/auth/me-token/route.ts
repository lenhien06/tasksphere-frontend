import { AuthResponse } from '@/app/types/auth.schema'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')
  if (!accessToken) {
    return NextResponse.json(
      {
        detail: 'No accessToken received',
        status: 401
      },
      { status: 401 }
    )
  }
  const refreshToken = cookieStore.get('refreshToken')

  return NextResponse.json(
    {
      accessToken: accessToken?.value,
      refreshToken: refreshToken?.value
    } as unknown as AuthResponse,
    {
      status: 200
    }
  )
}
