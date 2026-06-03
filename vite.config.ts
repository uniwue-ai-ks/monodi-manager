import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import flowbiteReact from "flowbite-react/plugin/vite";

const port = process.env.PORT ? Number(process.env.PORT) : undefined;
const configuredBasePath = process.env.MONODI_BASE_PATH?.trim();
const normalizedConfiguredBasePath =
  configuredBasePath && configuredBasePath !== "/"
    ? configuredBasePath.replace(/^\/+|\/+$/g, "")
    : undefined;
const basePath = configuredBasePath
  ? normalizedConfiguredBasePath
    ? `/${normalizedConfiguredBasePath}/`
    : "./"
  : "./";
const buildProfile = process.env.MONODI_BUILD_PROFILE?.trim() ?? "production";
const isDevelopmentBuild = buildProfile === "development";

export default defineConfig({
  base: basePath,
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), flowbiteReact()],
  build: {
    sourcemap: isDevelopmentBuild,
    minify: isDevelopmentBuild ? false : undefined,
    cssMinify: isDevelopmentBuild ? false : undefined,
  },
  define: {
    // Set MONODI_STANDALONE=true at build time to produce a standalone SPA
    // that skips all backend communication.
    __MONODI_STANDALONE__: JSON.stringify(process.env.MONODI_STANDALONE === "true"),
  },
  server: {
    port,
    strictPort: port !== undefined,
    proxy: {
      "/api": "http://localhost:3000",
      "/.well-known": "http://localhost:3000",
    },
  },
});