import { serverAxios } from '@/lib/serverAxios'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const decodeJwt = (token: string): { exp?: number } => {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return {}
  }
}

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
    const res = await serverAxios.post(
      '/auth/refresh',
      { refreshToken: refreshToken.value },
      { timeout: REFRESH_TIMEOUT_MS }
    )

    const apiResponse = res.data
    if (!apiResponse?.data) {
      throw new Error(apiResponse?.message || 'Token refresh failed')
    }

    const authData = apiResponse.data
    const accessToken = decodeJwt(authData.accessToken)
    const expiresDateAccessToken =
      typeof accessToken.exp === 'number'
        ? new Date(accessToken.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const response = NextResponse.json(apiResponse, { status: 200 })

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
      const refreshTokenDecoded = decodeJwt(authData.refreshToken)
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

    const isNetworkError = error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED'
    const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')
    const status = (isNetworkError || isTimeout) ? 503 : (error?.response?.status || 401)

    // 409 = tab khác vừa rotate token trước — cookie đã được tab đó cập nhật.
    // KHÔNG xóa cookie, KHÔNG logout — trả 409 để client dùng me-token lấy token mới.
    if (status === 409) {
      return NextResponse.json(
        { detail: 'Token already rotated by another tab', status: 409 },
        { status: 409 }
      )
    }

    // 503 = backend không khả dụng — KHÔNG logout, chỉ báo lỗi tạm thời.
    if (isNetworkError || isTimeout) {
      return NextResponse.json(
        { detail: 'Backend unavailable. Please try again later.', status: 503 },
        { status: 503 }
      )
    }

    // 401 = token thực sự hết hạn hoặc bị revoke — xóa cookie và logout.
    const detail = error?.response?.data?.meta?.message || error?.response?.data?.detail || 'Session expired'
    const res = NextResponse.json({ detail, status: 401 }, { status: 401 })
    res.cookies.delete('accessToken')
    res.cookies.delete('refreshToken')
    return res
  }
}
