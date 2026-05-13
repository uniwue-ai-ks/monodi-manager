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

export type Doctypes = {[name: string]: DoctypeField[] };
