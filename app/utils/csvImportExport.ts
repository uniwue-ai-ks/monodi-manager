import type { DoctypeField } from "~/state";
import type { DocumentEntry } from "~/utils/flowStorage";

export type ImportErrors = Record<string, Record<string, string>>;
export type ImportWarnings = Record<string, string>;

export type ImportResult = {
  updated: DocumentEntry[];
  errors: ImportErrors;
  warnings: ImportWarnings;
};

// ─── CSV serialization helpers ───────────────────────────────────────────────

function csvCell(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(',');
}

/**
 * Parse a single CSV line respecting quoted fields.
 * Returns an array of unescaped field values.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) {
      fields.push('');
      break;
    }
    if (line[i] === '"') {
      // Quoted field
      let value = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            value += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          value += line[i];
          i++;
        }
      }
      fields.push(value);
      if (line[i] === ',') i++;
    } else {
      // Unquoted field
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      } else {
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
  }
  return fields;
}

/**
 * Split CSV text into rows, handling quoted newlines.
 */
export function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (current.trim() !== '') rows.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') rows.push(current);
  return rows;
}

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Export documents of a single doctype to CSV.
 * @param documents - only documents belonging to this doctype should be passed
 * @param fields - the fields for this doctype (excluding :pdf fields)
 */
export function exportToCsv(documents: DocumentEntry[], fields: DoctypeField[]): string {
  const fieldNames = fields.map((f) => f.name);
  const header = csvRow(['filename', ...fieldNames]);
  const rows = documents.map((doc) =>
    csvRow([doc.filename, ...fieldNames.map((name) => doc.values[name] ?? '')])
  );
  return [header, ...rows].join('\r\n') + '\r\n';
}

// ─── Import ──────────────────────────────────────────────────────────────────

/**
 * Import CSV for a specific doctype. Matches rows to existing documents by filename.
 * Unknown filenames are added as new DocumentEntry rows and flagged as warnings.
 *
 * @param text       - raw CSV text
 * @param existingDocs - all current documents (all doctypes)
 * @param fields     - fields for the target doctype (excluding :pdf fields)
 * @param doctype    - the doctype these documents belong to
 * @returns updated full document list, per-cell parse errors, per-row warnings
 */
export function importFromCsv(
  text: string,
  existingDocs: DocumentEntry[],
  fields: DoctypeField[],
  doctype: string
): ImportResult {
  const errors: ImportErrors = {};
  const warnings: ImportWarnings = {};

  const rows = splitCsvRows(text);
  if (rows.length < 2) {
    // Empty or header-only — nothing to import
    return { updated: existingDocs, errors, warnings };
  }

  const headerCells = parseCsvLine(rows[0]);
  if (headerCells[0].toLowerCase() !== 'filename') {
    throw new Error('CSV hat keine gültige Kopfzeile (erste Spalte muss "filename" sein)');
  }

  // Build a map of fieldName → column index from CSV headers
  const fieldByName = new Map(fields.map((f) => [f.name, f]));
  const colToField: Array<DoctypeField | null> = headerCells.slice(1).map((col) => fieldByName.get(col) ?? null);

  // Work on a copy; keep docs from other doctypes unchanged
  const docsByFilename = new Map(existingDocs.map((d) => [d.filename, { ...d, values: { ...d.values } }]));

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const cells = parseCsvLine(rows[rowIdx]);
    const filename = cells[0]?.trim();
    if (!filename) continue;

    let doc = docsByFilename.get(filename);
    const isNew = !doc;

    if (isNew) {
      doc = { filename, doctype, values: {} };
      warnings[filename] =
        "Diese Datei ist noch nicht in der Upload-Liste enthalten. Ihr Dateiname wird trotzdem fuer den RDF-Export verwendet.";
    }

    const rowErrors: Record<string, string> = {};

    for (let colIdx = 0; colIdx < colToField.length; colIdx++) {
      const field = colToField[colIdx];
      if (!field) continue; // unknown column in CSV → skip

      const raw = cells[colIdx + 1] ?? '';

      if (field.type === ':boolean') {
        const lower = raw.trim().toLowerCase();
        if (lower === 'true' || lower === 'wahr' || lower === 'ja') {
          doc!.values[field.name] = 'true';
        } else if (lower === 'false' || lower === 'falsch' || lower === 'nein') {
          doc!.values[field.name] = 'false';
        } else if (lower === '') {
          doc!.values[field.name] = '';
        } else {
          doc!.values[field.name] = ''; // indeterminate
          rowErrors[field.name] = `Ungültiger Ja/Nein-Wert: "${raw}" (erwartet: true/WAHR/ja, false/FALSCH/nein oder leer)`;
        }
      } else if (field.type === ':number') {
        if (raw.trim() === '') {
          doc!.values[field.name] = '';
        } else if (!isNaN(Number(raw.trim()))) {
          doc!.values[field.name] = raw.trim();
        } else {
          doc!.values[field.name] = ''; // empty on parse failure
          rowErrors[field.name] = `Ungültiger Zahlenwert: "${raw}"`;
        }
      } else {
        doc!.values[field.name] = raw;
      }
    }

    if (Object.keys(rowErrors).length > 0) {
      errors[filename] = rowErrors;
    }

    docsByFilename.set(filename, doc!);
  }

  // Rebuild document list: preserve order of existing docs, append new ones at end
  const updated: DocumentEntry[] = [];
  for (const doc of existingDocs) {
    updated.push(docsByFilename.get(doc.filename)!);
  }
  for (const [filename, doc] of docsByFilename) {
    if (!existingDocs.some((d) => d.filename === filename)) {
      updated.push(doc);
    }
  }

  return { updated, errors, warnings };
}
