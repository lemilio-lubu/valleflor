# CLAUDE.md — Valleflor / Terrazul Agribusiness Group

Este archivo se carga automáticamente en cada conversación. Define las reglas no negociables del proyecto.

---

## Skill activa

La skill **`valleflor-stack-best-practices`** está instalada en `.claude/skills/`. Antes de escribir código, consulta siempre la referencia correspondiente:

| Tarea | Referencia |
|-------|-----------|
| Módulos, controllers, services, guards, pipes | `.claude/commands/references/nestjs.md` |
| Entities, repositorios, migraciones, TypeORM | `.claude/commands/references/typeorm-postgres.md` |
| JWT, autenticación, guards de roles | `.claude/commands/references/auth-security.md` |
| Componentes Next.js, fetching, Tailwind | `.claude/commands/references/nextjs-frontend.md` |
| Docker, docker-compose, variables de entorno | `.claude/commands/references/infra-docker.md` |
| Tests unitarios, integración, e2e | `.claude/commands/references/testing.md` |
| Pruebas BDD con .feature de Gherkin (Cucumber.js) | `.claude/commands/references/bdd-cucumber.md` |

---

## Guideline de Diseño — Terrazul

Documento completo en `.claude/guidelines/valleflor-guideline.claude.md`. Resumen ejecutivo:

### Paleta de colores — clases Tailwind del proyecto (`apps/web/tailwind.config.js`)

Estas son las clases realmente usadas en el sistema. Úsalas siempre para mantener consistencia.

#### Textos
| Propósito | Clase |
|-----------|-------|
| Texto principal (títulos, datos) | `text-carbon-50` |
| Texto secundario (descripciones) | `text-carbon-300` |
| Texto terciario (placeholders, meta) | `text-carbon-400` |
| Texto deshabilitado | `text-carbon-500` |
| Énfasis extra (subtítulos) | `text-carbon-200` |
| CTA / links primarios | `text-verde-600` |
| Hover links | `text-verde-700` |
| Acento azul suave | `text-verde-400` / `text-verde-500` |
| Éxito / positivo / real | `text-agro-500` / `text-agro-600` |
| Estimado / advertencia | `text-dorado-500` / `text-dorado-400` |
| Error / destructivo | `text-red-500` / `text-red-600` |

#### Fondos
| Propósito | Clase |
|-----------|-------|
| Fondo base de página | `bg-white` |
| Cards, sidebar, paneles | `bg-surface-raised` |
| Inputs en reposo, filas alternas, hover | `bg-surface-overlay` |
| CTA primario botón | `bg-verde-600` |
| Hover CTA | `bg-verde-700` |
| Fondo suave primario | `bg-verde-50` / `bg-verde-500/10` |
| Fondo éxito suave | `bg-agro-50` |
| Fondo error suave | `bg-red-50` |
| Fondo error sólido | `bg-red-500` / `bg-red-600` |

#### Bordes
| Propósito | Clase |
|-----------|-------|
| Bordes generales de tabla y cards | `border-surface-border` |
| Borde CTA / foco primario | `border-verde-600` |
| Borde éxito | `border-agro-200` / `border-agro-500` |
| Borde estimado | `border-dorado-500` / `border-dorado-400/50` |
| Borde error | `border-red-500/20` / `border-red-300` |

#### Ring (focus)
| Propósito | Clase |
|-----------|-------|
| Foco inputs primarios | `ring-verde-600` |
| Foco estimados | `ring-dorado-500` |

**Reglas obligatorias:**
- Nunca usar hex hardcodeados (`bg-[#xxx]`).
- No usar `blue-*` ni `green-*` (no pertenecen al sistema).
- `red-*` solo para errores y acciones destructivas, nunca decorativo.
- `agro-*` para datos reales/confirmados, `dorado-*` para estimaciones.

### Proporción Áurea (φ = 1.618) — Escala dimensional

**Todas** las dimensiones del sistema se derivan de φ. El `tailwind.config.js` ya sobreescribe los defaults de Tailwind con estos valores — úsalos siempre.

#### Tipografía — `text-*` (ya en escala φ, solo usar estas clases)
| Clase | Tamaño / Line-height | Uso |
|-------|---------------------|-----|
| `text-xs` | 12px / 16px | Captions, badges, metadatos, etiquetas de tabla |
| `text-sm` | 14px / 20px | Texto de apoyo, labels de formulario, contenido de tabla |
| `text-base` | 16px / 24px | Texto base de párrafos |
| `text-lg` | 20px / 28px | Énfasis, subtítulos pequeños |
| `text-xl` | 26px / 32px | Títulos de sección |
| `text-2xl` | 42px / 48px | Títulos principales |
| `text-3xl` | 68px / 76px | Hero, h1 destacado |

> No usar tamaños fuera de esta escala (`text-[15px]`, `text-base2`, etc.).

#### Bordes redondeados — `rounded-*` (ya en escala φ)
| Clase | Valor | Uso |
|-------|-------|-----|
| `rounded-sm` | 4px | Badges, chips pequeños |
| `rounded` / `rounded-md` | 4px / 8px | Inputs, botones, tooltips |
| `rounded-lg` | 12px | Cards, dropdowns |
| `rounded-xl` | 20px | Modales, contenedores destacados |
| `rounded-full` | 9999px | Avatares, pills, switches |

#### Espaciado — tokens `phi-*` (preferidos sobre números sueltos)
| Token | Valor | Equivalente Tailwind | Uso |
|-------|-------|---------------------|-----|
| `phi-1` | 4px | `p-1` | Espaciado mínimo, icono + texto |
| `phi-2` | 8px | `p-2` | Padding interno mínimo, gaps pequeños |
| `phi-3` | 12px | `p-3` | Gap estándar entre elementos |
| `phi-4` | 20px | `p-5` | Padding de inputs y cards |
| `phi-5` | 32px | `p-8` | Separación entre secciones |
| `phi-6` | 52px | `px-[52px]` | Margen entre bloques principales |
| `phi-7` | 84px | — | Espaciado de página |
| `phi-8` | 136px | — | Separaciones macro de layout |

> El sistema actualmente usa mezcla de `phi-*` y números Tailwind estándar. En código **nuevo** preferir `phi-*`. En código **existente** no migrar por consistencia interna del componente.

### Botones
- **Primario** (`btn-primary`): azul Terrazul, 1 por pantalla, acción principal.
- **Secundario / Ghost** (`btn-ghost`): acciones complementarias.
- **Destructivo** (`btn-danger`): rojo, solo para eliminar/dar de baja.
- Estados: `disabled` con `opacity-50 cursor-not-allowed`, `loading` con spinner.

### Componentes
- **Inputs**: label siempre visible (nunca solo placeholder), validación al perder foco, mensaje de error debajo.
- **Modales**: overlay `rgba(16,24,40,0.5)`, botón X arriba derecha, acciones primarias abajo derecha, cerrar con Esc y click fuera.
- **Tablas**: header en `bg-surface-overlay`, filas alternas, hover en fila, bordes horizontales únicamente.
- **Empty states**: siempre con mensaje explicativo + acción sugerida.
- **Loading**: skeleton preferido sobre spinner para contenido de tablas/cards.

### Principios Nielsen (aplicación práctica)
1. **Visibilidad de estado**: toast tras toda acción exitosa, skeleton en cargas, spinner en botones pendientes.
2. **Lenguaje del dominio**: terminología agrícola (finca, semana, responsable, variedad, color).
3. **Control del usuario**: botón Cancelar siempre visible, confirmación solo para acciones destructivas.
4. **Consistencia**: mismo término para misma acción en toda la app.
5. **Prevención de errores**: validar inputs, deshabilitar submit mientras está pendiente.
6. **Errores humanos**: mensajes claros en español, nunca códigos de error crudos.

### Anti-patrones prohibidos
- Rojo como decoración (solo errores/destructivos).
- Modales anidados.
- Validar solo al enviar (validar al perder foco).
- `console.log` en producción.
- Texto centrado en párrafos largos.
- Colores como único indicador de estado (siempre acompañar con icono o texto).

---

## Guideline de Arquitectura

Documento completo en `.claude/guidelines/monolith-architecture.claude.md`. Reglas clave:

- **Flujo de dependencias**: `infrastructure → application → domain`. Nunca al revés.
- **Módulos independientes**: los módulos no se importan entre sí directamente; comunicación por interfaces o eventos.
- **Lógica de negocio en services**, nunca en controllers ni en componentes React.
- **`shared/`** solo utilidades transversales, sin lógica de negocio.
- **Todo validado en los bordes**: DTOs con `class-validator` en la entrada HTTP; env vars validadas al arrancar.

---

## Stack

- **Backend**: NestJS 10 + TypeORM + PostgreSQL 15
- **Frontend**: Next.js 14 App Router + React 18 + Tailwind CSS
- **Auth**: JWT con Passport
- **Infra**: Docker + Docker Compose
- **Gestor de paquetes**: npm 10 (workspaces)

## Variables de entorno
- Backend: `apps/api/.env` (nunca commitear)
- Frontend: solo `NEXT_PUBLIC_*` se expone al cliente
- Nunca leer `process.env` directo fuera del módulo de config

## Convenciones de código
- TypeScript estricto (`strict: true`, sin `any` sin justificación)
- Archivos en `kebab-case`, clases en `PascalCase`, variables en `camelCase`
- Imports absolutos con alias (`@/`) — nunca rutas relativas profundas
- Commits convencionales: `feat(api):`, `fix(web):`, `refactor:`, etc.
