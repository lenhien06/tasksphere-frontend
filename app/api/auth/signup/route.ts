import { AuthService } from '@/app/services/auth.service'
import { RegisterFormValues } from '@/app/types/auth.schema'
import { AxiosError } from 'axios'
import { jwtDecode, JwtPayload } from 'jwt-decode'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const req = (await request.json()) as RegisterFormValues
  try {
    const res = await AuthService.register(req)
    const authData = res.data

    if (!authData || !authData.accessToken || !authData.refreshToken) {
        return NextResponse.json(res, { status: 200 })
    }

    const accessToken = jwtDecode<JwtPayload>(authData.accessToken)
    const expiresDateAccessToken =
      typeof accessToken.exp === 'number'
        ? new Date(accessToken.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const response = NextResponse.json(res, { status: 200 })

    response.cookies.set({
      name: 'accessToken',
      value: authData.accessToken,
      path: '/',
      httpOnly: true,
      expires: expiresDateAccessToken,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    })

    const refreshToken = jwtDecode<JwtPayload>(authData.refreshToken)
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
