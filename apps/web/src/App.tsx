import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ProductsPage } from './pages/products-page'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductsPage />
    </QueryClientProvider>
  )
}

export default App
