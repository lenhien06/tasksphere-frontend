import { serverAxios } from '@/lib/serverAxios'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AxiosError } from 'axios'

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await serverAxios.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
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
