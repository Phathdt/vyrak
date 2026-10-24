import { isOrganizationModel, isTenantOwned, ORGANIZATION_ID_FIELD } from './tenant-models'

import { Prisma } from '../generated/prisma/client'

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

function handleFindUnique(args: PrismaArgs, query: QueryFunction, model: string, organizationId?: string) {
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
  } else {
    args.where = {
      ...(args.where || {}),
      [ORGANIZATION_ID_FIELD]: organizationId,
    }
  }

  return query(args)
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
  if (!organizationId) {
    throw new Error(`Tenant context required for ${model}.create. ` + `Use bypassTenantFilter for system operations.`)
  }

  const data = args.data as Record<string, unknown>

  // Auto-assign organizationId
  if (isOrganizationModel(model)) {
    // Organization creation: validate id matches context
    if (data.id && data.id !== organizationId) {
      throw new Error('Organization ID mismatch')
    }
    data.id = organizationId
  } else {
    // Auto-assign organizationId for tenant-owned resources
    if (data[ORGANIZATION_ID_FIELD] && data[ORGANIZATION_ID_FIELD] !== organizationId) {
      throw new Error(`Cannot create ${model} with different organizationId`)
    }
    args.data = {
      ...data,
      [ORGANIZATION_ID_FIELD]: organizationId,
    }
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
