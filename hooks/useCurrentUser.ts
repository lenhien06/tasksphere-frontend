import { useQuery } from '@tanstack/react-query'
import { UserType } from '@/app/types/user.schema'
import { AuthService } from '@/app/services/auth.service'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

export function useCurrentUser(options: { enabled?: boolean; required?: boolean } = {}) {
  const { setUser, setAccessAndRefreshToken, user: storedUser, accessToken } = useAuthStore()

  const { data, isError, error, isLoading } = useQuery<UserType | null, Error, UserType | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
        try {
            // If token is missing from Store (after F5), try to retrieve it from BFF via Cookie
            if (!accessToken) {
                const resToken = await AuthService.getMeToken();
                if (resToken?.accessToken) {
                    setAccessAndRefreshToken({
                        accessToken: resToken.accessToken,
                        refreshToken: resToken.refreshToken
                    });
                }
            }

            const res = await AuthService.getMe();
            return res.data;
        } catch (e: any) {
            if (e?.response?.status === 401 && !options.required) {
                return null;
            }
            throw e;
        }
    },
    staleTime: 60 * 1000, 
    enabled: (options.enabled ?? true) && !DEV_BYPASS_AUTH,
    refetchOnMount: true, 
    refetchOnWindowFocus: false,
    retry: 1,
    // Use user from store as initial data to avoid flicker in Header
    initialData: storedUser || undefined
  })

  useEffect(() => {
    if (data) {
      setUser(data)
    } else if (data === null && !options.required) {
      setUser(null)
    }
  }, [data, setUser, options.required])

  return {
    data: data || storedUser,
    isLoading,
    isError,
    error
  }
}
