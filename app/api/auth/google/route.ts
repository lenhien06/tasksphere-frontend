import { serverAxios } from '@/lib/serverAxios'
import { AxiosError } from 'axios'
import { NextResponse } from 'next/server'

const decodeJwt = (token: string): { exp?: number } => {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return {}
  }
}

export async function POST(request: Request) {
  const req = (await request.json()) as { idToken: string; turnstileToken?: string | null }

  try {
    const res = await serverAxios.post('/auth/google', req)
    const authData = res.data?.data

    const accessToken = decodeJwt(authData.accessToken)
    const expiresDateAccessToken =
      typeof accessToken.exp === 'number'
        ? new Date(accessToken.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const response = NextResponse.json(res.data, { status: 200 })

    response.cookies.set({
      name: 'accessToken',
      value: authData.accessToken,
      path: '/',
      httpOnly: true,
      expires: expiresDateAccessToken,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    })

    const refreshToken = decodeJwt(authData.refreshToken)
    const expiresDateRefreshToken =
      typeof refreshToken.exp === 'number'
        ? new Date(refreshToken.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    response.cookies.set({
      name: 'refreshToken',
      value: authData.refreshToken,
      path: '/',
      httpOnly: true,
      expires: expiresDateRefreshToken,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    })

    return response
  } catch (e) {
    if (e instanceof AxiosError) {
      const message = e.response?.data?.meta?.message || e.response?.data?.message || e.message
      return NextResponse.json(
        { message },
        { status: e.response?.status || 500 }
      )
    }

    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
