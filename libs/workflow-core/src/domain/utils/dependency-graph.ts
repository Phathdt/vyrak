import type { SubTaskEntity, SubTaskDependency } from '../entities/subtask.entity'

export class DependencyGraphError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DependencyGraphError'
  }
}

export class CyclicDependencyError extends DependencyGraphError {
  constructor(
    public readonly cycle: string[],
    message?: string
  ) {
    super(message || `Cyclic dependency detected: ${cycle.join(' -> ')}`)
    this.name = 'CyclicDependencyError'
  }
}

/**
 * DependencyGraph utility for managing task dependencies and execution order
 */
export class DependencyGraph {
  /**
   * Detect cycles in the dependency graph using depth-first search
   * @throws {CyclicDependencyError} if a cycle is detected
   */
  static detectCycles(
    tasks: SubTaskEntity[],
    dependencies: SubTaskDependency[]
  ): { hasCycle: boolean; cycle?: string[] } {
    const graph = this.buildAdjacencyList(tasks, dependencies)
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []

    for (const taskId of graph.keys()) {
      if (!visited.has(taskId)) {
        const cycle = this.dfsDetectCycle(taskId, graph, visited, recursionStack, path)
        if (cycle) {
          return { hasCycle: true, cycle }
        }
      }
    }

    return { hasCycle: false }
  }

  /**
   * Get execution order using topological sort (Kahn's algorithm)
   * Returns tasks in the order they should be executed
   * @throws {CyclicDependencyError} if the graph has cycles
   */
  static getExecutionOrder(tasks: SubTaskEntity[], dependencies: SubTaskDependency[]): string[] {
    // First check for cycles
    const cycleCheck = this.detectCycles(tasks, dependencies)
    if (cycleCheck.hasCycle) {
      throw new CyclicDependencyError(cycleCheck.cycle!, 'Cannot compute execution order: cyclic dependency detected')
    }

    const graph = this.buildAdjacencyList(tasks, dependencies)
    const inDegree = new Map<string, number>()

    // Initialize in-degree for all tasks
    for (const taskId of graph.keys()) {
      inDegree.set(taskId, 0)
    }

    // Calculate in-degree for each task
    for (const neighbors of graph.values()) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1)
      }
    }

    // Queue of tasks with no dependencies
    const queue: string[] = []
    for (const [taskId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(taskId)
      }
    }

    const executionOrder: string[] = []

    while (queue.length > 0) {
      const taskId = queue.shift()!
      executionOrder.push(taskId)

      const neighbors = graph.get(taskId) || []
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1
        inDegree.set(neighbor, newDegree)

        if (newDegree === 0) {
          queue.push(neighbor)
        }
      }
    }

    // If we haven't processed all tasks, there's a cycle (shouldn't happen due to earlier check)
    if (executionOrder.length !== tasks.length) {
      throw new DependencyGraphError(
        `Failed to compute execution order: expected ${tasks.length} tasks, got ${executionOrder.length}`
      )
    }

    return executionOrder
  }

  /**
   * Check if a task can be executed given completed task IDs
   * Returns true if all dependencies are satisfied
   */
  static canExecute(taskId: string, completedTaskIds: Set<string>, dependencies: SubTaskDependency[]): boolean {
    // Find all dependencies for this task
    const taskDependencies = dependencies.filter((dep) => dep.dependentItemId === taskId)

    // If no dependencies, task can be executed
    if (taskDependencies.length === 0) {
      return true
    }

    // Check if all dependencies are completed
    return taskDependencies.every((dep) => completedTaskIds.has(dep.dependsOnItemId))
  }

  /**
   * Get tasks that are ready to execute (all dependencies satisfied)
   */
  static getReadyTasks(
    tasks: SubTaskEntity[],
    completedTaskIds: Set<string>,
    dependencies: SubTaskDependency[]
  ): string[] {
    return tasks
      .filter((task) => {
        // Skip already completed tasks
        if (completedTaskIds.has(task.id)) {
          return false
        }

        // Check if dependencies are satisfied
        return this.canExecute(task.id, completedTaskIds, dependencies)
      })
      .map((task) => task.id)
  }

  /**
   * Get all transitive dependencies for a task (dependencies of dependencies)
   */
  static getTransitiveDependencies(taskId: string, dependencies: SubTaskDependency[]): Set<string> {
    const result = new Set<string>()
    const visited = new Set<string>()

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) {
        return
      }
      visited.add(currentId)

      const deps = dependencies.filter((dep) => dep.dependentItemId === currentId)
      for (const dep of deps) {
        result.add(dep.dependsOnItemId)
        traverse(dep.dependsOnItemId)
      }
    }

    traverse(taskId)
    return result
  }

  /**
   * Get all tasks that depend on a given task (reverse dependencies)
   */
  static getDependents(taskId: string, dependencies: SubTaskDependency[]): string[] {
    return dependencies.filter((dep) => dep.dependsOnItemId === taskId).map((dep) => dep.dependentItemId)
  }

  // Private helper methods

  private static buildAdjacencyList(tasks: SubTaskEntity[], dependencies: SubTaskDependency[]): Map<string, string[]> {
    const graph = new Map<string, string[]>()

    // Initialize graph with all tasks
    for (const task of tasks) {
      graph.set(task.id, [])
    }

    // Add edges (task -> dependent tasks)
    for (const dep of dependencies) {
      const neighbors = graph.get(dep.dependsOnItemId) || []
      neighbors.push(dep.dependentItemId)
      graph.set(dep.dependsOnItemId, neighbors)
    }

    return graph
  }

  private static dfsDetectCycle(
    taskId: string,
    graph: Map<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): string[] | null {
    visited.add(taskId)
    recursionStack.add(taskId)
    path.push(taskId)

    const neighbors = graph.get(taskId) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = this.dfsDetectCycle(neighbor, graph, visited, recursionStack, path)
        if (cycle) {
          return cycle
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle - extract the cycle path
        const cycleStartIndex = path.indexOf(neighbor)
        return [...path.slice(cycleStartIndex), neighbor]
      }
    }

    recursionStack.delete(taskId)
    path.pop()
    return null
  }
}
