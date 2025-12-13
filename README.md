<div align="center">
  <img width="1200" height="475" alt="VinylVision banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VinylVision

VinylVision es una aplicación web enfocada a coleccionistas españoles que quieren catalogar su biblioteca de vinilos/CDs/casetes. Permite escanear portadas o lomos desde la cámara, completar la ficha manualmente o apoyarse en la API de Discogs y sincronizar toda la información en Supabase para tener copia en la nube y acceso desde cualquier dispositivo.

## Características principales

- 📷 **Escáner integrado**: captura imágenes desde la cámara del navegador (modo portada/lomo) y adjunta la foto al nuevo registro.
- 🧠 **Autorrelleno opcional**: utiliza Discogs para recuperar título, artista, sello, formato y lista de pistas a partir de código de catálogo.
- 📝 **Edición completa**: formulario editable en español para artista, título, formato, año, sello y lista de canciones con scroll.
- 🔍 **Buscador inteligente**: filtra por artista, título, sello, formato, año o nombre/posición de cualquier pista.
- ☁️ **Sincronización Supabase**: los cambios quedan guardados en Postgres mediante la API REST de Supabase (además del fallback en `localStorage`).
- 📱 **Diseño listo para móvil**: la UI está pensada como primera iteración de una futura app móvil, con botones grandes y modos de cámara.
- 🔐 **Modo edición con contraseña**: sólo quien conoce `VITE_EDITOR_PASSWORD` puede entrar en la vista de edición.

## Tecnologías

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- Estilos con utilidades Tailwind (clases inline)
- [Supabase](https://supabase.com/) para la base de datos y API REST
- [Discogs API](https://www.discogs.com/developers/) (fetch directo)
- [Lucide React](https://lucide.dev/) para los iconos
- [Tesseract.js](https://github.com/naptha/tesseract.js) para el OCR en el flujo de escaneo

## Requisitos

- Node.js 18+ (recomendado 20.x)
- Cuenta gratuita en Supabase (o propia instancia Postgres con la API compatible)
- Clave personal de la API de Discogs (opcional pero recomendada)

## Estructura de carpetas

```
vinylvision/
├─ components/             # UI principal (Biblioteca, Detalles, Escáner, Botón)
├─ services/
│  ├─ discogsService.ts    # Llamadas a Discogs
│  ├─ librarySyncService.ts# CRUD contra Supabase
│  └─ supabaseClient.ts    # Cliente Supabase
├─ App.tsx                 # Router simple por estados (Librería, Escáner, Detalles)
├─ types.ts                # Tipos compartidos
├─ vite.config.ts          # Configuración Vite
├─ package.json
└─ README.md
```

## Configuración de Supabase

1. Crea un proyecto nuevo en Supabase.
2. En Table Editor crea la tabla `albums`. Puedes usar snake_case o camelCase, pero define al menos estas columnas:

| Columna          | Tipo    | Comentario                             |
| ---------------- | ------- | -------------------------------------- |
| `id`             | text PK | `crypto.randomUUID()` en el frontend   |
| `artist`         | text    |                                        |
| `title`          | text    |                                        |
| `catalog_number` | text    | (o `catalogNumber` si prefieres camel) |
| `label`          | text    |                                        |
| `format`         | text    | `Vinyl`, `CD`, `Cassette`, `Digital`   |
| `year`           | text o date |                                   |
| `cover_url`      | text    | base64 o URL externa                   |
| `tracks`         | jsonb   | array de `{ position, title, duration }` |
| `added_at`       | bigint  | timestamp en milisegundos              |

3. Si ya tenías columnas camelCase (`catalogNumber`, `coverUrl`, `addedAt`), añade en `.env.local` `VITE_SUPABASE_COLUMN_STYLE=camel` para que el cliente use los mismos nombres. Aprovecha para definir también `VITE_DISCOGS_TOKEN=tu_token_discogs` si quieres seguir usando el autofill con Discogs.

4. **Políticas RLS**: habilita Row Level Security en la tabla y crea políticas mínimas para el rol `anon`:

```sql
create policy "allow anon insert"
on public.albums
for insert
to anon
using (true)
with check (true);

create policy "allow anon select"
on public.albums
for select
to anon
using (true);

-- Opcionalmente agrega update/delete si lo necesitas.
```

## Variables de entorno

Crea un archivo `.env.local` en la raíz (no se sube a Git) con:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon
VITE_SUPABASE_COLUMN_STYLE=camel   # usa "snake" si tus columnas están en snake_case (valor por defecto)
VITE_DISCOGS_TOKEN=tu_token_discogs
VITE_EDITOR_PASSWORD=solo-tu-sabes-esto
```

Si no defines `VITE_EDITOR_PASSWORD`, cualquier usuario podrá editar. Puedes dejarlo vacío en entornos públicos sólo-lectura.

## Scripts

| Comando           | Descripción                           |
| ----------------- | ------------------------------------- |
| `npm install`     | Instala dependencias                  |
| `npm run dev`     | Arranca Vite en modo desarrollo       |
| `npm run build`   | Compila la app en `dist/`             |
| `npm run preview` | Sirve el build para revisión local    |

## Pasos para desarrollo local

1. Clona o descarga el repo.
2. `npm install`
3. Configura `.env.local` con tus valores de Supabase.
4. `npm run dev` y abre [http://localhost:3000](http://localhost:3000)

Cada vez que guardes cambios en Supabase se sincronizarán automáticamente al volver a cargar la app. Si no hay conexión, la biblioteca sigue funcionando con `localStorage`.

## Despliegue

Puedes usar Vercel, Netlify o Cloudflare Pages:

1. Subes el repo a GitHub/GitLab.
2. En la plataforma eliges:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_COLUMN_STYLE`
3. Cada push redeployará la web automáticamente.

## Próximos pasos sugeridos

- Implementar autenticación Supabase para que cada usuario tenga su propia biblioteca.
- Añadir soporte offline total (IndexedDB) y sincronización cuando vuelva la conexión.
- Exportar en CSV/JSON o integrarse con otros servicios musicales.
- Portar el escáner a una app móvil con Expo para acceso completo a cámara.

---

¡Listo! Con esta documentación deberías poder clonar, configurar y desplegar VinylVision fácilmente. Cualquier duda o mejora, abre un issue o PR. 🎶
