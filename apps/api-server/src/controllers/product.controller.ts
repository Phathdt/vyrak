import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiExtraModels, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  CreateProductDto,
  CreateProductSchema,
  PaginationQueryDto,
  PaginationQuerySchema,
  ProductListResponse,
  ProductListResponseDto,
  ProductResponse,
  ProductResponseDto,
  ProductService,
  UpdateProductDto,
  UpdateProductSchema,
} from '@vyrak/product'

import { ZodValidationPipe } from 'nestjs-zod'

@ApiTags('products')
@ApiBearerAuth()
@ApiExtraModels(ProductResponseDto, ProductListResponseDto)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({
    status: 200,
    description: 'Return all products with pagination',
    type: ProductListResponseDto,
  })
  async findAll(
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQueryDto
  ): Promise<ProductListResponse> {
    const result = await this.productService.findAll(query.page, query.limit)

    return {
      data: result.data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      meta: result.meta,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the product',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string): Promise<ProductResponse> {
    const product = await this.productService.findOne(id)

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'The product has been successfully created',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body(new ZodValidationPipe(CreateProductSchema)) createProductDto: CreateProductDto
  ): Promise<ProductResponse> {
    const product = await this.productService.create({
      name: createProductDto.name,
      description: createProductDto.description ?? null,
      price: createProductDto.price,
      stock: createProductDto.stock ?? 0,
    })

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'The product has been successfully updated',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) updateProductDto: UpdateProductDto
  ): Promise<ProductResponse> {
    const product = await this.productService.update(id, {
      ...(updateProductDto.name !== undefined && { name: updateProductDto.name }),
      ...(updateProductDto.description !== undefined && { description: updateProductDto.description }),
      ...(updateProductDto.price !== undefined && { price: updateProductDto.price }),
      ...(updateProductDto.stock !== undefined && { stock: updateProductDto.stock }),
    })

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 204, description: 'The product has been successfully deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.productService.remove(id)
  }
}
