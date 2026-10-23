import { z } from 'zod'

// Product entity schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Product = z.infer<typeof ProductSchema>

// Product creation data (omit generated fields)
export const ProductCreateDataSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type ProductCreateData = z.infer<typeof ProductCreateDataSchema>

// Product update data (all fields optional)
export const ProductUpdateDataSchema = ProductCreateDataSchema.partial()

export type ProductUpdateData = z.infer<typeof ProductUpdateDataSchema>
