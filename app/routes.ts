import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("doctypes", "routes/doctypes.tsx"),
  route("doctypeFields/:name", "routes/doctypeFields.tsx"),
] satisfies RouteConfig;
