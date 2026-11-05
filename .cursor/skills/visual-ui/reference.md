# Recetas de clase

Copia la receta de la familia. No combines sky de admin con `neutral` de residente ni con el fondo fijo de superadmin.

## Admin y subadmin

Página: `space-y-6` dentro del `main` del layout.

Título: `text-2xl font-bold text-gray-900 dark:text-white`.
Apoyo: `text-sm text-gray-500 dark:text-gray-400`.
Sección: `text-lg font-semibold text-gray-900 dark:text-white`.

Primario:

```
inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed
```

Icono del primario: `w-5 h-5`.

Secundario: `px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`.

Destructivo: `px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors`.

Tarjeta: `bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700`.
Tarjeta clicable: suma `rounded-2xl hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300`.

Campo y select:

```
w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent
```

Filtro de condominio: el select usa `w-full md:w-96` con esas mismas clases.

Pestaña activa: `border-b-2 border-sky-500 text-sky-600 dark:text-sky-400`.
Inactiva: `border-transparent text-gray-500 dark:text-gray-400`.

Chip de estado: `px-2 py-1 text-xs font-medium rounded-full`, con el par de color que ya usa esa pantalla (`bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`, y el equivalente en ámbar, rojo o sky).

Tabla: contenedor `overflow-x-auto`, tabla `min-w-full divide-y divide-gray-200 dark:divide-gray-700`, encabezado `bg-gray-50 dark:bg-gray-700` y `text-xs font-medium uppercase text-gray-500 dark:text-gray-300`, celda `px-6 py-4 text-sm`.

Vacío: `text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700`.
Carga: `animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full`.
Aviso: `p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400`.

Diálogo: overlay `fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4`. Panel `bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto`. Pie con `flex gap-2` y botones `flex-1`.

Fondo de app: `bg-gray-50 dark:bg-gray-950`. Sidebar `lg:w-72`, ítem activo `bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 rounded-xl`.

## Residente

Misma estructura que admin, con tokens `neutral` y `bg-gradient-brand` en la marca y el ítem activo. Campos y tarjetas usan `dark:bg-neutral-800`, `border-neutral-200 dark:border-neutral-700` y `text-neutral-900 dark:text-white`. El botón primario puede usar `bg-gradient-brand text-white rounded-xl`. No cambies una pantalla de residente a la escala `gray` del admin.

## Superadmin

Fondo `bg-gray-900`. No hay modo claro.

Tarjeta: `bg-gray-800 rounded-xl border border-gray-700`.
Texto: título `text-white`, cuerpo `text-gray-300`, apoyo `text-gray-400`.
Primario de plataforma: `bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg`.
Stat: `rounded-xl p-5 border` con el tinte ya usado (`from-purple-500/10`, `from-green-500/10`, `from-yellow-500/10`, `from-blue-500/10`).
Menú de tres puntos: `ActionMenu` con `menuClassName="w-52 rounded-lg border border-gray-700 bg-gray-800 shadow-xl"` e `iconClassName="w-4 h-4"`.
Sidebar `lg:pl-64`.

## Vista previa de un mapa

Se incrusta si el enlace trae `/maps/embed`, coordenadas `@lat,lng`, `q` / `query` / `ll`, o `/maps/place/` y `/maps/search/` con nombre. Eso arma `https://maps.google.com/maps?q=...&z=16&output=embed`.

Un corto `https://maps.app.goo.gl/...` espera 400 ms y llama `GET /api/condominiummaps/resolve-link`. El API solo sigue redirecciones `https` de Google.

El formulario ofrece solo `upload` y `mapsLink`. El diálogo usa `max-h-[90vh] overflow-y-auto`.

## Menú de acciones

```tsx
<ActionMenu
  open={openId === row.id}
  onOpenChange={(next) => setOpenId(next ? row.id : null)}
>
  <button
    type="button"
    onClick={() => { doAction(row); setOpenId(null) }}
    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
  >
    Editar
  </button>
</ActionMenu>
```

En superadmin la opción usa `text-gray-300 hover:bg-gray-700` sin par `dark:`.

## Balance

Un bloque tiene un primario. El encabezado es `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6`. Debajo, `space-y-4` o `gap-4`. Rejilla de tablero: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`.

## Qué no hacer

- Inventar un botón sólido `bg-sky-600` si esa pantalla ya usa el gradiente `from-sky-500 to-blue-600`.
- Pasar una pantalla de admin a `neutral`, o una de superadmin a modo claro.
- Menú `absolute` dentro de una tabla o tarjeta con `overflow-hidden`.
- Campo "URL de imagen" para un plano o una foto del condominio.
- Botón "Abrir mapa" como único resultado cuando el enlace sí se puede incrustar.
- Bajar un control de `px-4 py-2`.
- Verificar solo en escritorio.
