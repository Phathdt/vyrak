# Web App

Modern React application built with Vite, React Router, TanStack Query, TailwindCSS, and shadcn/ui.

## Tech Stack

- **Vite** - Fast build tool and dev server
- **React 19** - UI library
- **TypeScript** - Type safety
- **React Router DOM** - Client-side routing (CSR)
- **TanStack Query (React Query)** - Data fetching and caching
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable components built with Radix UI

## Project Structure

```
apps/web/
├── src/
│   ├── components/       # Reusable components
│   │   └── ui/          # shadcn/ui components
│   ├── pages/           # Page components
│   ├── lib/             # Utility functions
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Root component with routes
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles with Tailwind
├── public/              # Static assets
├── components.json      # shadcn/ui configuration
├── tailwind.config.ts   # Tailwind configuration
├── vite.config.ts       # Vite configuration
└── tsconfig.json        # TypeScript configuration
```

## Development

### Start dev server

```bash
yarn dev:web
```

Runs on: http://localhost:5173

### Build for production

```bash
yarn build
```

### Preview production build

```bash
yarn preview
```

### Type checking

```bash
yarn typecheck
```

## Adding shadcn/ui Components

Install shadcn/ui CLI globally (if not already):

```bash
npm install -g shadcn
```

Add components:

```bash
cd apps/web
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
```

Components will be added to `src/components/ui/`.

## Path Aliases

The project uses `@` as an alias for `src/`:

```typescript
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
```

## React Query Setup

React Query is configured in `src/main.tsx` with default options:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})
```

### Example usage

```typescript
import { useQuery } from '@tanstack/react-query'

function UserProfile() {
  const { data, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/user')
      return res.json()
    },
  })

  if (isLoading) return <div>Loading...</div>
  return <div>{data.name}</div>
}
```

## Routing

Routes are defined in `src/App.tsx` using React Router DOM:

```typescript
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

## Styling

### Tailwind Utilities

```typescript
<div className="flex items-center justify-center p-4 bg-primary text-primary-foreground">
  Content
</div>
```

### Using cn() helper

Merge Tailwind classes with conditional logic:

```typescript
import { cn } from '@/lib/utils'

<button className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50'
)}>
  Click me
</button>
```

## Dark Mode

Dark mode is configured in `tailwind.config.ts` using class-based strategy. Toggle dark mode by adding/removing `dark` class on `<html>` element.

## API Integration

Configure API base URL in `.env`:

```env
VITE_API_URL=http://localhost:3000
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

## See Also

- [Vite Documentation](https://vite.dev)
- [React Router Documentation](https://reactrouter.com)
- [TanStack Query Documentation](https://tanstack.com/query)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
