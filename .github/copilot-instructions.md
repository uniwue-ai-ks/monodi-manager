# Copilot instructions for generator-monodi

High-level summary
- This repository is a React Router (v7) TypeScript web application template using Vite and TailwindCSS. It contains a client app in `app/`, static assets in `public/`, and is configured to build a client bundle using the `react-router` dev/build tools. A container deployment is provided using a Containerfile that builds with pnpm and serves static files with Caddy.
- Languages & runtimes: TypeScript (TS 5.x), Node.js 20.x runtime recommended, Vite (v6), pnpm for package management, TailwindCSS for styling.

Important high-level repo facts (trust these; search only if missing)
- Root files you will commonly use: package.json, pnpm-lock.yaml, pnpm-workspace.yaml, tsconfig.json, vite.config.ts, react-router.config.ts, Containerfile, Caddyfile, README.md.
- Main app source: `app/` (entry points: `app/root.tsx`, `app/routes.ts` and `app/routes/*`).
- Public/static: `public/` contains favicon and other static assets.
- Build outputs: `build/client` (static) and `build/server/index.js` (server entry used by `npm run start`).
- Package manager: pnpm (lockfile present). Use pnpm to avoid dependency mismatches.

Build & validation (validated recommendations)
- Environment setup (always do these):
  1. Install Node.js 20.x (matches Containerfile).  
  2. Install pnpm or use the system pnpm: `pnpm install`.  
  3. Always run `pnpm install` before any build or dev command (this repository has a pnpm-lock.yaml and may break with npm).

- Development (hot-reload):
  - `pnpm run dev` — runs the Vite/react-router dev server; available at http://localhost:5173 in typical setups. Recommended to run from repository root.

- Type-checking and quick validation:
  - `pnpm run typecheck` — runs `react-router typegen && tsc`. Run this before opening a PR to catch TypeScript errors.

- Build (production):
  - `pnpm run build` — runs `react-router build`. After a successful build, the static client files are in `build/client` and server code in `build/server`.
  - Serve the built server (if needed): `pnpm run start` expects `build/server/index.js` to exist.

- Container / Docker (as in Containerfile):
  - The Containerfile uses `pnpm install --frozen-lockfile` and `pnpm run build`. To emulate CI locally: `pnpm install --frozen-lockfile && pnpm run build`.
  - Production serving in the Containerfile uses Caddy to serve `build/client` and a Caddyfile is included.

Notes on common failures and workarounds (observed by inspection)
- Use pnpm, not npm, for installs (pnpm-lock.yaml present). If you see dependency resolution or lockfile errors, run `pnpm install --frozen-lockfile` to reproduce the CI behavior.
- If builds fail due to missing `react-router` dev plugin or Vite plugins, ensure devDependencies are installed (run pnpm install). The repo's package.json lists `@react-router/dev`, `vite`, `typescript`, and Tailwind plugins — these are required for build and dev.
- There are no test or lint scripts configured in package.json; rely on `typecheck` and `pnpm run build` as primary validation steps.

Project layout & where to edit
- Root: package.json (scripts: `dev`, `build`, `start`, `typecheck`), pnpm-lock.yaml, pnpm-workspace.yaml.
- app/: main application code. Look here for UI, routes, and components. `app/root.tsx` is the top-level React entry; route modules live under `app/routes`.
- public/: static assets; index.html for client entry (Vite/React Router will use it).
- Configuration: tsconfig.json (path alias `~/*` -> `./app/*`), vite.config.ts (Vite + tailwind + react-router plugin), react-router.config.ts (SSR flag), Caddyfile and Containerfile for deployment.

Checks & CI
- No GitHub Actions workflows were found in the repository root (no `.github/workflows` present). The Containerfile describes production build steps and the repository uses pnpm lockfile to guarantee reproducible installs — mimic the Containerfile sequence locally: `pnpm install --frozen-lockfile && pnpm run build`.

Quick priority checklist for making a change and opening a PR
1. Pull latest main and branch from it.  
2. Install deps: `pnpm install` (or `pnpm install --frozen-lockfile` in CI-like runs).  
3. Run `pnpm run typecheck` and fix TypeScript errors.  
4. Run `pnpm run build` and ensure successful build output in `build/`.  
5. Sanity check the dev server if needed: `pnpm run dev`.  
6. Add tests only when repository adds a test framework; otherwise rely on typecheck+build.  
7. Keep PRs small and run the above locally; document failures with full logs.

Searching guidance for the agent
- Trust these instructions first. Only search when missing information (for example, new scripts added or unexpected files).  
- Useful search targets: `package.json` scripts, `app/root.tsx`, `app/routes`, `tsconfig.json` (for aliases), `vite.config.ts`, `Containerfile`, and `Caddyfile`.

Notes for safety and speed
- Do not run heavy installs unless necessary; if node_modules exists in workspace, prefer `pnpm install --frozen-lockfile --offline` to save time.  
- Prefer editing TypeScript files under `app/` and update route modules in `app/routes` — the tsconfig alias `~/*` maps to `./app/*`.
- Use context7 mcp for accessing API documentation for the used library versions

If anything here is out of date
- Re-run `pnpm install` and `pnpm run typecheck` to validate current state, then update this instruction file.  

When commiting to git, use conventional commits prefixes like "feat:", "fix:" etc. Do not add a Co-Authored-By line.
