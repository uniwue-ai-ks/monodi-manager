import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { detectBasePath } from "~/utils/basePath";

declare global {
  interface Window {
    __reactRouterContext?: {
      basename?: string;
    };
  }
}

const basePath = detectBasePath();

if (window.__reactRouterContext) {
  window.__reactRouterContext.basename = basePath;
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
