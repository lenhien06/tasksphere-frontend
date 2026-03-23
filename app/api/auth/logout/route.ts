import { serverAxios } from '@/lib/serverAxios'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value
  const refreshToken = cookieStore.get('refreshToken')?.value

  // Regardless of whether accessToken exists, prepare a response that deletes cookies
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  )
  response.cookies.delete('accessToken')
  response.cookies.delete('refreshToken')

  if (accessToken) {
    try {
      // Pass refreshToken in body so the backend can revoke it too.
      // The BFF calls the backend server-to-server (no browser cookies forwarded),
      // so the refresh token must be sent explicitly.
      await serverAxios.post(
        '/auth/logout',
        refreshToken ? { refreshToken } : null,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    } catch (error) {
      // Log error but do not block cookie deletion on the client
      console.error('Error calling logout on Backend:', error)
    }
  }

  return response
}
