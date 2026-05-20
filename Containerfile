FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

# Build the React frontend
FROM base AS frontend-build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

# Build the backend
FROM base AS backend-build
WORKDIR /app/backend
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

# Runtime: Node.js serves both the backend API and the frontend static files
FROM node:20-slim AS runtime

WORKDIR /app

# Copy compiled frontend assets
COPY --from=frontend-build /app/build/client /app/build/client

# Copy compiled backend and its installed node_modules
COPY --from=backend-build /app/backend/dist /app/backend/dist
COPY --from=backend-build /app/backend/node_modules /app/backend/node_modules

WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
