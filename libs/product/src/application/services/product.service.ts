import { Inject, Injectable, NotFoundException } from '@nestjs/common'

import type { IProductRepository, IProductService, Product, ProductCreateData, ProductUpdateData } from '../../domain'
import { PRODUCT_REPOSITORY } from '../../infras'

@Injectable()
export class ProductService implements IProductService {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository) {}

  async findAll(
    page: number,
    limit: number
  ): Promise<{
    data: Product[]
    meta: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const { data, total } = await this.productRepo.findAll(page, limit)
    const totalPages = Math.ceil(total / limit)

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findById(id)
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`)
    }
    return product
  }

  async create(data: ProductCreateData): Promise<Product> {
    return await this.productRepo.create(data)
  }

  async update(id: string, data: ProductUpdateData): Promise<Product> {
    const product = await this.productRepo.update(id, data)
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`)
    }
    return product
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.productRepo.delete(id)
    if (!deleted) {
      throw new NotFoundException(`Product with ID ${id} not found`)
    }
  }
}
