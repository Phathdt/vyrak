# Vyrak Web Application

Modern web application built with React 19, TypeScript, Vite, and shadcn/ui.

## Features

- ⚡️ **React 19** - Latest React with Suspense and Error Boundaries
- 🎨 **shadcn/ui** - Beautiful, accessible UI components
- 🔐 **Authentication** - Login with JWT token management
- 🏢 **Multi-tenant** - Organization-based access control
- 🔄 **React Query** - Powerful data fetching and caching
- 📝 **React Hook Form + Zod** - Type-safe form validation
- 🎯 **TypeScript** - Full type safety
- 🚀 **Vite** - Lightning fast HMR

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- API server running on http://localhost:3000

### Installation

```bash
# Install dependencies
npm install

# Generate API hooks from OpenAPI spec
npm run generate:api

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run generate:api` - Generate API hooks from OpenAPI spec

## Project Structure

```
src/
├── api/
│   ├── client.ts           # Orval custom instance
│   └── generated/          # Generated API hooks (auto-generated)
├── components/
│   ├── auth/              # Auth-related components
│   ├── dashboard/         # Dashboard components
│   └── ui/                # shadcn/ui components
├── contexts/
│   ├── auth-context.tsx   # Authentication state
│   └── organization-context.tsx
├── layouts/
│   └── dashboard-layout.tsx
├── lib/
│   ├── api-client.ts      # Axios instance with interceptors
│   └── utils.ts           # Utility functions
├── pages/
│   ├── auth/              # Login, register pages
│   └── dashboard/         # Dashboard pages
├── App.tsx                # Main app component
└── main.tsx               # App entry point
```

## Key Concepts

### Authentication Flow

1. User logs in via `/login`
2. JWT token stored in localStorage and memory
3. Token attached to all API requests via Axios interceptor
4. Auto-redirect to login on 401 responses

### API Integration

API hooks are auto-generated from OpenAPI spec using Orval:

```tsx
import { useAuthControllerLogin } from '@/api/generated/auth/auth'

const loginMutation = useAuthControllerLogin()
await loginMutation.mutateAsync({ data: { email, password } })
```

### Adding Components

Add shadcn/ui components:

```bash
npx shadcn@latest add button card input
```

## Migration from old-web

This app was migrated from `apps/old-web` with the following changes:

- ✅ Same authentication flow and contexts
- ✅ Same API integration with Orval
- ✅ Reused shadcn/ui components instead of custom components
- ✅ Same routing structure with React Router
- ✅ Updated to latest dependencies

### What was migrated:

- Authentication context and protected routes
- Organization context for multi-tenancy
- API client with Axios interceptors
- Login page with same credentials
- Dashboard layout with sidebar and header
- Dashboard page with organization selector

## Test Credentials

```
Email: admin@vyrak.dev
Password: Password123!
```

## License

MIT
