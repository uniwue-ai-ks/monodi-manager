const STATIC_ROUTE_SUFFIXES = ["/frontmatter", "/export"] as const;
const DOCTYPE_STEP_SUFFIX = /^(.*)\/[^/]+\/(import|fields|data)$/;
const ADMIN_ROOT_SUFFIX = /\/admin$/;

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === "/") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  const trimmed = withLeadingSlash.replace(/\/+$/, "");

  return trimmed || "/";
}

export function detectBasePath(pathname = window.location.pathname): string {
  const normalizedPathname =
    pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";

  if (normalizedPathname === "/") {
    return "/";
  }

  for (const suffix of STATIC_ROUTE_SUFFIXES) {
    if (normalizedPathname === suffix) {
      return "/";
    }

    if (normalizedPathname.endsWith(suffix)) {
      return normalizeBasePath(normalizedPathname.slice(0, -suffix.length));
    }
  }

  const doctypeStepMatch = normalizedPathname.match(DOCTYPE_STEP_SUFFIX);
  if (doctypeStepMatch) {
    return normalizeBasePath(doctypeStepMatch[1]);
  }

  if (ADMIN_ROOT_SUFFIX.test(normalizedPathname)) {
    return normalizeBasePath(normalizedPathname);
  }

  return normalizedPathname.indexOf("/", 1) === -1
    ? normalizeBasePath(normalizedPathname)
    : "/";
}

export function withBasePath(pathname: string): string {
  const basePath = detectBasePath();
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  return basePath === "/"
    ? normalizedPathname
    : `${basePath}${normalizedPathname}`.replace(/\/\/+/g, "/");
}
