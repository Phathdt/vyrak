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
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])

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

  useEffect(() => {
    if (data && data.user) {
      setUser(data.user)
      setOrganizations(data.organizations || [])
    }
  }, [data])

  // Handle invalid token
  useEffect(() => {
    if (error && accessToken) {
      // Token is invalid, clear it
      logout()
    }
  }, [error, accessToken])

  const setAuth = (token: string, userData: AuthResponseDtoUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    setAccessTokenState(token)
    // Convert AuthResponseDtoUser to User format
    setUser({
      id: userData.id!,
      email: userData.email!,
      name: userData.name || null,
      image: null, // Not provided in login response
    })
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setAccessTokenState(null)
    setUser(null)
    setOrganizations([])
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
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
