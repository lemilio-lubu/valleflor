# Guideline de Diseño de Interfaz — Terrazul Agribusiness Group

> Documento maestro para el diseño y construcción de interfaces de usuario en productos digitales de Terrazul. Combina los **10 Principios de Heurística de Nielsen**, mejores prácticas de **UX/UI**, **proporción áurea (φ = 1.618)** como sistema dimensional, y una **paleta light** alineada con la identidad de marca.

---

## 1. Filosofía de Diseño

Terrazul opera en agronegocios: el diseño debe transmitir **confianza, claridad y arraigo a la tierra**. La interfaz debe sentirse profesional pero cálida, ordenada pero viva. Toda decisión visual responde a tres pilares:

- **Claridad antes que decoración**: la información agrícola y comercial es densa; el diseño la hace digerible.
- **Consistencia matemática**: el uso de la proporción áurea garantiza armonía visual sistemática, no arbitraria.
- **Accesibilidad real**: los usuarios trabajan en campo, oficinas y dispositivos diversos; la UI debe funcionar para todos.

---

## 2. Paleta de Colores (Tema Light)

Extraída de la identidad visual de Terrazul, con jerarquía funcional clara.

### 2.1 Colores de Marca

| Token | Hex | Uso |
|-------|-----|-----|
| `--brand-primary` | `#1B3FA0` | Azul Terrazul. Color principal: headers, CTAs primarios, enlaces, branding. |
| `--brand-primary-dark` | `#142E78` | Estados hover/active del primario. |
| `--brand-primary-light` | `#E8EDF8` | Fondos de selección, badges suaves, highlights. |
| `--brand-secondary` | `#2E8B3D` | Verde Terrazul. Estados de éxito, indicadores positivos, agro/sostenibilidad. |
| `--brand-accent` | `#D32F2F` | Rojo Terrazul. Solo para alertas críticas, errores destructivos, énfasis muy puntual. |

### 2.2 Neutrales (Tema Light)

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg-base` | `#FFFFFF` | Fondo principal de la app. |
| `--bg-surface` | `#FAFBFC` | Fondo de cards, paneles elevados sutilmente. |
| `--bg-muted` | `#F2F4F7` | Fondo de zonas secundarias, inputs en reposo, filas alternas. |
| `--border-subtle` | `#E4E7EC` | Bordes de cards, divisores suaves. |
| `--border-default` | `#D0D5DD` | Bordes de inputs, contornos visibles. |
| `--text-primary` | `#101828` | Texto principal, títulos. |
| `--text-secondary` | `#475467` | Texto de apoyo, descripciones. |
| `--text-tertiary` | `#667085` | Placeholders, metadatos, timestamps. |
| `--text-disabled` | `#98A2B3` | Estados deshabilitados. |

### 2.3 Colores Funcionales (Semánticos)

| Token | Hex | Uso |
|-------|-----|-----|
| `--success` | `#2E8B3D` | Confirmaciones, estados positivos. |
| `--success-bg` | `#ECFDF3` | Fondos de banners de éxito. |
| `--warning` | `#DC9B04` | Advertencias, requiere atención. |
| `--warning-bg` | `#FFFAEB` | Fondos de advertencia. |
| `--error` | `#D32F2F` | Errores, validaciones fallidas, acciones destructivas. |
| `--error-bg` | `#FEF3F2` | Fondos de error. |
| `--info` | `#1B3FA0` | Información neutra (usa el primario). |
| `--info-bg` | `#E8EDF8` | Fondos informativos. |

### 2.4 Reglas de Uso del Color

- **Contraste mínimo AA**: texto sobre fondo siempre cumple WCAG 2.1 AA (4.5:1 para texto normal, 3:1 para texto grande).
- **El rojo nunca se usa decorativamente**: solo para errores y acciones destructivas confirmadas.
- **Proporción 60-30-10**: 60% neutrales claros, 30% azul Terrazul, 10% acentos (verde/rojo según contexto).
- **El verde refuerza lo agro**: úsalo en métricas de cultivo, sostenibilidad, crecimiento de KPIs.

---

## 3. Sistema Dimensional Basado en Proporción Áurea (φ = 1.618)

Toda dimensión del sistema se deriva de un valor base multiplicado o dividido por φ. Esto garantiza relaciones armónicas entre todos los elementos.

### 3.1 Escala de Espaciado

Base: `8px`. Cada paso es aproximadamente el anterior × φ (redondeado a múltiplos de 4 para precisión en pantalla):

| Token | Valor | Cálculo aproximado | Uso |
|-------|-------|--------------------|-----|
| `--space-1` | `4px` | base / φ | Espaciado mínimo entre elementos pegados (icono + texto). |
| `--space-2` | `8px` | base | Padding interno mínimo, gap pequeño. |
| `--space-3` | `12px` | base × φ⁰·⁵ | Gap estándar entre elementos cercanos. |
| `--space-4` | `20px` | base × φ¹ | Padding de inputs, gap de cards. |
| `--space-5` | `32px` | base × φ² | Separación entre secciones. |
| `--space-6` | `52px` | base × φ³ | Margen entre bloques principales. |
| `--space-7` | `84px` | base × φ⁴ | Espaciado de página, hero sections. |
| `--space-8` | `136px` | base × φ⁵ | Separaciones macro de layout. |

### 3.2 Escala Tipográfica

Base: `16px` (tamaño cómodo de lectura). Cada nivel multiplica por φ aproximado:

| Token | Tamaño | Line-height | Peso | Uso |
|-------|--------|-------------|------|-----|
| `--text-xs` | `12px` | `16px` | 500 | Captions, badges, metadatos. |
| `--text-sm` | `14px` | `20px` | 400 | Texto de apoyo, labels de formulario. |
| `--text-base` | `16px` | `24px` | 400 | Texto base de párrafos y UI. |
| `--text-lg` | `20px` | `28px` | 500 | Énfasis, subtítulos pequeños. |
| `--text-xl` | `26px` | `32px` | 600 | Títulos de sección (h3). |
| `--text-2xl` | `42px` | `48px` | 700 | Títulos principales (h2). |
| `--text-3xl` | `68px` | `76px` | 700 | Hero, h1 destacado. |

> **Nota**: las relaciones 16 → 26 → 42 → 68 mantienen ratio cercano a φ (1.625, 1.615, 1.619), generando jerarquía visual armónica.

### 3.3 Radios de Esquina (Border Radius)

Base: `4px`. Escala áurea:

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `4px` | Inputs, badges, chips. |
| `--radius-md` | `8px` | Botones, tooltips. |
| `--radius-lg` | `12px` | Cards, modales pequeños. |
| `--radius-xl` | `20px` | Modales grandes, contenedores destacados. |
| `--radius-full` | `9999px` | Avatares, pills, switches. |

### 3.4 Layout y Anchos

Aplicar la proporción áurea a la división del layout es uno de los usos más potentes de φ:

- **Layout 1:1.618** para dashboards: panel lateral + área principal en proporción áurea (ej. 320px / 518px en una columna de 838px).
- **Contenedor de lectura óptimo**: máximo `680px` de ancho para texto largo (cercano a 65 caracteres por línea).
- **Grid principal**: 12 columnas con gap de `--space-4` (20px) y márgenes laterales `--space-6` (52px) en desktop.
- **Breakpoints**:
  - Mobile: `< 640px`
  - Tablet: `640px – 1024px`
  - Desktop: `1024px – 1440px`
  - Wide: `> 1440px`

### 3.5 Sombras (Elevación)

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-xs` | `0 1px 2px rgba(16,24,40,0.05)` | Inputs, botones planos. |
| `--shadow-sm` | `0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)` | Cards en reposo. |
| `--shadow-md` | `0 4px 8px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)` | Dropdowns, tooltips. |
| `--shadow-lg` | `0 12px 20px rgba(16,24,40,0.10), 0 4px 8px rgba(16,24,40,0.06)` | Modales, popovers grandes. |

---

## 4. Tipografía

- **Familia primaria**: `Inter`, `system-ui`, `-apple-system`, `sans-serif`. Excelente legibilidad y carácter neutro profesional.
- **Familia para datos numéricos**: `JetBrains Mono` o `Roboto Mono` para tablas con cifras (alinea decimales y facilita lectura).
- **Pesos disponibles**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold). No usar pesos fuera de esta escala.
- **Letter-spacing**: `-0.01em` para títulos grandes (≥ 26px), `0` para texto base.
- **Idioma**: español como predeterminado, soporte para inglés. Evitar uso excesivo de mayúsculas (solo en labels muy cortos tipo "AGRIBUSINESS GROUP").

---

## 5. Los 10 Principios de Nielsen Aplicados

### Principio 1: Visibilidad del Estado del Sistema

El usuario siempre debe saber qué está pasando.

- **Loading states** en toda acción que tarde más de 200ms: spinner, skeleton o progress bar.
- **Skeleton screens** preferidos sobre spinners para cargas de contenido (cards, tablas).
- **Toasts** de confirmación (3-5s) tras acciones exitosas.
- **Indicadores de progreso** explícitos en flujos multi-paso (wizard de creación de pedidos, registro).
- **Auto-guardado visible**: "Guardado hace 2s" en formularios largos.
- **Estado de conexión**: banner discreto si se pierde conectividad (crítico para usuarios en campo).

### Principio 2: Coincidencia entre el Sistema y el Mundo Real

El lenguaje y los conceptos de la UI deben reflejar el dominio agrícola del usuario.

- Usar terminología del agro: "Lote", "Cosecha", "Hectárea", "Cultivo" en lugar de tecnicismos genéricos.
- Iconografía contextual: hojas, gotas, sol, tractor para cultivos; balanzas, cajas para inventario.
- Formato de fechas regional: `DD/MM/YYYY` por defecto en LATAM.
- Unidades de medida según contexto: hectáreas, quintales, toneladas, sacos.
- Moneda local con conversión opcional a USD cuando aplique.

### Principio 3: Control y Libertad del Usuario

El usuario debe poder deshacer acciones y salir de procesos sin penalización.

- **Botón "Cancelar"** siempre visible en formularios y modales.
- **Undo de acciones destructivas** (eliminar lote, cancelar pedido): toast con botón "Deshacer" durante 8 segundos antes de aplicar permanentemente.
- **Breadcrumbs** en jerarquías de más de 2 niveles.
- **Cerrar modales** con: botón X, tecla Esc, click fuera del modal (excepto en flujos críticos).
- **Confirmación doble** solo para acciones irreversibles graves (eliminar cuenta, borrar histórico).
- **Salir de wizards** preserva el progreso (auto-guardado de borrador).

### Principio 4: Consistencia y Estándares

Mismas convenciones en toda la aplicación.

- **Botones primarios** siempre azul Terrazul, alineados a la derecha en formularios y modales.
- **Botones destructivos** siempre rojo, separados visualmente de acciones positivas.
- **Iconos**: una sola librería (recomendado: Lucide o Phosphor), nunca mezclar estilos.
- **Mismo término para misma acción**: si en una pantalla es "Eliminar", en todas es "Eliminar" (no "Borrar" en otra).
- **Patrones estándar de la web**: el logo arriba a la izquierda lleva al inicio; el avatar arriba a la derecha despliega menú de usuario.
- **Atajos de teclado** consistentes: Ctrl+S guarda, Esc cierra, Ctrl+K abre búsqueda global.

### Principio 5: Prevención de Errores

Mejor evitar el error que mostrar un mensaje después.

- **Validación en tiempo real** (al perder foco del input, no al teclear), con mensaje claro debajo del campo.
- **Restricciones en inputs**: campos numéricos no aceptan letras, fechas usan date picker.
- **Valores por defecto inteligentes**: fecha de hoy, moneda local, último valor usado.
- **Confirmaciones** antes de operaciones costosas: "¿Confirmar pedido por $24,500?".
- **Deshabilitar botones** mientras una acción está en curso para evitar dobles envíos.
- **Sugerencias y autocompletado** en búsquedas y selectores con muchas opciones.

### Principio 6: Reconocer en Lugar de Recordar

Minimizar la carga de memoria del usuario.

- **Etiquetas siempre visibles** en inputs (no solo placeholders que desaparecen).
- **Histórico de búsquedas recientes** en el buscador global.
- **Selectores con búsqueda** cuando hay más de 7 opciones.
- **Iconos acompañados de texto** en navegación principal (no solo iconos).
- **Tooltips** en iconos de acción rápida.
- **Información contextual visible**: en una pantalla de pedido, mostrar nombre del cliente sin tener que abrir otra vista.

### Principio 7: Flexibilidad y Eficiencia de Uso

Acelerar el trabajo de usuarios expertos sin estorbar a los novatos.

- **Atajos de teclado** documentados (modal accesible con `?`).
- **Acciones masivas** en tablas: seleccionar varios y aplicar acción a todos.
- **Filtros guardados** y vistas personalizadas en pantallas de listado.
- **Búsqueda global** con sintaxis avanzada (`cliente:Pérez fecha:>2026-01-01`).
- **Drag & drop** para reordenar listas y subir archivos.
- **Plantillas** para entidades repetitivas (pedidos recurrentes, reportes frecuentes).

### Principio 8: Diseño Estético y Minimalista

Cada elemento en pantalla debe ganarse su lugar.

- **Una acción primaria por pantalla**: solo un botón con color de marca; el resto son secundarios o terciarios.
- **Espacio en blanco generoso**: usar `--space-5` y `--space-6` entre secciones.
- **Densidad de información** ajustable (compact / comfortable / spacious) en tablas grandes.
- **Evitar sobre-decoración**: sin gradientes innecesarios, sin sombras dramáticas, sin iconos que no comunican.
- **Mostrar solo lo relevante**: filtros avanzados ocultos en colapsable, abriéndose solo si el usuario lo pide.

### Principio 9: Ayudar a Reconocer, Diagnosticar y Recuperarse de Errores

Cuando el error ocurre, debe ser claro qué pasó y cómo solucionarlo.

- **Mensajes de error en lenguaje humano**, sin códigos crípticos: "No pudimos conectar con el servidor. Reintenta en unos segundos." en lugar de "Error 503".
- **Ubicación clara**: el error aparece junto al campo o sección que lo causó.
- **Sugerencia de solución**: "El RUC debe tener 11 dígitos. Ingresaste 10."
- **Estados vacíos informativos**: cuando una tabla está vacía, explicar por qué y ofrecer acción ("Aún no tienes pedidos. + Crear primer pedido").
- **Página 404 útil**: con búsqueda, enlaces a secciones populares, contacto a soporte.
- **Recuperación de formularios**: si el envío falla, los datos no se pierden.

### Principio 10: Ayuda y Documentación

La UI debe ser autoexplicativa, pero la ayuda contextual siempre disponible.

- **Tooltips** con icono `(?)` junto a campos complejos o términos técnicos.
- **Onboarding contextual** la primera vez que se usa una función nueva (tour interactivo opcional).
- **Centro de ayuda** accesible desde el menú principal, con buscador.
- **Empty states educativos**: explicar qué es la sección y cómo empezar.
- **Mensajes de éxito que enseñan**: "Pedido creado. Ahora puedes asignarle un transportista desde el detalle."
- **Changelog visible** para que los usuarios descubran funciones nuevas.

---

## 6. Componentes Base — Especificaciones

### 6.1 Botones

| Variante | Fondo | Texto | Borde | Uso |
|----------|-------|-------|-------|-----|
| Primario | `--brand-primary` | `#FFFFFF` | ninguno | 1 por pantalla, acción principal. |
| Secundario | `#FFFFFF` | `--brand-primary` | `1px --brand-primary` | Acciones complementarias. |
| Terciario / Ghost | transparente | `--text-secondary` | ninguno | Acciones de bajo peso. |
| Destructivo | `--error` | `#FFFFFF` | ninguno | Eliminar, cancelar definitivo. |

**Tamaños** (altura fija para alineación con inputs):

- `sm`: 32px alto, padding `8px 12px`, `--text-sm`.
- `md` (default): 40px alto, padding `10px 20px`, `--text-base`.
- `lg`: 52px alto, padding `14px 32px`, `--text-lg`.

**Estados**: `default`, `hover` (oscurece 8%), `active` (oscurece 12%), `disabled` (opacity 0.5, cursor not-allowed), `loading` (spinner reemplaza texto).

### 6.2 Inputs

- Altura: 40px (md) o 48px (lg).
- Padding interno: `10px 16px`.
- Borde: `1px --border-default`. En foco: `2px --brand-primary` con `--brand-primary-light` como halo.
- Border-radius: `--radius-md` (8px).
- Label arriba del input, siempre visible.
- Mensaje de ayuda o error debajo, en `--text-sm`.

### 6.3 Cards

- Fondo: `--bg-base` o `--bg-surface`.
- Borde: `1px --border-subtle` o sombra `--shadow-sm`.
- Radio: `--radius-lg` (12px).
- Padding interno: `--space-4` (20px) en mobile, `--space-5` (32px) en desktop.

### 6.4 Tablas

- Header: fondo `--bg-muted`, texto `--text-secondary` en `--text-sm` peso 600 mayúsculas espaciadas.
- Filas: altura mínima 52px, padding vertical `--space-3`.
- Hover en fila: fondo `--bg-muted`.
- Filas alternas opcionales en tablas largas (zebra).
- Bordes horizontales: `1px --border-subtle`. Sin bordes verticales.

### 6.5 Modales

- Fondo overlay: `rgba(16, 24, 40, 0.5)`.
- Ancho: 480px (sm), 640px (md), 800px (lg).
- Padding: `--space-5` (32px).
- Border-radius: `--radius-xl` (20px).
- Sombra: `--shadow-lg`.
- Botón cerrar (X) arriba a la derecha.
- Acciones primarias abajo a la derecha.

---

## 7. Accesibilidad (No Negociable)

- **Contraste**: cumplir WCAG 2.1 AA mínimo, AAA en textos críticos.
- **Navegación por teclado**: toda funcionalidad accesible con Tab, Enter, Esc, flechas.
- **Focus visible**: outline de `2px` en `--brand-primary` siempre presente (nunca eliminar `outline: none` sin reemplazo).
- **ARIA labels**: en iconos sin texto, en inputs sin label visible, en modales (`aria-modal`, `aria-labelledby`).
- **Tamaño de toque mínimo**: 44×44px en mobile para cualquier elemento interactivo.
- **No depender solo del color**: errores siempre con icono + texto, no solo borde rojo.
- **Texto escalable**: la UI debe seguir funcionando con zoom de navegador al 200%.
- **Lectores de pantalla**: estructura semántica HTML correcta (`<nav>`, `<main>`, `<button>` real, no `<div onClick>`).

---

## 8. Movimiento y Animación

- **Duración estándar**: 200ms para transiciones pequeñas (hover, focus), 300ms para movimientos grandes (modales, drawers).
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out) para la mayoría; `cubic-bezier(0, 0, 0.2, 1)` (ease-out) para entradas.
- **Sin animación gratuita**: cada animación tiene un propósito (orientar, dar feedback, suavizar cambio).
- **Respetar `prefers-reduced-motion`**: deshabilitar animaciones para usuarios que lo prefieran.

---

## 9. Iconografía

- **Librería única**: Lucide Icons o Phosphor Icons. No mezclar.
- **Tamaños estándar**: 16px, 20px, 24px (siempre múltiplos de 4).
- **Stroke width**: 1.5px o 2px consistente en toda la app.
- **Color heredado del texto** por defecto (no hardcodear colores en SVGs).
- **Iconos siempre con label en navegación principal**, opcionalmente solos en acciones secundarias muy reconocibles (lápiz para editar, basura para eliminar).

---

## 10. Imágenes y Multimedia

- **Formatos**: WebP para fotos, SVG para iconos e ilustraciones, PNG solo si requiere transparencia y no es vectorial.
- **Lazy loading** por defecto fuera del viewport inicial.
- **Alt text** descriptivo en toda imagen informativa; `alt=""` en decorativas.
- **Aspect ratios estándar**: 16:9 para hero/portadas, 4:3 para fotos de productos, 1:1 para avatares.
- **Placeholders**: skeleton gris mientras carga, fallback con iniciales o icono si falla.

---

## 11. Estados Vacíos, de Error y de Carga

Todo componente que carga datos debe tener cuatro estados diseñados:

1. **Loading**: skeleton del contenido futuro, no spinner genérico.
2. **Empty**: ilustración + título + descripción + acción primaria sugerida.
3. **Error**: icono + mensaje claro + botón "Reintentar".
4. **Success / Default**: el contenido normal.

---

## 12. Checklist de Revisión de Pantalla

Antes de aprobar un diseño o implementación, verificar:

- [ ] Cumple los 10 principios de Nielsen aplicables.
- [ ] Solo una acción primaria visualmente dominante.
- [ ] Todos los colores son tokens del sistema (sin hex hardcodeados).
- [ ] Todos los espaciados son tokens (sin valores arbitrarios).
- [ ] Tipografía respeta la escala definida.
- [ ] Estados loading, empty y error están diseñados.
- [ ] Contraste AA verificado en textos.
- [ ] Navegable por teclado completamente.
- [ ] Funciona a 320px de ancho (mobile chico) y a 1920px (desktop wide).
- [ ] Zoom al 200% no rompe el layout.
- [ ] Iconos tienen aria-label si son interactivos sin texto.
- [ ] Mensajes de error son humanos y accionables.
- [ ] Acciones destructivas son confirmables o reversibles.
- [ ] No hay textos en mayúsculas largos (más de 3 palabras).

---

## 13. Anti-patrones a Evitar

- Botones con bajo contraste o sin estado de focus visible.
- Modales sobre modales (anidación).
- Validar formularios solo al enviar (validación tardía).
- Spinners en cada acción menor (genera percepción de lentitud).
- Tooltips en mobile (no hay hover real).
- Texto centrado en párrafos largos.
- Colores como único indicador de estado (rojo solo, sin icono ni texto).
- Iconos ambiguos sin label (¿qué hace este engranaje exactamente?).
- Diseños que solo funcionan en desktop ancho.
- Animaciones largas (> 400ms) que retrasan al usuario experto.
- Usar el rojo Terrazul como decoración (es solo para alertas críticas).

---

## 14. Tokens en CSS — Implementación Sugerida

```css
:root {
  /* Marca */
  --brand-primary: #1B3FA0;
  --brand-primary-dark: #142E78;
  --brand-primary-light: #E8EDF8;
  --brand-secondary: #2E8B3D;
  --brand-accent: #D32F2F;

  /* Neutrales */
  --bg-base: #FFFFFF;
  --bg-surface: #FAFBFC;
  --bg-muted: #F2F4F7;
  --border-subtle: #E4E7EC;
  --border-default: #D0D5DD;
  --text-primary: #101828;
  --text-secondary: #475467;
  --text-tertiary: #667085;
  --text-disabled: #98A2B3;

  /* Funcionales */
  --success: #2E8B3D;
  --success-bg: #ECFDF3;
  --warning: #DC9B04;
  --warning-bg: #FFFAEB;
  --error: #D32F2F;
  --error-bg: #FEF3F2;

  /* Espaciado áureo */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 20px;
  --space-5: 32px;
  --space-6: 52px;
  --space-7: 84px;
  --space-8: 136px;

  /* Tipografía */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 20px;
  --text-xl: 26px;
  --text-2xl: 42px;
  --text-3xl: 68px;

  /* Radios */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-xs: 0 1px 2px rgba(16,24,40,0.05);
  --shadow-sm: 0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04);
  --shadow-md: 0 4px 8px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04);
  --shadow-lg: 0 12px 20px rgba(16,24,40,0.10), 0 4px 8px rgba(16,24,40,0.06);

  /* Transiciones */
  --transition-fast: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Referencias

- *10 Usability Heuristics for User Interface Design* — Jakob Nielsen, NN/g
- *Refactoring UI* — Adam Wathan & Steve Schoger
- *The Golden Ratio in Web Design* — varios autores (principios aplicados)
- *WCAG 2.1 Guidelines* — W3C
- *Material Design 3* y *Apple Human Interface Guidelines* (referencias generales de patrones)
