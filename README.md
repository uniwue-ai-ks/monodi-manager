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
| `MONODI_STATE_DIR` | – | Directory where CSV files and JSON state snapshots are stored. Defaults to `MONODI_RDF_DIR`. |
| `MONODI_MANAGE_PASSWORD` | ✅ | Password for HTTP Basic Auth (required on every API request). The username is ignored. |
| `MONODI_FUSEKI_URL` | – | If set, every deploy also pushes the generated Turtle to this Fuseki dataset URL (for example `http://fuseki:3030`). |
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

# Build a debug-friendly image (unminified frontend bundle with sourcemaps)
docker build \
  --build-arg MONODI_BUILD_PROFILE=development \
  -t monodi-generator .

docker run -p 3000:3000 \
  -e MONODI_RESOURCE_DIR=/data/resources \
  -e MONODI_RDF_DIR=/data/rdf \
  -e MONODI_MANAGE_PASSWORD=changeme \
  -v /host/data:/data \
  monodi-generator
```

The Containerfile uses a multi-stage build (frontend → backend → slim Node.js runtime) so no Caddy or separate static server is needed.

`MONODI_BASE_PATH` is still available as an optional build-time override for standalone manager deployments, but the normal compose/reverse-proxy setup no longer requires baking a fixed base path into the image.

For a debug-friendly frontend bundle in the container image, set:

```bash
docker build \
  --build-arg MONODI_BUILD_PROFILE=development \
  -t monodi-generator .
```

## Reverse Proxy / Base Path Deployment

The provided `compose.yml` and `Caddyfile` support hosting the viewer and manager below a runtime `BASE_PATH`, for example:

- viewer at `/monodi/`
- manager at `/monodi/admin/`

Set the same `BASE_PATH` environment variable on both the `frontend` and `manager` services. No rebuild is required when this changes.

The frontend proxy is responsible for:

- serving the viewer below `"$BASE_PATH/"`
- forwarding `"$BASE_PATH/admin/*"` to the manager
- forwarding `"$BASE_PATH/admin/api/*"` and `"$BASE_PATH/admin/.well-known/*"` to the manager API
- preserving the external prefix for the manager via `X-Forwarded-Prefix`

If you use a different reverse proxy, mirror that behavior so the manager can reconstruct its runtime base path correctly.

## API Routes

All routes require HTTP Basic Auth with the configured password.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/files` | Upload documents (multipart `files` field). PDFs → `MONODI_RESOURCE_DIR/pdf/`, others → `MONODI_RESOURCE_DIR/docs/`. |
| `POST` | `/api/deploy` | JSON body `{ ttl, state }`. Writes `data.ttl` and a timestamped `state_<datetime>.json` to `MONODI_RDF_DIR`. |
| `GET` | `/*` | Serves the compiled React frontend with SPA fallback. |
