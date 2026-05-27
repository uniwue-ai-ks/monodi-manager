// Build-time flag injected by Vite define (see vite.config.ts).
// Set MONODI_STANDALONE=true at build time to produce a standalone SPA bundle
// that does not communicate with the backend.
import { withBasePath } from "~/utils/basePath";

declare const __MONODI_STANDALONE__: boolean;
export const isStandalone: boolean = __MONODI_STANDALONE__;

// ---------------------------------------------------------------------------
// Deploy – POST /api/deploy
// ---------------------------------------------------------------------------

/** Send the generated TTL and full app state to the backend for persistence. */
export async function deployToBackend(ttl: string, state: unknown): Promise<void> {
  const res = await fetch(withBasePath("/api/deploy"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ttl, state }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server returned ${res.status}: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// CSV file management – GET/POST /api/csv, DELETE /api/csv/:filename
// ---------------------------------------------------------------------------

/** Fetch the list of CSV filenames stored on the server. */
export async function getCsvFiles(): Promise<string[]> {
  const res = await fetch(withBasePath("/api/csv"));
  if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`);
  const data = (await res.json()) as { files: string[] };
  return data.files;
}

/** Upload CSV files to the backend, reporting progress. */
export function uploadCsvToBackend(
  files: File[],
  onProgress: (loaded: number, total: number) => void,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", withBasePath("/api/csv"));
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText) as { uploaded: string[] };
        resolve(data.uploaded);
      } else {
        reject(new Error(`CSV-Upload fehlgeschlagen: ${xhr.status} ${xhr.statusText}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Netzwerkfehler beim CSV-Upload")));
    xhr.addEventListener("abort", () => reject(new Error("CSV-Upload abgebrochen")));
    xhr.send(formData);
  });
}

/** Delete a CSV file from the server. */
export async function deleteCsvFile(filename: string): Promise<void> {
  const res = await fetch(withBasePath(`/api/csv/${encodeURIComponent(filename)}`), { method: "DELETE" });
  if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`);
}

/** Delete a binary document file (PDF or image) from the server. */
export async function deleteServerFile(filename: string): Promise<void> {
  const res = await fetch(withBasePath(`/api/files/${encodeURIComponent(filename)}`), { method: "DELETE" });
  if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`);
}

// ---------------------------------------------------------------------------
// File listing – GET /api/files
// ---------------------------------------------------------------------------

/** Fetch the list of filenames currently stored on the server. */
export async function getServerFiles(): Promise<string[]> {
  const res = await fetch(withBasePath("/api/files"));
  if (!res.ok) {
    throw new Error(`Server returned ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as { files: string[] };
  return data.files;
}

// ---------------------------------------------------------------------------
// File upload – POST /api/files
// ---------------------------------------------------------------------------

/**
 * Upload a batch of files to /api/files, reporting progress via the callback.
 * Returns the list of filenames accepted by the server.
 */
export function uploadFilesToBackend(
  files: File[],
  onProgress: (loaded: number, total: number) => void,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", withBasePath("/api/files"));

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText) as { uploaded: string[] };
        resolve(data.uploaded);
      } else {
        reject(new Error(`Upload fehlgeschlagen: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Netzwerkfehler beim Upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload abgebrochen")));

    xhr.send(formData);
  });
}
