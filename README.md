# Monodi Generator

A web application for generating RDF/Turtle data for the Monodi viewer. It guides users through a multi-step workflow: defining document types, uploading documents, entering metadata, and exporting the resulting RDF.

The project consists of two packages:

- **root** — React SPA (React Router v7, Vite, TailwindCSS)
- **backend** — Express server that stores uploaded files and deployed RDF, and serves the frontend in production

## Prerequisites

- Node.js 20.x
- [pnpm](https://pnpm.io/) (the lockfile is pnpm-based; do not use npm or yarn)

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the frontend dev server

```bash
pnpm run dev
```

The app is available at <http://localhost:5173> with hot module replacement. In this mode the backend is not involved; API calls will fail gracefully (file uploads and deploys are logged to the browser console but do not block the UI).

### 3. Run the backend alongside the frontend (optional)

If you want to test the full stack locally, run the backend in a second terminal:

```bash
# In a second terminal
cd backend
MONODI_RESOURCE_DIR=/tmp/monodi/resources \
MONODI_RDF_DIR=/tmp/monodi/rdf \
MONODI_MANAGE_PASSWORD=secret \
pnpm run dev
```

The backend starts on port 3000 by default (override with `PORT=...`). The frontend dev server proxies nothing automatically, so backend calls from the dev frontend will hit `localhost:3000` only if the browser is pointed there. For full integration testing, build the frontend first (see below) and let the backend serve it.

#### Backend environment variables

| Variable | Required | Description |
|---|---|---|
| `MONODI_RESOURCE_DIR` | ✅ | Root directory for uploaded documents. PDFs are stored in `<dir>/pdf/`, all other files in `<dir>/docs/`. |
| `MONODI_RDF_DIR` | ✅ | Directory where `data.ttl` and timestamped state snapshots are written on deploy. |
| `MONODI_MANAGE_PASSWORD` | ✅ | Password for HTTP Basic Auth (required on every API request). The username is ignored. |
| `PORT` | – | Port the backend listens on. Defaults to `3000`. |

The backend exits immediately on startup if any required variable is unset.

## Building for Production

Build the frontend:

```bash
pnpm run build
```

Build the backend:

```bash
cd backend && pnpm run build
```

Then start the backend (which also serves the compiled frontend):

```bash
cd backend
MONODI_RESOURCE_DIR=/path/to/resources \
MONODI_RDF_DIR=/path/to/rdf \
MONODI_MANAGE_PASSWORD=changeme \
pnpm run start
```

The application is available at <http://localhost:3000>.

## Type-checking

```bash
pnpm run typecheck          # frontend (root package)
cd backend && npx tsc --noEmit  # backend
```

## Container Deployment

Build and run with Docker or Podman:

```bash
docker build -t monodi-generator .

docker run -p 3000:3000 \
  -e MONODI_RESOURCE_DIR=/data/resources \
  -e MONODI_RDF_DIR=/data/rdf \
  -e MONODI_MANAGE_PASSWORD=changeme \
  -v /host/data:/data \
  monodi-generator
```

The Containerfile uses a multi-stage build (frontend → backend → slim Node.js runtime) so no Caddy or separate static server is needed.

## API Routes

All routes require HTTP Basic Auth with the configured password.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/files` | Upload documents (multipart `files` field). PDFs → `MONODI_RESOURCE_DIR/pdf/`, others → `MONODI_RESOURCE_DIR/docs/`. |
| `POST` | `/api/deploy` | JSON body `{ ttl, state }`. Writes `data.ttl` and a timestamped `state_<datetime>.json` to `MONODI_RDF_DIR`. |
| `GET` | `/*` | Serves the compiled React frontend with SPA fallback. |

