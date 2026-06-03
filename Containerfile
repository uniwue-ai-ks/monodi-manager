FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

# Build the React frontend
FROM base AS frontend-build
ARG MONODI_BASE_PATH=
ARG MONODI_BUILD_PROFILE=production
ENV MONODI_BASE_PATH=$MONODI_BASE_PATH
ENV MONODI_BUILD_PROFILE=$MONODI_BUILD_PROFILE
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

# Build the backend
FROM base AS backend-build
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @generator-monodi/backend run build
# pnpm deploy copies production deps as real files (no symlinks into the pnpm store)
RUN pnpm deploy --legacy --filter @generator-monodi/backend --prod /app/backend-deploy
RUN cp -r /app/backend/dist /app/backend-deploy/dist

# Runtime: Node.js serves both the backend API and the frontend static files
FROM node:20-slim AS runtime

WORKDIR /app

# Copy compiled frontend assets
COPY --from=frontend-build /app/build/client /app/build/client

# Copy compiled backend and its installed node_modules
COPY --from=backend-build /app/backend-deploy /app/backend

WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
