import { WorkflowsPage } from '@page-objects/workflows'
import { test as base, expect } from '@playwright/test'

export interface WorkflowFixtures {
  workflowsPage: WorkflowsPage
}

export const test = base.extend<WorkflowFixtures>({
  workflowsPage: async ({ page }, use) => {
    const workflowsPage = new WorkflowsPage(page)
    await use(workflowsPage)
  },
})

export { expect }
