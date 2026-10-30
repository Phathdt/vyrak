/**
 * User Entity
 * Core user domain model with authentication credentials
 */
export interface UserEntity {
  id: string
  email: string
  name: string | null
  emailVerified: boolean
  image: string | null
  passwordHash: string | null
  createdAt: Date
  updatedAt: Date
}
