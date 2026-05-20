export const typeOptions = {
  ":string": "Text",
  ":htmlContent": "Formatierter Text (HTML)",
  ":number": "Zahl",
  ":boolean": "Ja/Nein",
  ":category": "Kategorisch",
} as const;

export type FieldType = keyof typeof typeOptions;

export type DocumentType = "pdf" | "html" | "image";

export const documentTypeOptions: Record<DocumentType, string> = {
  pdf: "PDF",
  html: "HTML",
  image: "Bild",
};

export type DocumentPosition = ":main" | ":header" | ":right" | ":download" | ":sticky";

export type ShortenPosition = ":results";

export type DoctypeField = {
  name: string;
  /** Optional display name used as rdfs:label; falls back to `name` if absent. */
  displayName?: string;
  type: FieldType;
  useSeparator?: boolean;
  searchable?: boolean;
  showInResults?: boolean;
  documentPositions?: DocumentPosition[];
  /** Positions where the field value should be shortened. */
  shortenIn?: ShortenPosition[];
}

export type DocumentEntry = {
  filename: string;
  doctype: string;
  values: Record<string, string>;
  /** Extracted HTML body content (HTML/image documents); undefined for PDF. */
  mainDocumentContent?: string;
};

export type DoctypeEntry = {
  name: string;
  fields: DoctypeField[];
  documents: DocumentEntry[];
  mainDocumentType?: DocumentType;
};

export type Doctypes = DoctypeEntry[];
