export const typeOptions = {
  ":string": "Text",
  ":htmlContent": "Formatierter Text (HTML)",
  ":number": "Zahl",
  ":boolean": "Ja/Nein",
  ":pdf": "PDF-Datei",
  ":category": "Kategorisch",
} as const;

export type FieldType = keyof typeof typeOptions;

export type DocumentPosition = ":main" | ":header" | ":right" | ":download" | ":sticky";

export type DoctypeField = {
  name: string;
  /** Optional display name used as rdfs:label; falls back to `name` if absent. */
  displayName?: string;
  type: FieldType;
  useSeparator?: boolean;
  searchable?: boolean;
  showInResults?: boolean;
  documentPositions?: DocumentPosition[];
}

export type Doctypes = {[name: string]: DoctypeField[] };
