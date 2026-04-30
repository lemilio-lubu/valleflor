# Referencia: Next.js 14 + React 18 + Tailwind (`apps/web`)

Patrones para construir el frontend con App Router, Server/Client Components conscientes y Tailwind alineado al sistema de diseño Valleflor.

## Tabla de Contenidos

1. App Router — estructura
2. Server vs Client Components
3. Fetching de datos
4. Formularios y mutaciones
5. Manejo de autenticación con la API
6. Tailwind: configuración del theme Valleflor
7. Componentes UI: convenciones
8. Estados de UI (loading, error, empty)
9. Tipado y contratos con la API
10. Performance
11. Accesibilidad
12. Variables de entorno

---

## 1. App Router — Estructura

```
src/
├── app/                              # App Router (Next.js 14)
│   ├── (public)/                     # Grupo de rutas públicas (sin autenticación)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (app)/                        # Grupo autenticado
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx              # Lista
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx          # Detalle
│   │   │   │   └── loading.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   └── layout.tsx                # Layout protegido (verifica sesión)
│   ├── api/                          # Route handlers (proxy/BFF si hace falta)
│   │   └── auth/
│   │       └── route.ts
│   ├── layout.tsx                    # Root layout
│   ├── error.tsx                     # Error boundary global
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   ├── ui/                           # Primitivos (Button, Input, Card)
│   ├── forms/                        # Componentes de formulario reutilizables
│   ├── layout/                       # Header, Sidebar, Footer
│   └── feedback/                     # Toast, Modal, Skeleton
├── features/                         # Lógica por dominio (mirroring del backend)
│   ├── auth/
│   │   ├── api.ts
│   │   ├── hooks.ts
│   │   ├── components/
│   │   └── types.ts
│   ├── orders/
│   └── users/
├── lib/
│   ├── api-client.ts                 # Cliente HTTP a la API
│   ├── auth.ts                       # Helpers de sesión
│   ├── env.ts                        # Validación de env vars
│   └── utils.ts                      # cn(), formatters
├── hooks/                            # Hooks compartidos
└── styles/
    └── globals.css                   # Tailwind layers + tokens
```

**Reglas**:
- **Route groups** `(public)` y `(app)` para layouts distintos sin afectar la URL.
- **Loading UI** con `loading.tsx` en cada ruta que hace fetch.
- **Error UI** con `error.tsx` (Client Component obligatorio).
- **Not found** con `not-found.tsx`.

---

## 2. Server vs Client Components

**Por defecto: Server Component**. Marcar `'use client'` solo cuando se requiera interactividad.

**Server Component** (default):
- Fetching directo desde la API.
- Acceso a secretos (env vars sin `NEXT_PUBLIC_`).
- Sin estado, sin event handlers, sin hooks de React (excepto `cache`).
- Reduce JS enviado al cliente.

**Client Component** (`'use client'`):
- Hooks (`useState`, `useEffect`, `useRouter`, etc.).
- Event handlers (`onClick`, `onChange`).
- APIs del browser (`localStorage`, `window`).
- Bibliotecas que dependen del DOM.

**Patrón ideal**: server components hacen el fetch y pasan datos a client components pequeños que aportan interactividad puntual.

```tsx
// app/(app)/orders/page.tsx — Server Component
import { fetchOrders } from '@/features/orders/api';
import { OrdersTable } from '@/features/orders/components/orders-table';

export default async function OrdersPage() {
  const orders = await fetchOrders();
  return (
    <main>
      <h1 className="text-2xl font-semibold">Pedidos</h1>
      <OrdersTable orders={orders} />
    </main>
  );
}
```

```tsx
// features/orders/components/orders-table.tsx — Client Component
'use client';

import { useState } from 'react';
import type { Order } from '../types';

interface Props { orders: Order[] }

export function OrdersTable({ orders }: Props) {
  const [filter, setFilter] = useState('');
  // ... interactividad
}
```

**Anti-patrón**: marcar todo como `'use client'` por costumbre. Pierde los beneficios del SSR/RSC.

---

## 3. Fetching de Datos

**Desde Server Components**: usar `fetch` directamente. Next.js cachea automáticamente.

```ts
// features/orders/api.ts
import 'server-only';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import type { Order } from './types';

export async function fetchOrders(): Promise<Order[]> {
  const token = cookies().get('access_token')?.value;
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/orders`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    next: { revalidate: 60, tags: ['orders'] },
  });

  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
  const data = (await res.json()) as { data: Order[] };
  return data.data;
}
```

**Reglas**:
- `import 'server-only'` en módulos que **nunca** deben llegar al cliente (claves, lógica de servidor).
- Usar `cache` de React (`import { cache } from 'react'`) para deduplicar fetches dentro del mismo render.
- Configurar revalidación con `next.revalidate` o `next.tags`.
- Para datos siempre frescos: `cache: 'no-store'`.

**Desde Client Components** (cuando hay interacción): usar `SWR` o `@tanstack/react-query` para caching, retry y revalidación.

```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => apiClient.get<Order[]>('/v1/orders'),
    staleTime: 30_000,
  });
}
```

---

## 4. Formularios y Mutaciones

**Stack recomendado**: `react-hook-form` + `zod` para validación cliente (mismo schema que el backend cuando sea posible).

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(12, 'Mínimo 12 caracteres'),
});
type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    // call API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field label="Email" error={formState.errors.email?.message}>
        <input {...register('email')} type="email" autoComplete="email" />
      </Field>
      <Field label="Contraseña" error={formState.errors.password?.message}>
        <input {...register('password')} type="password" autoComplete="current-password" />
      </Field>
      <Button type="submit" disabled={formState.isSubmitting}>
        Ingresar
      </Button>
    </form>
  );
}
```

**Server Actions** (alternativa para mutaciones simples):

```tsx
// app/(app)/orders/new/actions.ts
'use server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const schema = z.object({ ... });

export async function createOrderAction(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.format() };

  const res = await fetch(`${env.API_URL}/v1/orders`, {
    method: 'POST',
    body: JSON.stringify(parsed.data),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) return { error: 'No se pudo crear el pedido' };

  revalidateTag('orders');
  return { success: true };
}
```

**Reglas**:
- `noValidate` en `<form>` para usar la validación de la librería, no la del browser.
- `autoComplete` correcto (`email`, `current-password`, `new-password`, `name`).
- Mostrar error junto al campo, no en alert global.
- Botón submit `disabled` mientras se envía + spinner.

---

## 5. Manejo de Autenticación con la API

**Almacenamiento del token**:

- **Cookie httpOnly + secure + sameSite=strict** (recomendado): inmune a XSS, requiere middleware o route handler para setear desde la respuesta del backend.
- **Memoria + refresh en cookie**: el access vive en memoria; al refrescar la app se obtiene uno nuevo con el refresh.

**No usar `localStorage` para tokens** sin un análisis explícito de riesgo de XSS.

**Middleware de Next.js para proteger rutas**:

```ts
// middleware.ts (raíz del proyecto)
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = req.cookies.get('access_token')?.value;

  if (!isPublic && !token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

---

## 6. Tailwind: Configuración del Theme Valleflor

Aplicar el sistema de diseño de Valleflor (ver guideline de UI) en `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1B3FA0',
          dark: '#142E78',
          light: '#E8EDF8',
        },
        success: { DEFAULT: '#2E8B3D', bg: '#ECFDF3' },
        warning: { DEFAULT: '#DC9B04', bg: '#FFFAEB' },
        error: { DEFAULT: '#D32F2F', bg: '#FEF3F2' },
        surface: '#FAFBFC',
        muted: '#F2F4F7',
        border: {
          subtle: '#E4E7EC',
          DEFAULT: '#D0D5DD',
        },
        ink: {
          primary: '#101828',
          secondary: '#475467',
          tertiary: '#667085',
          disabled: '#98A2B3',
        },
      },
      spacing: {
        // Escala áurea (φ ≈ 1.618)
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '20px',
        '5': '32px',
        '6': '52px',
        '7': '84px',
        '8': '136px',
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['20px', '28px'],
        xl: ['26px', '32px'],
        '2xl': ['42px', '48px'],
        '3xl': ['68px', '76px'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '20px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(16,24,40,0.05)',
        sm: '0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)',
        md: '0 4px 8px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)',
        lg: '0 12px 20px rgba(16,24,40,0.10), 0 4px 8px rgba(16,24,40,0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};

export default config;
```

**Reglas con Tailwind**:
- **Prohibido** `bg-[#1B3FA0]` (clases mágicas con hex). Usar `bg-brand`.
- **Prohibido** `text-[18px]`. Usar la escala definida.
- Usar `cn()` (clsx + tailwind-merge) para componer clases condicionales:
  ```ts
  // lib/utils.ts
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';
  export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
  ```
- **No** usar `@apply` indiscriminadamente. Solo en `globals.css` para tokens muy básicos.

---

## 7. Componentes UI: Convenciones

```tsx
// components/ui/button.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const button = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-dark',
        secondary: 'bg-white text-brand border border-brand hover:bg-brand-light',
        ghost: 'text-ink-secondary hover:bg-muted',
        destructive: 'bg-error text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-5 text-base rounded-md',
        lg: 'h-[52px] px-7 text-lg rounded-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
```

**Reglas**:
- Componentes con `forwardRef` para integración con librerías que necesitan refs.
- `cva` (`class-variance-authority`) para variantes tipadas.
- Sin estilos inline.
- Sin colores hardcodeados.
- Soportar `className` adicional vía `cn()`.

---

## 8. Estados de UI

Toda pantalla que carga datos diseña los 4 estados:

1. **Loading**: skeleton del contenido futuro (`loading.tsx` en App Router, `Suspense` con `fallback`).
2. **Empty**: ilustración + texto + acción primaria.
3. **Error**: mensaje claro + botón "Reintentar".
4. **Success**: el contenido normal.

```tsx
// app/(app)/orders/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-13 bg-muted rounded-md animate-pulse" />
      ))}
    </div>
  );
}
```

```tsx
// app/(app)/orders/error.tsx
'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="text-center py-7">
      <p className="text-ink-primary">No pudimos cargar tus pedidos.</p>
      <button onClick={reset} className="mt-4 text-brand">Reintentar</button>
    </div>
  );
}
```

---

## 9. Tipado y Contratos con la API

Tres opciones, en orden de preferencia:

1. **`packages/shared-types`** en el monorepo: tipos importados por ambos lados. Ideal cuando se controla todo el stack.
2. **OpenAPI** generado por NestJS (`@nestjs/swagger`) y consumido en frontend con `openapi-typescript` para generar tipos automáticamente.
3. **Definir tipos manualmente** en `features/<dominio>/types.ts` siguiendo los DTOs del backend.

**Nunca** usar `any` como tipo de respuesta. Si el contrato no está claro, define un tipo provisional con TODO comment.

```ts
// features/orders/types.ts
export interface Order {
  id: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string; // ISO date string
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
```

---

## 10. Performance

- **Imágenes**: usar `next/image`, definir `width`/`height` o `fill` con contenedor con dimensiones.
- **Fonts**: `next/font` para evitar layout shift.
- **Code splitting** con `dynamic()` para componentes pesados que no se ven inmediatamente.
- **`<Link>` de Next**: para navegación interna, no `<a href>`.
- **Memoización**: solo después de medir. `useMemo`/`useCallback`/`React.memo` solo si hay un problema real.
- **Bundle analyzer** (`@next/bundle-analyzer`) revisado periódicamente.

---

## 11. Accesibilidad

- HTML semántico: `<button>` para acciones, `<a>` para navegación, `<nav>`, `<main>`, `<header>`.
- `<label>` asociado a cada input (`htmlFor` + `id`).
- `aria-label` en botones de solo icono.
- `aria-invalid` y `aria-describedby` en inputs con error.
- Focus visible siempre (no eliminar `outline` sin reemplazo).
- Contraste WCAG AA mínimo (ya garantizado por la paleta del theme).
- Probado con teclado: todo accesible con Tab, Enter, Esc, flechas.
- `prefers-reduced-motion` respetado en animaciones.

---

## 12. Variables de Entorno

```ts
// lib/env.ts
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  // server-only:
  AUTH_COOKIE_NAME: z.string().default('access_token'),
});

export const env = schema.parse(process.env);
```

**Reglas**:
- Solo `NEXT_PUBLIC_*` se expone al cliente (sin excepciones).
- Validar al import con Zod; si falta una variable, el build/arranque falla.
- Documentar en `.env.example`.

---

## Checklist Antes de Aprobar Código del Frontend

- [ ] Server Components por defecto; `'use client'` justificado.
- [ ] Sin `any` en props ni respuestas API.
- [ ] Sin colores ni espaciados hardcodeados (todo del theme).
- [ ] Estados loading, empty y error implementados.
- [ ] Formularios con validación Zod + react-hook-form.
- [ ] Inputs con `autoComplete` correcto y labels asociadas.
- [ ] Imágenes con `next/image`.
- [ ] Sin `<a href>` para rutas internas; usar `<Link>`.
- [ ] Tokens nunca en `localStorage` sin justificación.
- [ ] Variables sensibles no llevan prefijo `NEXT_PUBLIC_`.
- [ ] Accesibilidad: HTML semántico, foco visible, AA.
