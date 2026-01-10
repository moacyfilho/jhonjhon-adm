# Supabase Auth Integration Plan

This document outlines the steps to migrate from NextAuth to Supabase Auth using session control and SSR support.

## ✅ Implementation Status

All core integration steps have been completed! The application now uses Supabase Auth for authentication and session management.

## 1. ✅ Dependencies Installation

Install the necessary Supabase packages:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

## 2. Supabase Configuration Utility
Create utility functions to initialize Supabase clients for different environments.

### `utils/supabase/client.ts` (Client Components)
Initialize the Supabase client for use in browser-based components.

### `utils/supabase/server.ts` (Server Components/Actions)
Initialize the Supabase client for server-side operations, handling cookie-based sessions.

### `utils/supabase/middleware.ts` (Middleware)
Utility to refresh the Supabase session token in the Next.js middleware.

## 3. Middleware Integration
Update `middleware.ts` to use Supabase instead of NextAuth. The middleware will:
- Refresh the session if it's expired.
- Protect routes (e.g., `/dashboard`) by checking for an active session.
- Redirect unauthenticated users to `/login`.

## 4. Auth Provider & Session Management
- Replace `SessionProvider` from NextAuth with a custom implementation or use the Supabase context if needed.
- Update `app/providers.tsx` to reflect these changes.

## 5. Authentication UI/Logic
- **Login Page**: Update `app/login/page.tsx` to use `supabase.auth.signInWithPassword`.
- **Sign Up**: Implement registration if required.
- **Logout**: Implement a sign-out function using `supabase.auth.signOut`.

## 6. Access Control (Row Level Security - RLS)
- Enable RLS on database tables using the Supabase MCP or Dashboard.
- Define policies to ensure users can only access their own data or data they are authorized to see.

## 7. Migration from NextAuth
- Remove `next-auth` and related adapters if they are no longer needed.
- Clean up `lib/auth/auth-options.ts`.

---

## Technical Details

### Create Supabase Utilities
We will create a directory `utils/supabase` with the following files:

#### `client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### `server.ts`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

#### `middleware.ts`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}
```
