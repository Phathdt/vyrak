import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { IWorkflowRepository } from '../../domain/interfaces'
import { LeaseManager } from './lease-manager.service'

describe('LeaseManager', () => {
  let leaseManager: LeaseManager
  let mockRepo: jest.Mocked<IWorkflowRepository>

  beforeEach(() => {
    // Create mock repository
    mockRepo = {
      acquireLease: vi.fn(),
      renewLease: vi.fn(),
      releaseLease: vi.fn(),
      updateHeartbeat: vi.fn(),
      findExpiredLeases: vi.fn(),
      createRun: vi.fn(),
      findRunById: vi.fn(),
      updateRunState: vi.fn(),
      findRunByIdempotencyKey: vi.fn(),
      cancelRun: vi.fn(),
    } as unknown as jest.Mocked<IWorkflowRepository>

    // Create lease manager instance
    leaseManager = new LeaseManager(mockRepo)

    // Use fake timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('acquireLease', () => {
    it('should acquire lease successfully and start heartbeat', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockResolvedValue(true)

      const result = await leaseManager.acquireLease(runId)

      expect(result).toBe(true)
      expect(mockRepo.acquireLease).toHaveBeenCalledWith(runId, expect.any(String), 300_000)
      expect(leaseManager.hasActiveLease(runId)).toBe(true)
    })

    it('should return false if lease already owned', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockResolvedValue(false)

      const result = await leaseManager.acquireLease(runId)

      expect(result).toBe(false)
      expect(leaseManager.hasActiveLease(runId)).toBe(false)
    })

    it('should handle acquisition errors', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockRejectedValue(new Error('DB error'))

      const result = await leaseManager.acquireLease(runId)

      expect(result).toBe(false)
      expect(leaseManager.hasActiveLease(runId)).toBe(false)
    })
  })

  describe('renewLease', () => {
    it('should renew lease successfully', async () => {
      const runId = 'run-123'
      mockRepo.renewLease.mockResolvedValue(true)

      const result = await leaseManager.renewLease(runId)

      expect(result).toBe(true)
      expect(mockRepo.renewLease).toHaveBeenCalledWith(runId, expect.any(String), 300_000)
    })

    it('should stop heartbeat if renewal fails', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockResolvedValue(true)
      mockRepo.renewLease.mockResolvedValue(false)

      // Acquire lease first
      await leaseManager.acquireLease(runId)
      expect(leaseManager.hasActiveLease(runId)).toBe(true)

      // Renewal fails
      const result = await leaseManager.renewLease(runId)

      expect(result).toBe(false)
      expect(leaseManager.hasActiveLease(runId)).toBe(false)
    })

    it('should handle renewal errors', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockResolvedValue(true)
      mockRepo.renewLease.mockRejectedValue(new Error('DB error'))

      // Acquire lease first
      await leaseManager.acquireLease(runId)

      // Renewal throws error
      const result = await leaseManager.renewLease(runId)

      expect(result).toBe(false)
      expect(leaseManager.hasActiveLease(runId)).toBe(false)
    })
  })

  describe('releaseLease', () => {
    it('should release lease and stop heartbeat', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockResolvedValue(true)
      mockRepo.releaseLease.mockResolvedValue(undefined)

      // Acquire lease first
      await leaseManager.acquireLease(runId)
      expect(leaseManager.hasActiveLease(runId)).toBe(true)

      // Release lease
      await leaseManager.releaseLease(runId)

      expect(mockRepo.releaseLease).toHaveBeenCalledWith(runId, expect.any(String))
      expect(leaseManager.hasActiveLease(runId)).toBe(false)
    })

    it('should handle release errors gracefully', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockResolvedValue(true)
      mockRepo.releaseLease.mockRejectedValue(new Error('DB error'))

      // Acquire lease first
      await leaseManager.acquireLease(runId)

      // Release should not throw
      await expect(leaseManager.releaseLease(runId)).resolves.toBeUndefined()

      // Heartbeat should still be stopped
      expect(leaseManager.hasActiveLease(runId)).toBe(false)
    })
  })

  describe('heartbeat mechanism', () => {
    it('should renew lease periodically', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockResolvedValue(true)
      mockRepo.renewLease.mockResolvedValue(true)

      // Acquire lease
      await leaseManager.acquireLease(runId)

      // Fast-forward 30 seconds (heartbeat interval)
      await vi.advanceTimersByTimeAsync(30_000)

      // Should have renewed once
      expect(mockRepo.renewLease).toHaveBeenCalledTimes(1)

      // Fast-forward another 30 seconds
      await vi.advanceTimersByTimeAsync(30_000)

      // Should have renewed twice
      expect(mockRepo.renewLease).toHaveBeenCalledTimes(2)
    })

    it('should stop heartbeat after failed renewal', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockResolvedValue(true)
      mockRepo.renewLease.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

      // Acquire lease
      await leaseManager.acquireLease(runId)

      // First heartbeat succeeds
      await vi.advanceTimersByTimeAsync(30_000)
      expect(mockRepo.renewLease).toHaveBeenCalledTimes(1)
      expect(leaseManager.hasActiveLease(runId)).toBe(true)

      // Second heartbeat fails
      await vi.advanceTimersByTimeAsync(30_000)
      expect(mockRepo.renewLease).toHaveBeenCalledTimes(2)
      expect(leaseManager.hasActiveLease(runId)).toBe(false)

      // No more renewals after failure
      await vi.advanceTimersByTimeAsync(30_000)
      expect(mockRepo.renewLease).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple concurrent leases', async () => {
      const runId1 = 'run-1'
      const runId2 = 'run-2'
      mockRepo.acquireLease.mockResolvedValue(true)
      mockRepo.renewLease.mockResolvedValue(true)

      // Acquire two leases
      await leaseManager.acquireLease(runId1)
      await leaseManager.acquireLease(runId2)

      expect(leaseManager.hasActiveLease(runId1)).toBe(true)
      expect(leaseManager.hasActiveLease(runId2)).toBe(true)

      // Fast-forward heartbeat interval
      await vi.advanceTimersByTimeAsync(30_000)

      // Both should renew
      expect(mockRepo.renewLease).toHaveBeenCalledWith(runId1, expect.any(String), 300_000)
      expect(mockRepo.renewLease).toHaveBeenCalledWith(runId2, expect.any(String), 300_000)
    })
  })

  describe('findExpiredLeases', () => {
    it('should return expired lease IDs', async () => {
      const expiredIds = ['run-1', 'run-2', 'run-3']
      mockRepo.findExpiredLeases.mockResolvedValue(expiredIds)

      const result = await leaseManager.findExpiredLeases(10)

      expect(result).toEqual(expiredIds)
      expect(mockRepo.findExpiredLeases).toHaveBeenCalledWith(10)
    })

    it('should handle errors and return empty array', async () => {
      mockRepo.findExpiredLeases.mockRejectedValue(new Error('DB error'))

      const result = await leaseManager.findExpiredLeases()

      expect(result).toEqual([])
    })
  })

  describe('getWorkerId', () => {
    it('should return consistent worker ID', () => {
      const workerId1 = leaseManager.getWorkerId()
      const workerId2 = leaseManager.getWorkerId()

      expect(workerId1).toBe(workerId2)
      expect(workerId1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })
  })

  describe('onModuleDestroy', () => {
    it('should release all active leases on shutdown', async () => {
      const runId1 = 'run-1'
      const runId2 = 'run-2'
      mockRepo.acquireLease.mockResolvedValue(true)
      mockRepo.releaseLease.mockResolvedValue(undefined)

      // Acquire multiple leases
      await leaseManager.acquireLease(runId1)
      await leaseManager.acquireLease(runId2)

      // Trigger shutdown
      await leaseManager.onModuleDestroy()

      // All leases should be released
      expect(mockRepo.releaseLease).toHaveBeenCalledWith(runId1, expect.any(String))
      expect(mockRepo.releaseLease).toHaveBeenCalledWith(runId2, expect.any(String))
      expect(leaseManager.hasActiveLease(runId1)).toBe(false)
      expect(leaseManager.hasActiveLease(runId2)).toBe(false)
    })

    it('should handle release errors during shutdown', async () => {
      const runId = 'run-123'
      mockRepo.acquireLease.mockResolvedValue(true)
      mockRepo.releaseLease.mockRejectedValue(new Error('DB error'))

      await leaseManager.acquireLease(runId)

      // Should not throw
      await expect(leaseManager.onModuleDestroy()).resolves.toBeUndefined()
    })
  })
})
