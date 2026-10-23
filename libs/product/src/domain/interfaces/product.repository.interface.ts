import { Product, ProductCreateData, ProductUpdateData } from '../entities'

export interface IProductRepository {
  /**
   * Find all products with pagination
   * @param page Page number (1-indexed)
   * @param limit Number of items per page
   * @returns Array of products and total count
   */
  findAll(page: number, limit: number): Promise<{ data: Product[]; total: number }>

  /**
   * Find a product by ID
   * @param id Product ID
   * @returns Product or null if not found
   */
  findById(id: string): Promise<Product | null>

  /**
   * Create a new product
   * @param data Product data to create
   * @returns Created product
   */
  create(data: ProductCreateData): Promise<Product>

  /**
   * Update an existing product
   * @param id Product ID
   * @param data Partial product data to update
   * @returns Updated product or null if not found
   */
  update(id: string, data: ProductUpdateData): Promise<Product | null>

  /**
   * Delete a product
   * @param id Product ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>
}
