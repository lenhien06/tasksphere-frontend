import { serverAxios } from '@/lib/serverAxios'
import { AxiosError } from 'axios'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ message: 'Email is required' }, { status: 400 })
  }

  try {
    const res = await serverAxios.post(`/auth/send-otp?email=${encodeURIComponent(email)}`)
    return NextResponse.json(res.data, { status: 200 })
  } catch (e) {
    if (e instanceof AxiosError) {
      return NextResponse.json(
        { message: e.response?.data?.message || e.message },
        { status: e.response?.status || 500 }
      )
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
