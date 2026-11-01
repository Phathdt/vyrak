import { describe, expect, it } from 'vitest'

import { AuthDomainError, InvalidCredentialsError } from './auth.exceptions'

describe('AuthDomainError', () => {
  it('should set message and preserve name from constructor', () => {
    const error = new AuthDomainError('Something went wrong')

    expect(error.message).toBe('Something went wrong')
    expect(error.name).toBe('AuthDomainError')
  })

  it('should be an instance of Error', () => {
    const error = new AuthDomainError('boom')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AuthDomainError)
  })

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new AuthDomainError('thrown')
    }).toThrow('thrown')
  })
})

describe('InvalidCredentialsError', () => {
  it('should use the fixed "Invalid credentials" message', () => {
    const error = new InvalidCredentialsError()

    expect(error.message).toBe('Invalid credentials')
  })

  it('should expose its own class name as name', () => {
    const error = new InvalidCredentialsError()

    expect(error.name).toBe('InvalidCredentialsError')
  })

  it('should extend AuthDomainError and Error', () => {
    const error = new InvalidCredentialsError()

    expect(error).toBeInstanceOf(InvalidCredentialsError)
    expect(error).toBeInstanceOf(AuthDomainError)
    expect(error).toBeInstanceOf(Error)
  })

  it('should be distinguishable from the base error via name', () => {
    const base = new AuthDomainError('Invalid credentials')
    const specific = new InvalidCredentialsError()

    expect(base.message).toBe(specific.message)
    expect(specific.name).not.toBe(base.name)
  })
})
