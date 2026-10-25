import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

import { useAuthControllerGetCurrentUser } from '../api/generated/auth/auth'
import type {
  AuthResponseDtoUser,
  CurrentUserResponseDtoOrganizationsItem,
  CurrentUserResponseDtoUser,
} from '../api/generated/models'
import { setAuthToken } from '../lib/api-client'

const TOKEN_KEY = 'vyrak_access_token'

type User = CurrentUserResponseDtoUser
type Organization = CurrentUserResponseDtoOrganizationsItem

interface AuthContextType {
  user: User | null
  organizations: Organization[]
  accessToken: string | null
  isLoading: boolean
  setAuth: (token: string, user: AuthResponseDtoUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize token from localStorage
  const [accessToken, setAccessTokenState] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })

  // Sync token to api-client on mount and when it changes
  useEffect(() => {
    setAuthToken(accessToken)
  }, [accessToken])

  // Fetch current user when token is set
  const { data, isLoading, error } = useAuthControllerGetCurrentUser({
    query: {
      enabled: !!accessToken,
      retry: false,
    },
  })

  // Handle invalid token (only for 401, not for canceled requests)
  useEffect(() => {
    if (error && accessToken) {
      // Only logout on 401, not on canceled requests or network errors
      const axiosError = error as unknown
      if (
        axiosError &&
        typeof axiosError === 'object' &&
        'response' in axiosError &&
        axiosError.response &&
        typeof axiosError.response === 'object' &&
        'status' in axiosError.response &&
        axiosError.response.status === 401
      ) {
        logout()
      }
    }
  }, [error, accessToken])

  const setAuth = (token: string, _userData: AuthResponseDtoUser) => {
    // IMPORTANT: Set token in axios interceptor FIRST (synchronously)
    // before updating state to avoid race condition with React Query
    setAuthToken(token)
    localStorage.setItem(TOKEN_KEY, token)
    setAccessTokenState(token)
    // Note: user data will be fetched automatically via useAuthControllerGetCurrentUser
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setAccessTokenState(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user: data?.user ?? null,
        organizations: data?.organizations ?? [],
        accessToken,
        isLoading,
        setAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
