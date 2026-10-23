import { useState, useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  useProductControllerCreate,
  useProductControllerFindAll,
  useProductControllerFindOne,
  useProductControllerRemove,
  useProductControllerUpdate,
} from '../api/generated/products/products'
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductForm,
  type UpdateProductForm,
} from '../lib/schemas/product-schema'

export function ProductsPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Create form
  const createForm = useForm<CreateProductForm>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      stock: 0,
    },
  })

  // Update form
  const updateForm = useForm<UpdateProductForm>({
    resolver: zodResolver(updateProductSchema),
  })

  // Queries
  const { data: productsData, isLoading, error } = useProductControllerFindAll()
  const { data: selectedProduct, isLoading: isLoadingProduct } = useProductControllerFindOne(selectedProductId!, {
    query: {
      enabled: !!selectedProductId,
      queryKey: ['products', selectedProductId],
    },
  })

  // Mutations
  const createMutation = useProductControllerCreate()
  const updateMutation = useProductControllerUpdate()
  const deleteMutation = useProductControllerRemove()

  // Reset update form when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      updateForm.reset({
        name: selectedProduct.name,
        description: selectedProduct.description || '',
        price: selectedProduct.price,
        stock: selectedProduct.stock,
      })
    }
  }, [selectedProduct, updateForm])

  const handleCreate: SubmitHandler<CreateProductForm> = async (data) => {
    try {
      await createMutation.mutateAsync({ data })
      createForm.reset()
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create product:', error)
    }
  }

  const handleUpdate: SubmitHandler<UpdateProductForm> = async (data) => {
    if (!selectedProduct) return

    try {
      await updateMutation.mutateAsync({
        id: selectedProduct.id,
        data,
      })
    } catch (error) {
      console.error('Failed to update product:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    try {
      await deleteMutation.mutateAsync({ id })
      setSelectedProductId(null)
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }

  if (isLoading) return <div className='p-8'>Loading products...</div>
  if (error) return <div className='p-8 text-red-600'>Error loading products: {error.message}</div>

  return (
    <div className='min-h-screen bg-[#05070C] text-[#E0E6ED] p-8'>
      <div className='max-w-7xl mx-auto'>
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-4xl font-bold tracking-tight'>Products</h1>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className='px-6 py-2 bg-[#38BDF8] text-[#05070C] rounded-full font-medium hover:bg-[#0EA5E9] transition-colors'
          >
            {isCreating ? 'Cancel' : 'New Product'}
          </button>
        </div>

        {isCreating && (
          <div className='bg-[#0F131C] rounded-2xl p-6 mb-8 border border-[#1E2636]'>
            <h2 className='text-2xl font-semibold mb-4'>Create New Product</h2>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-2'>Name</label>
                <input
                  {...createForm.register('name')}
                  className='w-full px-4 py-2 bg-[#161D2B] border border-[#1E2636] rounded-lg focus:outline-none focus:border-[#38BDF8]'
                />
                {createForm.formState.errors.name && (
                  <p className='text-red-400 text-sm mt-1'>{createForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium mb-2'>Description</label>
                <textarea
                  {...createForm.register('description')}
                  rows={3}
                  className='w-full px-4 py-2 bg-[#161D2B] border border-[#1E2636] rounded-lg focus:outline-none focus:border-[#38BDF8]'
                />
                {createForm.formState.errors.description && (
                  <p className='text-red-400 text-sm mt-1'>{createForm.formState.errors.description.message}</p>
                )}
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium mb-2'>Price</label>
                  <input
                    {...createForm.register('price', { valueAsNumber: true })}
                    type='number'
                    step='0.01'
                    className='w-full px-4 py-2 bg-[#161D2B] border border-[#1E2636] rounded-lg focus:outline-none focus:border-[#38BDF8]'
                  />
                  {createForm.formState.errors.price && (
                    <p className='text-red-400 text-sm mt-1'>{createForm.formState.errors.price.message}</p>
                  )}
                </div>
                <div>
                  <label className='block text-sm font-medium mb-2'>Stock</label>
                  <input
                    {...createForm.register('stock', { valueAsNumber: true })}
                    type='number'
                    className='w-full px-4 py-2 bg-[#161D2B] border border-[#1E2636] rounded-lg focus:outline-none focus:border-[#38BDF8]'
                  />
                  {createForm.formState.errors.stock && (
                    <p className='text-red-400 text-sm mt-1'>{createForm.formState.errors.stock.message}</p>
                  )}
                </div>
              </div>
              <button
                type='submit'
                disabled={createMutation.isPending}
                className='w-full px-6 py-3 bg-[#38BDF8] text-[#05070C] rounded-full font-medium hover:bg-[#0EA5E9] transition-colors disabled:opacity-50'
              >
                {createMutation.isPending ? 'Creating...' : 'Create Product'}
              </button>
            </form>
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Products List */}
          <div className='lg:col-span-2 space-y-4'>
            {productsData?.data.map((product) => (
              <div
                key={product.id}
                onClick={() => setSelectedProductId(product.id)}
                className={`bg-[#0F131C] rounded-2xl p-6 border cursor-pointer transition-all ${
                  selectedProductId === product.id
                    ? 'border-[#38BDF8] shadow-lg shadow-[#38BDF8]/20'
                    : 'border-[#1E2636] hover:border-[#38BDF8]/50'
                }`}
              >
                <div className='flex justify-between items-start'>
                  <div>
                    <h3 className='text-xl font-semibold mb-2'>{product.name}</h3>
                    <p className='text-[#9CA3AF] mb-4'>{product.description || 'No description'}</p>
                    <div className='flex gap-4 text-sm'>
                      <span className='text-[#38BDF8] font-medium'>${product.price.toFixed(2)}</span>
                      <span className='text-[#9CA3AF]'>Stock: {product.stock}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Product Details */}
          {selectedProductId && (
            <div className='bg-[#0F131C] rounded-2xl p-6 border border-[#1E2636] h-fit sticky top-8'>
              {isLoadingProduct ? (
                <div>Loading product details...</div>
              ) : selectedProduct ? (
                <>
                  <div className='flex justify-between items-start mb-6'>
                    <h2 className='text-2xl font-semibold'>Edit Product</h2>
                    <button
                      onClick={() => handleDelete(selectedProduct.id)}
                      disabled={deleteMutation.isPending}
                      className='px-4 py-2 bg-red-500/10 text-red-400 rounded-full text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50'
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <form onSubmit={updateForm.handleSubmit(handleUpdate)} className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium mb-2'>Name</label>
                      <input
                        {...updateForm.register('name')}
                        className='w-full px-4 py-2 bg-[#161D2B] border border-[#1E2636] rounded-lg focus:outline-none focus:border-[#38BDF8]'
                      />
                      {updateForm.formState.errors.name && (
                        <p className='text-red-400 text-sm mt-1'>{updateForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-2'>Description</label>
                      <textarea
                        {...updateForm.register('description')}
                        rows={3}
                        className='w-full px-4 py-2 bg-[#161D2B] border border-[#1E2636] rounded-lg focus:outline-none focus:border-[#38BDF8]'
                      />
                      {updateForm.formState.errors.description && (
                        <p className='text-red-400 text-sm mt-1'>{updateForm.formState.errors.description.message}</p>
                      )}
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium mb-2'>Price</label>
                        <input
                          {...updateForm.register('price', { valueAsNumber: true })}
                          type='number'
                          step='0.01'
                          className='w-full px-4 py-2 bg-[#161D2B] border border-[#1E2636] rounded-lg focus:outline-none focus:border-[#38BDF8]'
                        />
                        {updateForm.formState.errors.price && (
                          <p className='text-red-400 text-sm mt-1'>{updateForm.formState.errors.price.message}</p>
                        )}
                      </div>
                      <div>
                        <label className='block text-sm font-medium mb-2'>Stock</label>
                        <input
                          {...updateForm.register('stock', { valueAsNumber: true })}
                          type='number'
                          className='w-full px-4 py-2 bg-[#161D2B] border border-[#1E2636] rounded-lg focus:outline-none focus:border-[#38BDF8]'
                        />
                        {updateForm.formState.errors.stock && (
                          <p className='text-red-400 text-sm mt-1'>{updateForm.formState.errors.stock.message}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type='submit'
                      disabled={updateMutation.isPending}
                      className='w-full px-6 py-3 bg-[#38BDF8] text-[#05070C] rounded-full font-medium hover:bg-[#0EA5E9] transition-colors disabled:opacity-50'
                    >
                      {updateMutation.isPending ? 'Updating...' : 'Update Product'}
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
