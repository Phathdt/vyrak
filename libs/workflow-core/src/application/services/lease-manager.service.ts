import { randomUUID } from 'crypto'

import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common'

import type { IWorkflowRepository } from '../../domain/interfaces'
import { WORKFLOW_REPOSITORY } from '../../infras/di'

/**
 * Lease Manager Service
 * Manages job ownership leases and heartbeat monitoring
 *
 * Configuration:
 * - Lease duration: 5 minutes (300,000ms)
 * - Heartbeat interval: 30 seconds (30,000ms)
 * - Worker ID: random UUID per process
 */
@Injectable()
export class LeaseManager implements OnModuleDestroy {
  private readonly logger = new Logger(LeaseManager.name)
  private readonly workerId: string
  private readonly leaseDurationMs: number = 300_000 // 5 minutes
  private readonly heartbeatIntervalMs: number = 30_000 // 30 seconds
  private readonly activeLeases = new Map<string, NodeJS.Timeout>()

  constructor(@Inject(WORKFLOW_REPOSITORY) private readonly workflowRepo: IWorkflowRepository) {
    this.workerId = randomUUID()
    this.logger.log(`LeaseManager initialized with worker ID: ${this.workerId}`)
  }

  /**
   * Acquire lease for workflow run
   * Starts heartbeat timer on success
   * @returns true if lease acquired successfully
   */
  async acquireLease(runId: string): Promise<boolean> {
    try {
      const acquired = await this.workflowRepo.acquireLease(runId, this.workerId, this.leaseDurationMs)

      if (acquired) {
        this.logger.log(`Acquired lease for run: ${runId}`)
        this.startHeartbeat(runId)
        return true
      }

      this.logger.debug(`Failed to acquire lease for run: ${runId} (already owned)`)
      return false
    } catch (error) {
      this.logger.error(`Error acquiring lease for run ${runId}: ${error}`)
      return false
    }
  }

  /**
   * Renew lease for workflow run
   * Called by heartbeat mechanism
   * @returns true if renewed successfully
   */
  async renewLease(runId: string): Promise<boolean> {
    try {
      const renewed = await this.workflowRepo.renewLease(runId, this.workerId, this.leaseDurationMs)

      if (!renewed) {
        this.logger.warn(`Failed to renew lease for run: ${runId} (not owner or expired)`)
        this.stopHeartbeat(runId)
        return false
      }

      this.logger.debug(`Renewed lease for run: ${runId}`)
      return true
    } catch (error) {
      this.logger.error(`Error renewing lease for run ${runId}: ${error}`)
      this.stopHeartbeat(runId)
      return false
    }
  }

  /**
   * Release lease for workflow run
   * Stops heartbeat timer
   */
  async releaseLease(runId: string): Promise<void> {
    try {
      this.stopHeartbeat(runId)
      await this.workflowRepo.releaseLease(runId, this.workerId)
      this.logger.log(`Released lease for run: ${runId}`)
    } catch (error) {
      this.logger.error(`Error releasing lease for run ${runId}: ${error}`)
    }
  }

  /**
   * Find expired leases
   * Used for recovery mechanisms (Epic 7)
   */
  async findExpiredLeases(limit?: number): Promise<string[]> {
    try {
      return await this.workflowRepo.findExpiredLeases(limit)
    } catch (error) {
      this.logger.error(`Error finding expired leases: ${error}`)
      return []
    }
  }

  /**
   * Check if this worker owns the lease for a run
   */
  hasActiveLease(runId: string): boolean {
    return this.activeLeases.has(runId)
  }

  /**
   * Get worker ID
   */
  getWorkerId(): string {
    return this.workerId
  }

  /**
   * Start heartbeat timer for a run
   * Renews lease periodically
   */
  private startHeartbeat(runId: string): void {
    // Clear existing timer if any
    this.stopHeartbeat(runId)

    const timer = setInterval(async () => {
      const renewed = await this.renewLease(runId)
      if (!renewed) {
        this.logger.warn(`Heartbeat failed for run ${runId}, stopping timer`)
        this.stopHeartbeat(runId)
      }
    }, this.heartbeatIntervalMs)

    // Store timer reference
    this.activeLeases.set(runId, timer)
    this.logger.debug(`Started heartbeat for run: ${runId}`)
  }

  /**
   * Stop heartbeat timer for a run
   */
  private stopHeartbeat(runId: string): void {
    const timer = this.activeLeases.get(runId)
    if (timer) {
      clearInterval(timer)
      this.activeLeases.delete(runId)
      this.logger.debug(`Stopped heartbeat for run: ${runId}`)
    }
  }

  /**
   * Cleanup on module destroy
   * Release all active leases
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down LeaseManager, releasing all leases...')

    const runIds = Array.from(this.activeLeases.keys())
    for (const runId of runIds) {
      await this.releaseLease(runId)
    }

    this.logger.log('LeaseManager shutdown complete')
  }
}
