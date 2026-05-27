import type { DocumentType } from "~/state";
import type { DocumentEntry } from "~/utils/flowStorage";

export type UploadedDocFile = {
  filename: string;
  /** Extracted HTML body (HTML docs) or undefined (PDF/image). */
  content?: string;
};

const PDF_MIME = "application/pdf";
const HTML_MIME = "text/html";
const IMAGE_MIME_PREFIX = "image/";

function fileDocumentType(file: File): DocumentType | null {
  const name = file.name.toLowerCase();
  if (file.type === PDF_MIME || name.endsWith(".pdf")) return "pdf";
  if (file.type === HTML_MIME || name.endsWith(".html") || name.endsWith(".htm")) return "html";
  if (file.type.startsWith(IMAGE_MIME_PREFIX) || /\.(png|jpe?g|gif|webp|svg|avif)$/.test(name))
    return "image";
  return null;
}

/**
 * Detect the uniform document type from a list of files.
 * Returns the detected type if all files agree (images of different formats are
 * still considered the same type), or null if the list is empty or types are mixed
 * across pdf/html/image boundaries.
 */
export function detectDocumentType(files: File[]): DocumentType | null {
  if (files.length === 0) return null;
  const types = files.map(fileDocumentType);
  if (types.some((t) => t === null)) return null;
  const unique = new Set(types);
  if (unique.size > 1) return null;
  return types[0]!;
}

/** Extract the inner HTML of the <body> tag from an HTML string, or the full string if no body. */
export function extractHtmlBody(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  return body ? body.innerHTML.trim() : html.trim();
}

/** Read a single File as text. */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });
}

/**
 * Read a FileList and return UploadedDocFile entries.
 * For HTML files the body content is extracted and stored in `content`.
 * For images the img tag string is stored in `content`.
 * For PDFs, `content` is undefined.
 */
export async function readDocumentFiles(files: FileList | File[] | null): Promise<UploadedDocFile[]> {
  if (!files) return [];
  const result: UploadedDocFile[] = [];
  for (const file of Array.from(files)) {
    const type = fileDocumentType(file);
    if (!type) continue;
    if (type === "html") {
      const raw = await readFileAsText(file);
      result.push({ filename: file.name, content: extractHtmlBody(raw) });
    } else if (type === "image") {
      const imgTag = `<img src="resources/docs/${file.name}" style="width:100%;aspect-ratio:auto" />`;
      result.push({ filename: file.name, content: imgTag });
    } else {
      result.push({ filename: file.name });
    }
  }
  return result;
}

/** Merge new UploadedDocFile entries into an existing list, deduplicating by filename. */
export function mergeDocFiles(
  existing: UploadedDocFile[],
  additions: UploadedDocFile[],
): UploadedDocFile[] {
  const known = new Set(existing.map((f) => f.filename));
  const merged = [...existing];
  for (const f of additions) {
    if (!known.has(f.filename)) {
      known.add(f.filename);
      merged.push(f);
    }
  }
  return merged;
}

/** Convert UploadedDocFile entries to DocumentEntry objects for a given doctype. */
export function docFilesToEntries(
  files: UploadedDocFile[],
  doctype: string,
  existingEntries: DocumentEntry[],
): DocumentEntry[] {
  return files.map(({ filename, content }) => {
    const existing = existingEntries.find((d) => d.filename === filename);
    return existing
      ? { ...existing, mainDocumentContent: content }
      : { filename, doctype, values: {}, mainDocumentContent: content };
  });
}
