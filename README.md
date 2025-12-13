<div align="center">
  <img width="1200" height="475" alt="VinylVision banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VinylVision

VinylVision es una aplicacion web pensada para coleccionistas espanoles de vinilos, CDs y cassettes. Desde la camara del navegador puedes capturar el lomo o la portada del disco, dejar que Gemini 2.5 Flash lea el texto y, con ayuda de la API de Discogs, completar la ficha y sincronizarla con Supabase para tener un respaldo en la nube.

## Caracteristicas principales

- **Escaner inteligente (Gemini + Discogs)**: toma una foto, Gemini extrae artista/titulo/catalogo y la app busca la edicion exacta en Discogs para rellenar pistas, sello y ano.
- **Formulario completo en espanol**: campos para artista, titulo, formato, sello, ano y lista de pistas con scroll infinito.
- **Buscador avanzado**: filtra por cualquier metadato, incluido el texto de la lista de canciones.
- **Sincronizacion con Supabase**: todas las operaciones se envian a Postgres mediante la API REST, ademas de guardarse en `localStorage` como respaldo offline.
- **Modo edicion protegido**: solo quien conoce `VITE_EDITOR_PASSWORD` puede abrir la vista de detalle o eliminar registros.

## Tecnologias

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- Tailwind utility classes embebidas en el JSX
- [Supabase](https://supabase.com/) para la base de datos y API REST
- [Discogs API](https://www.discogs.com/developers/) para la validacion y el enriquecimiento
- [Gemini 2.5 Flash](https://ai.google.dev/) via Google AI Studio para el reconocimiento visual
- [Lucide React](https://lucide.dev/) para los iconos

## Requisitos previos

- Node.js 18 o superior (recomendado 20.x)
- Un proyecto gratuito en Supabase
- Token de la API de Discogs (desde la seccion Developer de tu perfil)
- API key de Google AI Studio (Gemini 2.5 Flash)

## Estructura

```
vinylvision/
|- components/              # Biblioteca, Detalles, Escaner, botones
|- services/
|  |- discogsService.ts     # Llamadas a Discogs
|  |- geminiService.ts      # Cliente Gemini (vision)
|  |- scanAnalyzer.ts       # Combina Gemini + Discogs
|  |- librarySyncService.ts # CRUD Supabase
|  `- supabaseClient.ts     # Inicializacion Supabase
|- App.tsx                  # Router basado en estados
|- types.ts                 # Tipos compartidos
`- README.md
```

## Configurar Supabase

1. Crea la tabla `albums` con al menos:

| Columna          | Tipo        | Comentario                                      |
| ---------------- | ----------- | ----------------------------------------------- |
| `id`             | text (PK)   | generado con `crypto.randomUUID()` en el cliente |
| `artist`         | text        |                                                 |
| `title`          | text        |                                                 |
| `catalog_number` | text        | usa `catalogNumber` si prefieres camelCase      |
| `label`          | text        |                                                 |
| `format`         | text        | `Vinyl`, `CD`, `Cassette` o `Digital`           |
| `year`           | text/date   | admite `YYYY` o `YYYY-01-01`                    |
| `cover_url`      | text        | URL o base64                                   |
| `tracks`         | jsonb       | arreglo de `{ position, title, duration }`      |
| `added_at`       | bigint      | timestamp en milisegundos                       |

2. Habilita Row Level Security y crea politicas basicas para el rol `anon`:

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
```

3. Si tu esquema usa camelCase (`catalogNumber`, `coverUrl`, `addedAt`), define `VITE_SUPABASE_COLUMN_STYLE=camel` para que el cliente envie los campos correctos. Por defecto se usa snake_case.

## Flujo del escaner con IA

1. **Captura**: el usuario abre el modo Scan y elige *Lomo* (prioriza catalogo) o *Portada* (prioriza artista/titulo).
2. **Gemini**: enviamos la imagen a Gemini 2.5 Flash con un prompt especifico y obtenemos un JSON con los campos reconocidos.
3. **Discogs**: con esos datos realizamos una busqueda (catalogo > artista+titulo) y descargamos pistas, sello, formato y portada oficial.
4. **Formulario**: `AlbumDetails` se abre con todos los campos pre-rellenados para que puedas revisar y guardar.

Si no se encuentra coincidencia, siempre puedes editar los campos manualmente y mantener tu propia foto.

## Variables de entorno

Crea `.env.local` con:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon
VITE_SUPABASE_COLUMN_STYLE=camel   # usa "snake" si tus columnas estan en snake_case
VITE_DISCOGS_TOKEN=tu_token_discogs
VITE_GEMINI_API_KEY=tu_clave_de_gemini
VITE_EDITOR_PASSWORD=solo-tu-sabes-esto
```

`VITE_EDITOR_PASSWORD` es opcional pero recomendable para proteger la edicion.

## Scripts

| Comando           | Descripcion                                |
| ----------------- | ------------------------------------------ |
| `npm install`     | Instala dependencias                       |
| `npm run dev`     | Arranca Vite en modo desarrollo            |
| `npm run build`   | Genera la version optimizada en `dist/`    |
| `npm run preview` | Sirve el build resultante para pruebas     |

## Desarrollo local

1. Clona el repo y ejecuta `npm install`.
2. Rellena `.env.local` con tus claves de Supabase, Discogs y Gemini.
3. `npm run dev` y abre [http://localhost:3000](http://localhost:3000).
4. Usa `+ Manual` para crear un registro desde cero o `Scan` para usar la camara.
5. Verifica en Supabase que el disco se haya sincronizado. Si estas offline, la app seguira funcionando gracias al guardado en `localStorage`.

## Despliegue (ejemplo con Vercel)

1. Sube el repositorio a GitHub.
2. En Vercel crea un proyecto nuevo e importa el repo.
3. Configura:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Variables de entorno: todas las de `.env.local` (incluida `VITE_GEMINI_API_KEY`)
4. Lanzar el deploy. Cada push a `main` generara un despliegue nuevo.

## Roadmap sugerido

- Autenticacion real en Supabase para soportar multiples usuarios.
- Modo offline completo usando IndexedDB y sincronizacion diferida.
- Exportar la biblioteca a CSV/JSON y compartirla.
- Llevar el escaner a una app movil con Expo/Capacitor para un acceso a camara mas robusto.

Si detectas un bug o quieres proponer mejoras, abre un issue o un pull request. Felices vinilos.
