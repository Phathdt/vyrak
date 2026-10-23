import { Injectable } from '@nestjs/common'
import { DatabaseService, type Product as PrismaProduct } from '@vyrak/database'

import { IProductRepository, Product, ProductCreateData, ProductUpdateData } from '../../domain'

@Injectable()
export class ProductPrismaRepository implements IProductRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async findAll(page: number, limit: number): Promise<{ data: Product[]; total: number }> {
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count(),
    ])

    return {
      data: data.map(this.mapToProduct),
      total,
    }
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    })

    return product ? this.mapToProduct(product) : null
  }

  async create(data: ProductCreateData): Promise<Product> {
    const product = await this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        stock: data.stock ?? 0,
      },
    })

    return this.mapToProduct(product)
  }

  async update(id: string, data: ProductUpdateData): Promise<Product | null> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.stock !== undefined && { stock: data.stock }),
        },
      })

      return this.mapToProduct(product)
    } catch (_error) {
      // Prisma throws if record not found
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.product.delete({
        where: { id },
      })
      return true
    } catch (_error) {
      // Prisma throws if record not found
      return false
    }
  }

  private mapToProduct(prismaProduct: PrismaProduct): Product {
    return {
      id: prismaProduct.id,
      name: prismaProduct.name,
      description: prismaProduct.description,
      price: Number(prismaProduct.price),
      stock: prismaProduct.stock,
      createdAt: prismaProduct.createdAt,
      updatedAt: prismaProduct.updatedAt,
    }
  }
}
