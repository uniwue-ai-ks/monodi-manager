import express, { type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Validate required environment variables – exit with error if any is missing
// ---------------------------------------------------------------------------
const REQUIRED_ENV: Record<string, string | undefined> = {
  MONODI_RESOURCE_DIR: process.env.MONODI_RESOURCE_DIR,
  MONODI_RDF_DIR: process.env.MONODI_RDF_DIR,
  MONODI_MANAGE_PASSWORD: process.env.MONODI_MANAGE_PASSWORD,
};

const missing = Object.entries(REQUIRED_ENV)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  for (const key of missing) {
    console.error(`Error: Required environment variable ${key} is not set.`);
  }
  process.exit(1);
}

const RESOURCE_DIR = process.env.MONODI_RESOURCE_DIR!;
const RDF_DIR = process.env.MONODI_RDF_DIR!;
const PASSWORD = process.env.MONODI_MANAGE_PASSWORD!;

// Ensure storage directories exist on startup
const PDF_DIR = path.join(RESOURCE_DIR, "pdf");
const DOCS_DIR = path.join(RESOURCE_DIR, "docs");
fs.mkdirSync(PDF_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.mkdirSync(RDF_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: "50mb" }));

// ---------------------------------------------------------------------------
// Authentication – HTTP Basic Auth on every route
// ---------------------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Basic ")) {
    const encoded = authHeader.slice("Basic ".length);
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    // username is ignored; only the password part (after the first colon) matters
    const colonIndex = decoded.indexOf(":");
    const password = colonIndex >= 0 ? decoded.slice(colonIndex + 1) : decoded;

    if (password === PASSWORD) {
      return next();
    }
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Monodi Management"');
  res.status(401).send("Authentication required");
});

// ---------------------------------------------------------------------------
// File upload – POST /api/files
// PDFs go to RESOURCE_DIR/pdf, everything else to RESOURCE_DIR/docs
// ---------------------------------------------------------------------------
const fileStorage = multer.diskStorage({
  destination(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const subdir = ext === ".pdf" ? PDF_DIR : DOCS_DIR;
    cb(null, subdir);
  },
  filename(_req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: fileStorage });

app.post(
  "/api/files",
  upload.array("files"),
  (req: Request, res: Response) => {
    const uploaded = (req.files as Express.Multer.File[]).map(
      (f) => f.originalname,
    );
    res.json({ uploaded });
  },
);

// ---------------------------------------------------------------------------
// Deploy – POST /api/deploy
// Body: { ttl: string, state: unknown }
// Saves data.ttl and a timestamped state JSON into MONODI_RDF_DIR
// ---------------------------------------------------------------------------
app.post("/api/deploy", (req: Request, res: Response) => {
  const { ttl, state } = req.body as { ttl?: string; state?: unknown };

  if (typeof ttl !== "string" || !state) {
    res.status(400).json({ error: "Missing ttl or state in request body" });
    return;
  }

  try {
    fs.writeFileSync(path.join(RDF_DIR, "data.ttl"), ttl, "utf-8");

    // Use a filesystem-safe datetime string as the filename
    const datetime = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\./g, "-");
    fs.writeFileSync(
      path.join(RDF_DIR, `state_${datetime}.json`),
      JSON.stringify(state, null, 2),
      "utf-8",
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Deploy error:", err);
    res.status(500).json({ error: "Failed to write files" });
  }
});

// ---------------------------------------------------------------------------
// Serve the compiled React frontend (build/client)
// The backend lives at  <repo>/backend/dist/index.js
// The frontend build is at  <repo>/build/client
// ---------------------------------------------------------------------------
const CLIENT_DIR = path.resolve(__dirname, "../../build/client");
app.use(express.static(CLIENT_DIR));

// SPA fallback – any non-API, non-static path returns index.html
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT ?? "3000", 10);
app.listen(PORT, () => {
  console.log(`Monodi backend running on port ${PORT}`);
  console.log(`  Resource dir : ${RESOURCE_DIR}`);
  console.log(`  RDF dir      : ${RDF_DIR}`);
  console.log(`  Frontend     : ${CLIENT_DIR}`);
});
