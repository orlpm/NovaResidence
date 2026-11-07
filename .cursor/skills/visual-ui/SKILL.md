---
name: visual-ui
description: >-
  Aplica el estándar visual de DomusCond con las clases que ya usa cada panel:
  admin y subadmin en sky/gray, residente en neutral y gradient-brand,
  superadmin en gray-900. Incluye vista previa de mapas, menús de tres puntos
  siempre visibles, layout responsive y balance. Usar al crear o cambiar
  pantallas, formularios, tablas, diálogos, menús, popups, mapas, imágenes,
  Tailwind o cualquier parte visual del frontend.
---

# Estándar visual

Toda pantalla nueva se ve como la sección en la que vive. Copia las clases de esa sección. No introduzcas otra paleta, otro radio ni otro botón primario.

Hay tres familias. Elige la de la ruta y no las mezcles:

| Ruta | Familia |
| --- | --- |
| `/admin`, `/subadmin`, seguridad, mantenimiento, contabilidad | Admin |
| `/resident` | Residente |
| `/superadmin` | Superadmin |

Las recetas de clase están en [reference.md](reference.md). Los breakpoints reales están en `src/Frontend/web/tailwind.config.js`: `xs` 375, `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536.

## Mapas

- Una imagen de mapa se guarda solo subiendo el archivo. Extensiones `.jpg`, `.jpeg`, `.png`, `.webp`. Máximo 8 MB (`src/Frontend/web/src/lib/uploadLimits.ts`). No ofrezcas un campo para pegar la URL de una imagen.
- Un enlace de Google Maps se guarda como enlace y se muestra como mapa incrustado, en el formulario mientras se escribe y en el lienzo ya guardado.
- Usa `MapBackground` (`src/Frontend/web/src/components/MapBackground.tsx`) y `googleMapsEmbedUrl` / `isGoogleMapsLink` (`src/Frontend/web/src/lib/mapsPreview.ts`). El admin y el residente comparten ese componente.
- Un enlace corto (`maps.app.goo.gl`) se resuelve con `condominiumMapService.resolveMapsLink` antes de incrustar. Si no hay vista previa posible, deja el enlace "Abrir en Google Maps".
- La URL de monitoreo de una cámara sigue siendo una dirección. No la conviertas en archivo.

## Menús siempre visibles

Todo menú de tres puntos usa `ActionMenu` (`src/Frontend/web/src/components/ActionMenu.tsx`). No crees otro `absolute` dentro de una celda, tarjeta o tabla.

- Portal con `position: fixed`, fuera de `overflow-hidden` y de `overflow-x-auto`.
- Se abre hacia arriba si no cabe abajo. Todas las opciones quedan dentro de la ventana.
- `z-index` 80, por encima del encabezado (`z-40`). Ciérralo antes de abrir un diálogo (`z-50`).
- Cierra con clic afuera, Escape y al elegir una acción.
- El botón es `type="button"`, `aria-label="Acciones"`, y no dispara el clic de la fila o tarjeta.
- En admin y residente el panel usa las clases por defecto. En superadmin pasa `menuClassName="w-52 rounded-lg border border-gray-700 bg-gray-800 shadow-xl"`.

La tabla puede tener `overflow-x-auto`. Ese contenedor no envuelve el menú. Iconos del menú: `w-4 h-4`.

## Responsive y balance

El layout ya da el margen. Admin: `main` con `py-4 sm:py-8 px-2 sm:px-6 lg:px-8` y sidebar `lg:w-72`. Residente: `lg:pl-72` y `py-8 px-4 sm:px-6 lg:px-8`. Superadmin: `lg:pl-64` y `p-6` sobre `bg-gray-900`. La página no agrega otro padding exterior ni hace scroll horizontal.

- La vista parte de 375px. El título y el botón primario van en `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.
- Una acción primaria por bloque, con la clase de esa familia. Cancelar y acciones secundarias usan el botón gris de la misma familia. Eliminar usa `bg-red-600 hover:bg-red-700 text-white`.
- Controles al alto que ya tiene la app: `px-4 py-2` en botones y campos. No bajes de eso. En `xs` un icono suelto lleva `p-2` y el icono `w-5 h-5`, que es el tamaño de `ActionMenu`.
- Texto que se lee: título `text-gray-900 dark:text-white` (superadmin: `text-white`), apoyo `text-sm text-gray-500 dark:text-gray-400`. `text-gray-400` se queda para iconos.
- Foco de campos: `focus:ring-2 focus:ring-sky-500`. En residente, `focus:ring-sky-500` sobre los tokens `neutral`. No quites el anillo.
- Tablas: `min-w-full` dentro de `overflow-x-auto`. En `xs` el encabezado de sección no se aplasta contra el botón.
- Diálogos: overlay `fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4`. Panel `w-full max-w-xl max-h-[90vh] overflow-y-auto`. Formularios cortos no pasan de `max-w-xl`; un detalle ancho usa `max-w-2xl`.
- Estados: vacío con borde punteado, carga con el spinner `border-sky-500`, error con fondo rojo suave. Están en la referencia.
- Toda acción que cambia estado (crear, editar, activar, desactivar, eliminar, aprobar) confirma con `toast.success` y un texto corto en participio, como «Área desactivada». El fallo va con `toast.error`. No dejes una acción que solo cambia la tarjeta sin aviso.
- Cada clase de color en admin y residente tiene su par `dark:`. Superadmin es oscuro fijo: no le agregues pares `dark:` de una pantalla clara.
- Respeta `prefers-reduced-motion` si agregas animación. Las transiciones existentes son `transition-all` o `transition-colors`.

## Verificar

Recorre el cambio en el navegador, en escritorio y a 375px, en la familia de color de esa ruta:

1. El botón primario, la tarjeta y el campo se ven igual que la pantalla de al lado.
2. Cada menú de tres puntos que tocaste muestra todas las opciones dentro de la ventana, también en la última fila.
3. Si tocaste mapas: la imagen solo entra por archivo y el enlace de Google Maps muestra el iframe.
4. En admin y residente, la misma pantalla en modo oscuro.
