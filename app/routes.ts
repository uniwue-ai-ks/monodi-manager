import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("doctypes", "routes/doctypes.tsx"),
  route("doctypeFields/:name", "routes/doctypeFields.tsx"),
  route("upload", "routes/upload.tsx"),
  route("csvUpload", "routes/csvUpload.tsx"),
  route("enterData", "routes/enterData.tsx"),
  route("step5", "routes/export.tsx"),
] satisfies RouteConfig;
