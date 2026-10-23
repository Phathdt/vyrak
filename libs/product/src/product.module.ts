import { Module } from '@nestjs/common'
import { DatabaseModule } from '@vyrak/database'

import { ProductService } from './application'
import { PRODUCT_REPOSITORY, ProductPrismaRepository } from './infras'

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [
    ProductService,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductPrismaRepository,
    },
  ],
  exports: [ProductService],
})
export class ProductModule {}
