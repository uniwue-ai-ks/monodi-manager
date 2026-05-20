import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useMatches,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { TopNavBar } from "~/components/TopNavBar";
import { DoctypeStepsBar } from "~/components/DoctypeStepsBar";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className="bg-fixed bg-gradient-to-b from-gray-200 to-gray-400 min-h-screen">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-transparent">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

const AppLayout = () => {
  const matches = useMatches();
  // Detect if we're in a doctype subroute (/:doctype/import|fields|data)
  const doctypeMatch = matches.find(
    (m) => m.params && "doctype" in m.params && m.params.doctype !== undefined
  );
  const doctypeSlug = doctypeMatch?.params?.doctype as string | undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavBar />
      {doctypeSlug && <DoctypeStepsBar doctypeSlug={doctypeSlug} />}
      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;

export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText ?? details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
