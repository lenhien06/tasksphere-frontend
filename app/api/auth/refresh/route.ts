import { AuthService } from '@/app/services/auth.service'
import { jwtDecode, JwtPayload } from 'jwt-decode'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const REFRESH_TIMEOUT_MS = 10_000

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request) {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refreshToken')
  if (!refreshToken) {
    return NextResponse.json(
      {
        detail: 'No refreshToken received',
        status: 401
      },
      { status: 401 }
    )
  }

  try {
    const res = await AuthService.refresh(refreshToken.value as string, REFRESH_TIMEOUT_MS)

    if (!res.data) {
      throw new Error(res.message || 'Token refresh failed')
    }

    const authData = res.data;
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

    if (authData.refreshToken) {
      const refreshTokenDecoded = jwtDecode<JwtPayload>(authData.refreshToken)
      const expiresDateRefreshToken =
        typeof refreshTokenDecoded.exp === 'number'
          ? new Date(refreshTokenDecoded.exp * 1000)
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
    }

    return response
  } catch (error: any) {
    console.error('❌ Error in BFF refresh route:', error?.response?.data || error?.message || error)
    // ECONNREFUSED / network error / timeout → 503 (backend down), not 401 (auth error)
    const isNetworkError = error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED'
    const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')
    const status = (isNetworkError || isTimeout) ? 503 : (error?.response?.status || 401)
    const detail = (isNetworkError || isTimeout)
      ? 'Backend unavailable. Please try again later.'
      : (error?.response?.data?.meta?.message || error?.response?.data?.detail || 'Error refreshing token')

    const response = NextResponse.json(
      {
        detail,
        status
      },
      { status }
    )

    // FIX: Bug3 - Chỉ xóa cookie khi là lỗi auth thực sự (401), KHÔNG xóa khi 409
    // (409 = tab khác vừa refresh xong, cookie đã được cập nhật bởi tab đó)
    if (status === 401) {
      response.cookies.delete('accessToken')
      response.cookies.delete('refreshToken')
    }

    return response
  }
}
