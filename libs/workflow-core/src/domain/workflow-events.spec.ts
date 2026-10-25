import { describe, it, expect } from 'vitest'
import {
  WorkflowEventType,
  WorkflowEvent,
  createWorkflowEvent,
  validateEventPayload,
  sanitizeEvent,
  InvalidEventPayloadError,
  isRunCreatedPayload,
  isStepStartedPayload,
  isStepCompletedPayload,
  isApprovalRequestedPayload,
  isApprovalDecidedPayload,
  isRunSucceededPayload,
  isRunFailedPayload,
  isRunCancelledPayload,
  isRetryScheduledPayload,
  isRecoveryPerformedPayload,
} from './workflow-events'

describe('Workflow Events', () => {
  const runId = '550e8400-e29b-41d4-a716-446655440000'
  const organizationId = '660e8400-e29b-41d4-a716-446655440000'

  describe('validateEventPayload', () => {
    describe('RUN_CREATED', () => {
      it('validates valid RunCreatedPayload', () => {
        const payload = {
          workflowKey: 'checkout-flow',
          workflowVersion: '1.0.0',
          projectId: '770e8400-e29b-41d4-a716-446655440000',
          initiatedByUserId: '880e8400-e29b-41d4-a716-446655440000',
          idempotencyKey: '990e8400-e29b-41d4-a716-446655440000',
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_CREATED, payload)).not.toThrow()
      })

      it('throws on invalid version format', () => {
        const payload = {
          workflowKey: 'checkout-flow',
          workflowVersion: 'v1.0',
          projectId: '770e8400-e29b-41d4-a716-446655440000',
          initiatedByUserId: '880e8400-e29b-41d4-a716-446655440000',
          idempotencyKey: '990e8400-e29b-41d4-a716-446655440000',
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_CREATED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })

      it('throws on missing required fields', () => {
        const payload = {
          workflowKey: 'checkout-flow',
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_CREATED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })

      it('throws on invalid UUID format', () => {
        const payload = {
          workflowKey: 'checkout-flow',
          workflowVersion: '1.0.0',
          projectId: 'invalid-uuid',
          initiatedByUserId: '880e8400-e29b-41d4-a716-446655440000',
          idempotencyKey: '990e8400-e29b-41d4-a716-446655440000',
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_CREATED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })
    })

    describe('STEP_STARTED', () => {
      it('validates valid StepStartedPayload', () => {
        const payload = {
          stepKey: 'validate-cart',
          stepType: 'agent',
          attempt: 1,
        }
        expect(() => validateEventPayload(WorkflowEventType.STEP_STARTED, payload)).not.toThrow()
      })

      it('throws on invalid attempt number', () => {
        const payload = {
          stepKey: 'validate-cart',
          stepType: 'agent',
          attempt: 0,
        }
        expect(() => validateEventPayload(WorkflowEventType.STEP_STARTED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })

      it('throws on non-integer attempt', () => {
        const payload = {
          stepKey: 'validate-cart',
          stepType: 'agent',
          attempt: 1.5,
        }
        expect(() => validateEventPayload(WorkflowEventType.STEP_STARTED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })
    })

    describe('STEP_COMPLETED', () => {
      it('validates valid StepCompletedPayload', () => {
        const payload = {
          stepKey: 'validate-cart',
          status: 'succeeded',
          durationMs: 1500,
        }
        expect(() => validateEventPayload(WorkflowEventType.STEP_COMPLETED, payload)).not.toThrow()
      })

      it('validates with optional error fields', () => {
        const payload = {
          stepKey: 'validate-cart',
          status: 'failed',
          durationMs: 1500,
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid cart item',
          errorClassification: 'retryable' as const,
        }
        expect(() => validateEventPayload(WorkflowEventType.STEP_COMPLETED, payload)).not.toThrow()
      })

      it('throws on invalid error classification', () => {
        const payload = {
          stepKey: 'validate-cart',
          status: 'failed',
          durationMs: 1500,
          errorClassification: 'unknown',
        }
        expect(() => validateEventPayload(WorkflowEventType.STEP_COMPLETED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })

      it('throws on negative duration', () => {
        const payload = {
          stepKey: 'validate-cart',
          status: 'succeeded',
          durationMs: -100,
        }
        expect(() => validateEventPayload(WorkflowEventType.STEP_COMPLETED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })
    })

    describe('APPROVAL_REQUESTED', () => {
      it('validates valid ApprovalRequestedPayload', () => {
        const payload = {
          stepKey: 'manager-approval',
          requiredApprovers: [
            '880e8400-e29b-41d4-a716-446655440000',
            '990e8400-e29b-41d4-a716-446655440000',
          ],
        }
        expect(() =>
          validateEventPayload(WorkflowEventType.APPROVAL_REQUESTED, payload),
        ).not.toThrow()
      })

      it('validates with optional deadline', () => {
        const payload = {
          stepKey: 'manager-approval',
          requiredApprovers: ['880e8400-e29b-41d4-a716-446655440000'],
          approvalDeadlineAt: new Date('2026-12-31T23:59:59Z'),
        }
        expect(() =>
          validateEventPayload(WorkflowEventType.APPROVAL_REQUESTED, payload),
        ).not.toThrow()
      })

      it('throws on invalid approver UUID', () => {
        const payload = {
          stepKey: 'manager-approval',
          requiredApprovers: ['invalid-uuid'],
        }
        expect(() => validateEventPayload(WorkflowEventType.APPROVAL_REQUESTED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })
    })

    describe('APPROVAL_DECIDED', () => {
      it('validates approved decision', () => {
        const payload = {
          stepKey: 'manager-approval',
          decision: 'approved' as const,
          approvedByUserId: '880e8400-e29b-41d4-a716-446655440000',
          reason: 'Looks good',
        }
        expect(() => validateEventPayload(WorkflowEventType.APPROVAL_DECIDED, payload)).not.toThrow()
      })

      it('validates rejected decision', () => {
        const payload = {
          stepKey: 'manager-approval',
          decision: 'rejected' as const,
          approvedByUserId: '880e8400-e29b-41d4-a716-446655440000',
          reason: 'Needs revision',
        }
        expect(() => validateEventPayload(WorkflowEventType.APPROVAL_DECIDED, payload)).not.toThrow()
      })

      it('throws on invalid decision value', () => {
        const payload = {
          stepKey: 'manager-approval',
          decision: 'maybe',
          approvedByUserId: '880e8400-e29b-41d4-a716-446655440000',
        }
        expect(() => validateEventPayload(WorkflowEventType.APPROVAL_DECIDED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })
    })

    describe('RUN_SUCCEEDED', () => {
      it('validates valid RunSucceededPayload', () => {
        const payload = {
          totalDurationMs: 5000,
          stepCount: 3,
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_SUCCEEDED, payload)).not.toThrow()
      })

      it('throws on zero step count', () => {
        const payload = {
          totalDurationMs: 5000,
          stepCount: 0,
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_SUCCEEDED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })
    })

    describe('RUN_FAILED', () => {
      it('validates valid RunFailedPayload', () => {
        const payload = {
          failedStepKey: 'validate-cart',
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Cart validation failed',
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_FAILED, payload)).not.toThrow()
      })

      it('throws on empty error code', () => {
        const payload = {
          failedStepKey: 'validate-cart',
          errorCode: '',
          errorMessage: 'Cart validation failed',
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_FAILED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })
    })

    describe('RUN_CANCELLED', () => {
      it('validates with user ID', () => {
        const payload = {
          reason: 'User requested cancellation',
          cancelledByUserId: '880e8400-e29b-41d4-a716-446655440000',
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_CANCELLED, payload)).not.toThrow()
      })

      it('validates without user ID', () => {
        const payload = {
          reason: 'Timeout exceeded',
        }
        expect(() => validateEventPayload(WorkflowEventType.RUN_CANCELLED, payload)).not.toThrow()
      })
    })

    describe('RETRY_SCHEDULED', () => {
      it('validates valid RetryScheduledPayload', () => {
        const payload = {
          stepKey: 'api-call',
          nextAttempt: 2,
          scheduledForMs: 5000,
          reason: 'Network timeout',
        }
        expect(() => validateEventPayload(WorkflowEventType.RETRY_SCHEDULED, payload)).not.toThrow()
      })

      it('throws on invalid next attempt', () => {
        const payload = {
          stepKey: 'api-call',
          nextAttempt: 0,
          scheduledForMs: 5000,
          reason: 'Network timeout',
        }
        expect(() => validateEventPayload(WorkflowEventType.RETRY_SCHEDULED, payload)).toThrow(
          InvalidEventPayloadError,
        )
      })
    })

    describe('RECOVERY_PERFORMED', () => {
      it('validates successful recovery', () => {
        const payload = {
          recoveryType: 'rollback',
          affectedStepKey: 'database-update',
          recoveryResult: 'success' as const,
        }
        expect(() =>
          validateEventPayload(WorkflowEventType.RECOVERY_PERFORMED, payload),
        ).not.toThrow()
      })

      it('validates failed recovery', () => {
        const payload = {
          recoveryType: 'compensate',
          recoveryResult: 'failure' as const,
        }
        expect(() =>
          validateEventPayload(WorkflowEventType.RECOVERY_PERFORMED, payload),
        ).not.toThrow()
      })
    })

    it('throws on unknown event type', () => {
      expect(() => validateEventPayload('unknown' as WorkflowEventType, {})).toThrow(
        InvalidEventPayloadError,
      )
    })
  })

  describe('createWorkflowEvent', () => {
    it('creates event with valid payload', () => {
      const payload = {
        workflowKey: 'checkout-flow',
        workflowVersion: '1.0.0',
        projectId: '770e8400-e29b-41d4-a716-446655440000',
        initiatedByUserId: '880e8400-e29b-41d4-a716-446655440000',
        idempotencyKey: '990e8400-e29b-41d4-a716-446655440000',
      }
      const event = createWorkflowEvent(
        runId,
        organizationId,
        WorkflowEventType.RUN_CREATED,
        1,
        payload,
      )

      expect(event.id).toBeDefined()
      expect(event.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
      expect(event.runId).toBe(runId)
      expect(event.organizationId).toBe(organizationId)
      expect(event.eventType).toBe(WorkflowEventType.RUN_CREATED)
      expect(event.sequence).toBe(1)
      expect(event.payload).toEqual(payload)
      expect(event.createdAt).toBeInstanceOf(Date)
    })

    it('creates event with metadata', () => {
      const payload = {
        stepKey: 'validate-cart',
        stepType: 'agent',
        attempt: 1,
      }
      const metadata = {
        executionContext: 'background',
        priority: 'high',
      }
      const event = createWorkflowEvent(
        runId,
        organizationId,
        WorkflowEventType.STEP_STARTED,
        2,
        payload,
        metadata,
      )

      expect(event.metadata).toEqual(metadata)
    })

    it('throws on invalid payload', () => {
      const payload = { workflowKey: 'test' }
      expect(() =>
        createWorkflowEvent(runId, organizationId, WorkflowEventType.RUN_CREATED, 1, payload),
      ).toThrow(InvalidEventPayloadError)
    })

    it('assigns unique IDs to events', () => {
      const payload = {
        stepKey: 'step-1',
        stepType: 'agent',
        attempt: 1,
      }
      const event1 = createWorkflowEvent(
        runId,
        organizationId,
        WorkflowEventType.STEP_STARTED,
        1,
        payload,
      )
      const event2 = createWorkflowEvent(
        runId,
        organizationId,
        WorkflowEventType.STEP_STARTED,
        2,
        payload,
      )

      expect(event1.id).not.toBe(event2.id)
    })

    it('creates events with monotonically increasing sequences', () => {
      const payload = {
        stepKey: 'step-1',
        stepType: 'agent',
        attempt: 1,
      }
      const event1 = createWorkflowEvent(
        runId,
        organizationId,
        WorkflowEventType.STEP_STARTED,
        1,
        payload,
      )
      const event2 = createWorkflowEvent(
        runId,
        organizationId,
        WorkflowEventType.STEP_STARTED,
        2,
        payload,
      )

      expect(event2.sequence).toBeGreaterThan(event1.sequence)
    })
  })

  describe('sanitizeEvent', () => {
    it('redacts password fields', () => {
      const event: WorkflowEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        runId,
        organizationId,
        eventType: WorkflowEventType.STEP_COMPLETED,
        sequence: 1,
        payload: {
          stepKey: 'authenticate',
          status: 'succeeded',
          durationMs: 1000,
          userPassword: 'my-secret-password',
        },
        createdAt: new Date(),
      }

      const sanitized = sanitizeEvent(event)
      const payload = sanitized.payload as Record<string, unknown>
      expect(payload.userPassword).toBe('[REDACTED]')
      expect(payload.stepKey).toBe('authenticate')
    })

    it('redacts token fields', () => {
      const event: WorkflowEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        runId,
        organizationId,
        eventType: WorkflowEventType.STEP_COMPLETED,
        sequence: 1,
        payload: {
          stepKey: 'api-call',
          status: 'succeeded',
          durationMs: 1000,
          authToken: 'bearer-token-123',
          accessToken: 'access-token-456',
        },
        createdAt: new Date(),
      }

      const sanitized = sanitizeEvent(event)
      const payload = sanitized.payload as Record<string, unknown>
      expect(payload.authToken).toBe('[REDACTED]')
      expect(payload.accessToken).toBe('[REDACTED]')
    })

    it('redacts secret and apikey fields', () => {
      const event: WorkflowEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        runId,
        organizationId,
        eventType: WorkflowEventType.STEP_COMPLETED,
        sequence: 1,
        payload: {
          stepKey: 'authenticate',
          status: 'succeeded',
          durationMs: 1000,
          apiKey: 'secret-key-123',
          clientSecret: 'client-secret-456',
        },
        createdAt: new Date(),
      }

      const sanitized = sanitizeEvent(event)
      const payload = sanitized.payload as Record<string, unknown>
      expect(payload.apiKey).toBe('[REDACTED]')
      expect(payload.clientSecret).toBe('[REDACTED]')
    })

    it('redacts authorization fields', () => {
      const event: WorkflowEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        runId,
        organizationId,
        eventType: WorkflowEventType.STEP_COMPLETED,
        sequence: 1,
        payload: {
          stepKey: 'authenticate',
          status: 'succeeded',
          durationMs: 1000,
          authorization: 'Bearer token',
        },
        createdAt: new Date(),
      }

      const sanitized = sanitizeEvent(event)
      const payload = sanitized.payload as Record<string, unknown>
      expect(payload.authorization).toBe('[REDACTED]')
    })

    it('preserves non-sensitive fields', () => {
      const event: WorkflowEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        runId,
        organizationId,
        eventType: WorkflowEventType.RUN_SUCCEEDED,
        sequence: 1,
        payload: {
          totalDurationMs: 5000,
          stepCount: 3,
        },
        createdAt: new Date(),
      }

      const sanitized = sanitizeEvent(event)
      expect(sanitized.payload).toEqual({
        totalDurationMs: 5000,
        stepCount: 3,
      })
    })

    it('handles nested sensitive data', () => {
      const event: WorkflowEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        runId,
        organizationId,
        eventType: WorkflowEventType.STEP_STARTED,
        sequence: 1,
        payload: {
          stepKey: 'login',
          stepType: 'agent',
          attempt: 1,
        },
        metadata: {
          userCredentials: {
            username: 'user@example.com',
            secret: 'hidden-secret',
            apiKey: 'api-key-123',
          },
        },
        createdAt: new Date(),
      }

      const sanitized = sanitizeEvent(event)
      const creds = sanitized.metadata?.userCredentials as Record<string, unknown>
      expect(creds.secret).toBe('[REDACTED]')
      expect(creds.apiKey).toBe('[REDACTED]')
      expect(creds.username).toBe('user@example.com')
    })

    it('handles arrays with sensitive data', () => {
      const event: WorkflowEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        runId,
        organizationId,
        eventType: WorkflowEventType.STEP_COMPLETED,
        sequence: 1,
        payload: {
          stepKey: 'batch-update',
          status: 'succeeded',
          durationMs: 2000,
          items: [
            { id: 1, password: 'secret1' },
            { id: 2, password: 'secret2' },
          ],
        },
        createdAt: new Date(),
      }

      const sanitized = sanitizeEvent(event)
      const payload = sanitized.payload as Record<string, unknown>
      const items = payload.items as Array<Record<string, unknown>>
      expect(items[0].password).toBe('[REDACTED]')
      expect(items[1].password).toBe('[REDACTED]')
      expect(items[0].id).toBe(1)
      expect(items[1].id).toBe(2)
    })

    it('handles null and undefined values', () => {
      const event: WorkflowEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        runId,
        organizationId,
        eventType: WorkflowEventType.STEP_COMPLETED,
        sequence: 1,
        payload: {
          stepKey: 'test',
          status: 'succeeded',
          durationMs: 1000,
          nullValue: null,
          undefinedValue: undefined,
        },
        createdAt: new Date(),
      }

      const sanitized = sanitizeEvent(event)
      const payload = sanitized.payload as Record<string, unknown>
      expect(payload.nullValue).toBeNull()
      expect(payload.undefinedValue).toBeUndefined()
    })

    it('does not mutate original event', () => {
      const event: WorkflowEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        runId,
        organizationId,
        eventType: WorkflowEventType.STEP_COMPLETED,
        sequence: 1,
        payload: {
          stepKey: 'authenticate',
          status: 'succeeded',
          durationMs: 1000,
          password: 'my-secret',
        },
        createdAt: new Date(),
      }

      const originalPayload = JSON.parse(JSON.stringify(event.payload))
      sanitizeEvent(event)

      expect(event.payload).toEqual(originalPayload)
    })
  })

  describe('Type Guards', () => {
    it('isRunCreatedPayload identifies valid payload', () => {
      const payload = {
        workflowKey: 'checkout-flow',
        workflowVersion: '1.0.0',
        projectId: '770e8400-e29b-41d4-a716-446655440000',
        initiatedByUserId: '880e8400-e29b-41d4-a716-446655440000',
        idempotencyKey: '990e8400-e29b-41d4-a716-446655440000',
      }
      expect(isRunCreatedPayload(payload)).toBe(true)
      expect(isStepStartedPayload(payload)).toBe(false)
    })

    it('isStepStartedPayload identifies valid payload', () => {
      const payload = {
        stepKey: 'validate-cart',
        stepType: 'agent',
        attempt: 1,
      }
      expect(isStepStartedPayload(payload)).toBe(true)
      expect(isRunCreatedPayload(payload)).toBe(false)
    })

    it('isStepCompletedPayload identifies valid payload', () => {
      const payload = {
        stepKey: 'validate-cart',
        status: 'succeeded',
        durationMs: 1500,
      }
      expect(isStepCompletedPayload(payload)).toBe(true)
      expect(isStepStartedPayload(payload)).toBe(false)
    })

    it('isApprovalRequestedPayload identifies valid payload', () => {
      const payload = {
        stepKey: 'manager-approval',
        requiredApprovers: ['880e8400-e29b-41d4-a716-446655440000'],
      }
      expect(isApprovalRequestedPayload(payload)).toBe(true)
      expect(isApprovalDecidedPayload(payload)).toBe(false)
    })

    it('isApprovalDecidedPayload identifies valid payload', () => {
      const payload = {
        stepKey: 'manager-approval',
        decision: 'approved' as const,
        approvedByUserId: '880e8400-e29b-41d4-a716-446655440000',
      }
      expect(isApprovalDecidedPayload(payload)).toBe(true)
      expect(isApprovalRequestedPayload(payload)).toBe(false)
    })

    it('isRunSucceededPayload identifies valid payload', () => {
      const payload = {
        totalDurationMs: 5000,
        stepCount: 3,
      }
      expect(isRunSucceededPayload(payload)).toBe(true)
      expect(isRunFailedPayload(payload)).toBe(false)
    })

    it('isRunFailedPayload identifies valid payload', () => {
      const payload = {
        failedStepKey: 'validate-cart',
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Cart validation failed',
      }
      expect(isRunFailedPayload(payload)).toBe(true)
      expect(isRunSucceededPayload(payload)).toBe(false)
    })

    it('isRunCancelledPayload identifies valid payload', () => {
      const payload = {
        reason: 'User requested cancellation',
      }
      expect(isRunCancelledPayload(payload)).toBe(true)
      expect(isRunFailedPayload(payload)).toBe(false)
    })

    it('isRetryScheduledPayload identifies valid payload', () => {
      const payload = {
        stepKey: 'api-call',
        nextAttempt: 2,
        scheduledForMs: 5000,
        reason: 'Network timeout',
      }
      expect(isRetryScheduledPayload(payload)).toBe(true)
      expect(isStepStartedPayload(payload)).toBe(false)
    })

    it('isRecoveryPerformedPayload identifies valid payload', () => {
      const payload = {
        recoveryType: 'rollback',
        recoveryResult: 'success' as const,
      }
      expect(isRecoveryPerformedPayload(payload)).toBe(true)
      expect(isRunFailedPayload(payload)).toBe(false)
    })

    it('all type guards return false for invalid payloads', () => {
      const invalidPayload = { random: 'data' }
      expect(isRunCreatedPayload(invalidPayload)).toBe(false)
      expect(isStepStartedPayload(invalidPayload)).toBe(false)
      expect(isStepCompletedPayload(invalidPayload)).toBe(false)
      expect(isApprovalRequestedPayload(invalidPayload)).toBe(false)
      expect(isApprovalDecidedPayload(invalidPayload)).toBe(false)
      expect(isRunSucceededPayload(invalidPayload)).toBe(false)
      expect(isRunFailedPayload(invalidPayload)).toBe(false)
      expect(isRunCancelledPayload(invalidPayload)).toBe(false)
      expect(isRetryScheduledPayload(invalidPayload)).toBe(false)
      expect(isRecoveryPerformedPayload(invalidPayload)).toBe(false)
    })
  })
})
