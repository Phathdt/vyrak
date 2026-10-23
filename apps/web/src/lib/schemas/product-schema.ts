import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().nonnegative('Stock must be non-negative'),
})

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive').optional(),
  stock: z.number().int().nonnegative('Stock must be non-negative').optional(),
})

export type CreateProductForm = z.infer<typeof createProductSchema>
export type UpdateProductForm = z.infer<typeof updateProductSchema>
