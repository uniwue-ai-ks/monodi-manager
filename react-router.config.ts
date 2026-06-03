import type { Config } from "@react-router/dev/config";

const configuredBasePath = process.env.MONODI_BASE_PATH?.trim();
const basename = configuredBasePath
  ? configuredBasePath === "/"
    ? "/"
    : `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`
  : "/";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: false,
  basename,
} satisfies Config;
