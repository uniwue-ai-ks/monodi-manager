export const typeOptions = {
  ":string": "Text",
  ":htmlContent": "Formatierter Text (HTML)",
  ":number": "Zahl",
  ":pdf": "PDF-Datei",
  ":category": "Kategorisch",
} as const;

export type FieldType = keyof typeof typeOptions;

export type DoctypeField = {
  name: string;
  type: FieldType;
  useSeparator?: boolean;
  searchable?: boolean;
  showInResults?: boolean;
}

export type Doctypes = {[name: string]: DoctypeField[]};
