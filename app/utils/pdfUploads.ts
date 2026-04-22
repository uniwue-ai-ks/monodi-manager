export type PdfNamesByDoctype = Record<string, string[]>;

export type PendingPdfUpload = {
  doctype: string;
  file: File;
  name: string;
};

export type PdfUploadProcessor<T> = (upload: PendingPdfUpload) => Promise<T> | T;

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function createPdfNamesByDoctype(doctypeNames: string[]): PdfNamesByDoctype {
  return Object.fromEntries(doctypeNames.map((doctype) => [doctype, []]));
}

export function mergePdfNames(existingNames: string[], additions: string[]): string[] {
  const knownNames = new Set(existingNames);
  const merged = [...existingNames];

  for (const name of additions) {
    if (!knownNames.has(name)) {
      knownNames.add(name);
      merged.push(name);
    }
  }

  return merged;
}

export async function processPdfUploadsSequentially<T>(
  doctype: string,
  files: FileList | null,
  processor: PdfUploadProcessor<T>,
): Promise<T[]> {
  if (!files) {
    return [];
  }

  const results: T[] = [];

  for (const file of Array.from(files)) {
    if (!isPdfFile(file)) {
      continue;
    }

    results.push(
      await processor({
        doctype,
        file,
        name: file.name,
      }),
    );
  }

  return results;
}

export function collectPdfNames(doctype: string, files: FileList | null) {
  return processPdfUploadsSequentially(doctype, files, ({ name }) => name);
}
