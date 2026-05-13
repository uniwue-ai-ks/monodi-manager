import type { DoctypeField, FieldType } from "~/state";
import type { DocumentEntry } from "~/utils/flowStorage";
import { parseCsvLine, splitCsvRows } from "~/utils/csvImportExport";

const FILENAME_HEADERS = new Set(["filename", "dateiname", "index", "key"]);
const BOOLEAN_VALUES = new Set(["true", "false", "wahr", "falsch", "ja", "nein"]);

function inferFieldType(values: string[]): FieldType {
  const nonEmpty = values.map((v) => v.trim()).filter((v) => v !== "");
  if (nonEmpty.length === 0) return ":string";

  if (nonEmpty.every((v) => BOOLEAN_VALUES.has(v.toLowerCase()))) {
    return ":boolean";
  }

  // Only infer :number for integers (xsd:integer in export)
  if (nonEmpty.every((v) => /^-?\d+$/.test(v))) {
    return ":number";
  }

  const total = nonEmpty.length;
  const distinct = new Set(nonEmpty.map((v) => v.toLowerCase())).size;
  if (distinct <= 20 && distinct / total < 0.5) {
    return ":category";
  }

  return ":string";
}

export type CsvSchemaError =
  | { type: "no_filename_column" }
  | { type: "duplicate_headers"; headers: string[] }
  | { type: "duplicate_filenames"; filenames: string[] }
  | { type: "empty_csv" };

export type CsvSchemaResult = {
  fields: DoctypeField[];
  documents: DocumentEntry[];
  filenameColumnName: string;
  ignoredDuplicateFilenames?: string[];
};

export type CsvSchemaInferResult =
  | { ok: true; result: CsvSchemaResult }
  | { ok: false; error: CsvSchemaError };

export function inferSchemaFromCsv(
  rawCsv: string,
  doctypeName: string,
  options?: { ignoreDuplicateFilenames?: boolean }
): CsvSchemaInferResult {
  // Strip UTF-8 BOM if present
  const csvText = rawCsv.startsWith("\uFEFF") ? rawCsv.slice(1) : rawCsv;

  const rows = splitCsvRows(csvText);
  if (rows.length === 0) {
    return { ok: false, error: { type: "empty_csv" } };
  }

  const headerCells = parseCsvLine(rows[0]).map((h) => h.trim());

  // Validate no duplicate or empty column headers
  const headerCounts = new Map<string, number>();
  for (const h of headerCells) {
    if (h !== "") {
      headerCounts.set(h, (headerCounts.get(h) ?? 0) + 1);
    }
  }
  const dupHeaders = [...headerCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([h]) => h);
  if (dupHeaders.length > 0) {
    return { ok: false, error: { type: "duplicate_headers", headers: dupHeaders } };
  }

  // Find filename column
  const filenameColIdx = headerCells.findIndex((h) => FILENAME_HEADERS.has(h.toLowerCase()));
  if (filenameColIdx < 0) {
    return { ok: false, error: { type: "no_filename_column" } };
  }
  const filenameColumnName = headerCells[filenameColIdx];

  const dataRows = rows.slice(1).map((row) => parseCsvLine(row));

  // Validate no duplicate filenames
  const filenames = dataRows
    .map((row) => (row[filenameColIdx] ?? "").trim())
    .filter((f) => f !== "");
  const filenameCounts = new Map<string, number>();
  for (const f of filenames) {
    filenameCounts.set(f, (filenameCounts.get(f) ?? 0) + 1);
  }
  const dupFilenames = [...filenameCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([f]) => f);
  if (dupFilenames.length > 0 && !options?.ignoreDuplicateFilenames) {
    return { ok: false, error: { type: "duplicate_filenames", filenames: dupFilenames } };
  }

  // When ignoring duplicates, keep only the first occurrence of each filename
  const dupFilenameSet = new Set(dupFilenames);
  const seenFilenames = new Set<string>();
  const effectiveDataRows = dupFilenames.length > 0
    ? dataRows.filter((row) => {
        const f = (row[filenameColIdx] ?? "").trim();
        if (!f || !dupFilenameSet.has(f)) return true;
        if (seenFilenames.has(f)) return false;
        seenFilenames.add(f);
        return true;
      })
    : dataRows;

  // Build fields for non-filename columns
  const fields: DoctypeField[] = [];
  const fieldColIndices: number[] = [];
  for (let i = 0; i < headerCells.length; i++) {
    if (i === filenameColIdx) continue;
    const name = headerCells[i];
    if (!name) continue;
    const colValues = effectiveDataRows.map((row) => row[i] ?? "");
    fields.push({ name, type: inferFieldType(colValues) });
    fieldColIndices.push(i);
  }

  // Build DocumentEntry list
  const documents: DocumentEntry[] = effectiveDataRows
    .map((row) => {
      const filename = (row[filenameColIdx] ?? "").trim();
      if (!filename) return null;
      const values: Record<string, string> = {};
      for (let fi = 0; fi < fields.length; fi++) {
        const colIdx = fieldColIndices[fi];
        const raw = (row[colIdx] ?? "").trim();
        if (fields[fi].type === ":boolean") {
          const lower = raw.toLowerCase();
          if (lower === "true" || lower === "wahr" || lower === "ja") {
            values[fields[fi].name] = "true";
          } else if (lower === "false" || lower === "falsch" || lower === "nein") {
            values[fields[fi].name] = "false";
          } else {
            values[fields[fi].name] = "";
          }
        } else {
          values[fields[fi].name] = raw;
        }
      }
      return { filename, doctype: doctypeName, values };
    })
    .filter((d): d is DocumentEntry => d !== null);

  return {
    ok: true,
    result: {
      fields,
      documents,
      filenameColumnName,
      ...(dupFilenames.length > 0 ? { ignoredDuplicateFilenames: dupFilenames } : {}),
    },
  };
}

export function csvSchemaErrorMessage(error: CsvSchemaError): string {
  switch (error.type) {
    case "empty_csv":
      return "Die CSV-Datei ist leer.";
    case "no_filename_column":
      return 'Die CSV-Datei hat keine Dateiname-Spalte. Eine Spalte muss den Header "filename", "dateiname", "index" oder "key" haben (Groß-/Kleinschreibung egal).';
    case "duplicate_headers":
      return `Die CSV-Datei enthält doppelte Spaltenköpfe: ${error.headers.map((h) => `"${h}"`).join(", ")}.`;
    case "duplicate_filenames":
      return `Die CSV-Datei enthält doppelte Dateinamen: ${error.filenames.slice(0, 5).map((f) => `"${f}"`).join(", ")}${error.filenames.length > 5 ? ` (und ${error.filenames.length - 5} weitere)` : ""}.`;
  }
}
