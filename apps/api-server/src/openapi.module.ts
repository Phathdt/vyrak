import { Module } from '@nestjs/common'
import type { Product } from '@vyrak/product'
import { ProductService } from '@vyrak/product'

import { ProductController } from './controllers'

// Mock ProductService chỉ để generate OpenAPI, không chạy thật
const mockProductService = {
  findAll: () => Promise.resolve({ data: [], total: 0 }),
  findOne: () => Promise.resolve(null),
  create: () => Promise.resolve({} as Product),
  update: () => Promise.resolve({} as Product),
  remove: () => Promise.resolve(undefined),
}

@Module({
  controllers: [ProductController],
  providers: [
    {
      provide: ProductService,
      useValue: mockProductService,
    },
  ],
})
export class OpenApiModule {}
