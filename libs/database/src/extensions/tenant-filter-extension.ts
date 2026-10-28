import { Prisma } from '../generated/prisma/client'
import { isOrganizationModel, isTenantOwned, ORGANIZATION_ID_FIELD } from './tenant-models'

interface TenantFilterContext {
  organizationId?: string
  bypassTenantFilter?: boolean
}

type PrismaArgs = {
  where?: Record<string, unknown>
  data?: unknown
  create?: unknown
  update?: unknown
}

type QueryFunction = (args: PrismaArgs) => Promise<unknown>

export function createTenantFilterExtension(getContext: () => TenantFilterContext) {
  return Prisma.defineExtension({
    name: 'tenant-filter',
    query: {
      $allModels: {
        async $allOperations({ args, query, operation, model }) {
          const context = getContext()

          // Skip if bypass flag set (for system operations)
          if (context.bypassTenantFilter) {
            return query(args)
          }

          // Skip if not a tenant-owned model
          if (!isTenantOwned(model)) {
            return query(args)
          }

          const organizationId = context.organizationId

          // Handle different operations
          switch (operation) {
            case 'findUnique':
            case 'findUniqueOrThrow':
            case 'findFirst':
            case 'findFirstOrThrow':
              return handleFindUnique(args, query, model, organizationId)

            case 'findMany':
            case 'count':
            case 'aggregate':
            case 'groupBy':
              return handleFindMany(args, query, model, organizationId)

            case 'create':
              return handleCreate(args, query, model, organizationId)

            case 'createMany':
            case 'createManyAndReturn':
              return handleCreateMany(args, query, model, organizationId)

            case 'update':
            case 'updateMany':
              return handleUpdate(args, query, model, organizationId)

            case 'upsert':
              return handleUpsert(args, query, model, organizationId)

            case 'delete':
            case 'deleteMany':
              return handleDelete(args, query, model, organizationId)

            default:
              return query(args)
          }
        },
      },
    },
  })
}

async function handleFindUnique(args: PrismaArgs, query: QueryFunction, model: string, organizationId?: string) {
  if (!organizationId) {
    throw new Error(
      `Tenant context required for ${model}.findUnique. ` + `Use bypassTenantFilter for system operations.`
    )
  }

  // Special case: organization model uses id as organizationId
  if (isOrganizationModel(model)) {
    args.where = {
      ...(args.where || {}),
      id: organizationId,
    }
    return query(args)
  }

  const where = args.where as Record<string, unknown>

  // Check if this is a composite key lookup with organizationId
  // Pattern matches: organizationId_idempotencyKey, organizationId_slug, etc.
  const compositeKeyPattern = /^(\w+_)*organizationId$/
  const compositeKeys = Object.keys(where).filter((key) => compositeKeyPattern.test(key))

  if (compositeKeys.length > 0) {
    // For composite keys that include organizationId, validate and inject the context organizationId
    for (const key of compositeKeys) {
      const compositeWhere = where[key] as Record<string, unknown>
      if (compositeWhere && typeof compositeWhere === 'object') {
        // Validate organizationId matches if it's part of the composite key
        if (compositeWhere[ORGANIZATION_ID_FIELD] && compositeWhere[ORGANIZATION_ID_FIELD] !== organizationId) {
          throw new Error(`Tenant isolation violation: ${model} organizationId mismatch`)
        }
        // Ensure organizationId is set in composite key
        compositeWhere[ORGANIZATION_ID_FIELD] = organizationId
      }
    }
    return query(args)
  }

  // For simple unique lookups (e.g., by id), Prisma silently ignores fields that aren't
  // part of a unique constraint. We must execute the query and post-filter the result.
  const result = await query(args)

  // If no result, return null
  if (!result) {
    return null
  }

  // Verify the result belongs to the correct organization
  const record = result as Record<string, unknown>
  if (record[ORGANIZATION_ID_FIELD] !== organizationId) {
    // Tenant isolation: return null for records from other organizations
    return null
  }

  return result
}

function handleFindMany(args: PrismaArgs, query: QueryFunction, model: string, organizationId?: string) {
  if (!organizationId) {
    throw new Error(`Tenant context required for ${model}.findMany. ` + `Use bypassTenantFilter for system operations.`)
  }

  // Inject organizationId filter
  if (isOrganizationModel(model)) {
    args.where = {
      ...(args.where || {}),
      id: organizationId,
    }
  } else {
    args.where = {
      ...(args.where || {}),
      [ORGANIZATION_ID_FIELD]: organizationId,
    }
  }

  return query(args)
}

function handleCreate(args: PrismaArgs, query: QueryFunction, model: string, organizationId?: string) {
  const data = args.data as Record<string, unknown>

  // For tenant-owned models, organizationId can come from context OR from the data itself
  // This supports both normal operations (context set) and transaction operations (data contains organizationId)
  if (!isOrganizationModel(model)) {
    const dataOrgId = data[ORGANIZATION_ID_FIELD] as string | undefined

    if (!organizationId && !dataOrgId) {
      throw new Error(`Tenant context required for ${model}.create. ` + `Use bypassTenantFilter for system operations.`)
    }

    // If both exist, they must match
    if (organizationId && dataOrgId && dataOrgId !== organizationId) {
      throw new Error(`Cannot create ${model} with different organizationId`)
    }

    // If only context exists, use it
    if (organizationId && !dataOrgId) {
      args.data = {
        ...data,
        [ORGANIZATION_ID_FIELD]: organizationId,
      }
    }
    // If data already has organizationId, keep it as-is (supports transactions)
  } else {
    // Organization creation requires context
    if (!organizationId) {
      throw new Error(`Tenant context required for ${model}.create. ` + `Use bypassTenantFilter for system operations.`)
    }

    // Validate id matches context
    if (data.id && data.id !== organizationId) {
      throw new Error('Organization ID mismatch')
    }
    data.id = organizationId
  }

  return query(args)
}

function handleCreateMany(args: PrismaArgs, query: QueryFunction, model: string, organizationId?: string) {
  if (!organizationId) {
    throw new Error(
      `Tenant context required for ${model}.createMany. ` + `Use bypassTenantFilter for system operations.`
    )
  }

  // Auto-assign organizationId to all records
  if (!isOrganizationModel(model)) {
    const data = args.data
    if (Array.isArray(data)) {
      args.data = data.map((record) => ({
        ...(record as Record<string, unknown>),
        [ORGANIZATION_ID_FIELD]: organizationId,
      }))
    } else {
      args.data = {
        ...(data as Record<string, unknown>),
        [ORGANIZATION_ID_FIELD]: organizationId,
      }
    }
  }

  return query(args)
}

function handleUpdate(args: PrismaArgs, query: QueryFunction, model: string, organizationId?: string) {
  if (!organizationId) {
    throw new Error(`Tenant context required for ${model}.update. ` + `Use bypassTenantFilter for system operations.`)
  }

  const data = args.data as Record<string, unknown>

  // Add organizationId filter to where clause
  if (isOrganizationModel(model)) {
    args.where = {
      ...(args.where || {}),
      id: organizationId,
    }
  } else {
    args.where = {
      ...(args.where || {}),
      [ORGANIZATION_ID_FIELD]: organizationId,
    }

    // Prevent changing organizationId
    if (data[ORGANIZATION_ID_FIELD] && data[ORGANIZATION_ID_FIELD] !== organizationId) {
      throw new Error('Cannot change organizationId')
    }
  }

  return query(args)
}

function handleUpsert(args: PrismaArgs, query: QueryFunction, model: string, organizationId?: string) {
  if (!organizationId) {
    throw new Error(`Tenant context required for ${model}.upsert. ` + `Use bypassTenantFilter for system operations.`)
  }

  const createData = args.create as Record<string, unknown>
  const updateData = args.update as Record<string, unknown>

  // Add filter to where
  if (!isOrganizationModel(model)) {
    args.where = {
      ...(args.where || {}),
      [ORGANIZATION_ID_FIELD]: organizationId,
    }

    // Auto-assign organizationId on create
    args.create = {
      ...createData,
      [ORGANIZATION_ID_FIELD]: organizationId,
    }

    // Prevent changing organizationId on update
    if (updateData[ORGANIZATION_ID_FIELD] && updateData[ORGANIZATION_ID_FIELD] !== organizationId) {
      throw new Error('Cannot change organizationId')
    }
  }

  return query(args)
}

function handleDelete(args: PrismaArgs, query: QueryFunction, model: string, organizationId?: string) {
  if (!organizationId) {
    throw new Error(`Tenant context required for ${model}.delete. ` + `Use bypassTenantFilter for system operations.`)
  }

  // Add organizationId filter
  if (isOrganizationModel(model)) {
    args.where = {
      ...(args.where || {}),
      id: organizationId,
    }
  } else {
    args.where = {
      ...(args.where || {}),
      [ORGANIZATION_ID_FIELD]: organizationId,
    }
  }

  return query(args)
}
