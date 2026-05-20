import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route(":doctype/import", "routes/$doctype.import.tsx"),
  route(":doctype/fields", "routes/$doctype.fields.tsx"),
  route(":doctype/data", "routes/$doctype.data.tsx"),
  route("frontmatter", "routes/viewerConfig.tsx"),
  route("export", "routes/export.tsx"),
] satisfies RouteConfig;
