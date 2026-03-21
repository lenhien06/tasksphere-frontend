import { apiJava } from '@/lib/axios'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  // Regardless of whether accessToken exists, prepare a response that deletes cookies
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  )
  response.cookies.delete('accessToken')
  response.cookies.delete('refreshToken')

  if (accessToken) {
    try {
      // Call Java Backend to revoke the token (if needed)
      // We use apiJava directly with the header because the apiJava interceptor uses Zustand store (client-side)
      await apiJava.post('/auth/logout', null, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    } catch (error) {
      // Log error but do not block cookie deletion on the client
      console.error('Error calling logout on Backend:', error)
    }
  }

  return response
}
