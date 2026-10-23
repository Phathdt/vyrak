import { Product, ProductCreateData, ProductUpdateData } from '../entities'

export interface IProductService {
  /**
   * Get all products with pagination
   * @param page Page number (1-indexed)
   * @param limit Number of items per page
   * @returns Paginated product list with metadata
   */
  findAll(
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
  }>

  /**
   * Get a product by ID
   * @param id Product ID
   * @returns Product or throws NotFoundException
   */
  findOne(id: string): Promise<Product>

  /**
   * Create a new product
   * @param data Product creation data
   * @returns Created product
   */
  create(data: ProductCreateData): Promise<Product>

  /**
   * Update an existing product
   * @param id Product ID
   * @param data Partial product data to update
   * @returns Updated product or throws NotFoundException
   */
  update(id: string, data: ProductUpdateData): Promise<Product>

  /**
   * Delete a product
   * @param id Product ID
   * @returns void or throws NotFoundException
   */
  remove(id: string): Promise<void>
}
