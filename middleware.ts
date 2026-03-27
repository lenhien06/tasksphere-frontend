import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Invite links must work when the user is not logged in yet
const PUBLIC_PATHS = ['/', '/signin', '/signup', '/forgot-password', '/invites']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/notifications' || pathname.startsWith('/notifications/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  
  // Check all possible cookie names
  const accessToken = req.cookies.get('accessToken')?.value
  const refreshToken = req.cookies.get('refreshToken')?.value

  // 1. If already logged in and visiting sign-in/sign-up page -> Redirect to dashboard
  if ((accessToken || refreshToken) && (pathname === '/signin' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // 2. Allow access to public pages
  const isPublicPath = PUBLIC_PATHS.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  )

  if (isPublicPath) {
    return NextResponse.next()
  }

  // 3. If not logged in (both tokens missing) -> Redirect to signin
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL('/signin', req.url)
    if (pathname !== '/signin') {
        loginUrl.searchParams.set('callbackUrl', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
