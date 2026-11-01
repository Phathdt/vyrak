export class ProjectDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ProjectSlugExistsError extends ProjectDomainError {
  constructor(public readonly slug: string) {
    super(`Project slug already exists in this organization: ${slug}`)
  }
}

export class ProjectNotFoundError extends ProjectDomainError {
  constructor(public readonly projectId: string) {
    super(`Project not found: ${projectId}`)
  }
}
