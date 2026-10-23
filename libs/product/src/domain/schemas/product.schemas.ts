import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// ============================================
// Request Schemas
// ============================================

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative().default(0),
})

export class CreateProductDto extends createZodDto(CreateProductSchema) {}
export type CreateProductData = z.infer<typeof CreateProductSchema>

export const UpdateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
})

export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}
export type UpdateProductData = z.infer<typeof UpdateProductSchema>

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export class PaginationQueryDto extends createZodDto(PaginationQuerySchema) {}
export type PaginationQueryData = z.infer<typeof PaginationQuerySchema>

// ============================================
// Response Schemas
// ============================================

export const ProductResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export class ProductResponseDto extends createZodDto(ProductResponseSchema) {}
export type ProductResponse = z.infer<typeof ProductResponseSchema>

export const ProductListResponseSchema = z.object({
  data: z.array(ProductResponseSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

export class ProductListResponseDto extends createZodDto(ProductListResponseSchema) {}
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>
