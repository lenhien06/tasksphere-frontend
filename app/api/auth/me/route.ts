import { AuthService } from '@/app/services/auth.service'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AxiosError } from 'axios'
import { apiJava } from '@/lib/axios'

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Call Java Backend, passing the accessToken from Cookie
    const res = await apiJava.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    
    return NextResponse.json(res.data)
  } catch (e) {
    if (e instanceof AxiosError) {
      return NextResponse.json(
        { message: e.response?.data?.meta?.message || e.response?.data?.message || 'Failed to fetch user' },
        { status: e.response?.status || 500 }
      )
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
