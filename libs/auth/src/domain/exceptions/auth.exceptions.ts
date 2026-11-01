export class AuthDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export class InvalidCredentialsError extends AuthDomainError {
  constructor() {
    super('Invalid credentials')
  }
}
