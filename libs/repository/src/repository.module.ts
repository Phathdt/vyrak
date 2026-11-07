import { Module } from '@nestjs/common'
import { ProjectModule } from '@vyrak/project'

// Token for WorkflowRepositoryRepository - will be provided by WorkflowCoreModule
export const WORKFLOW_REPOSITORY_REPOSITORY = Symbol('WORKFLOW_REPOSITORY_REPOSITORY')

/**
 * Repository module for workflow-repository resolution.
 *
 * NOTE: This module does NOT provide WorkflowRepositoryResolver.
 * WorkflowRepositoryResolver should be provided by WorkflowCoreModule,
 * which has access to both WORKFLOW_REPOSITORY_REPOSITORY and GIT_REPOSITORY_REPOSITORY.
 *
 * This module only exports domain interfaces and types.
 */
@Module({
  imports: [ProjectModule],
  providers: [],
  exports: [],
})
export class RepositoryModule {}
