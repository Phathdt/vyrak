import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    const { status, message } = this.mapDomainException(exception)

    this.logger.error(`Exception caught: ${exception?.constructor?.name || 'Unknown'}`, exception)

    response.status(status).json({
      statusCode: status,
      message,
    })
  }

  private mapDomainException(error: unknown): { status: number; message: string } {
    if (!error || typeof error !== 'object') {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }
    }

    const errorName = error.constructor?.name || ''
    const errorMessage = (error as Error).message || 'An error occurred'

    // Map domain exceptions to HTTP status codes
    switch (errorName) {
      // 404 Not Found
      case 'UserNotFoundError':
      case 'OrganizationNotFoundError':
      case 'ProjectNotFoundError':
      case 'RepositoryNotFoundError':
      case 'WorkflowNotFoundError':
      case 'WorkflowRunNotFoundError':
      case 'StepRunNotFoundError':
      case 'InvitationNotFoundError':
      case 'ConversationNotFoundError':
      case 'MessageNotFoundError':
        return {
          status: HttpStatus.NOT_FOUND,
          message: errorMessage,
        }

      // 401 Unauthorized
      case 'InvalidCredentialsError':
        return {
          status: HttpStatus.UNAUTHORIZED,
          message: errorMessage,
        }

      // 403 Forbidden
      case 'NotOrganizationMemberError':
      case 'InsufficientPermissionsError':
      case 'CannotModifyOwnerError':
      case 'InvitationEmailMismatchError':
      case 'InvalidPhaseApprovalError':
      case 'InvalidPhaseSendBackError':
        return {
          status: HttpStatus.FORBIDDEN,
          message: errorMessage,
        }

      // 400 Bad Request - Default for domain errors
      default:
        // Check if it's a domain error (ends with Error and has message)
        if (errorName.endsWith('Error') && errorMessage) {
          return {
            status: HttpStatus.BAD_REQUEST,
            message: errorMessage,
          }
        }

        // 500 Internal Server Error - Unknown errors
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }
    }
  }
}
