import useLocalStorageState from "use-local-storage-state";
import type { DocumentType, DoctypeField, Doctypes } from "~/state";

const KEY = 'createDocFlow_v1';

export const useAppState = () => {
  const [state, store, { removeItem }] = useLocalStorageState<AppState>(KEY, {
    defaultValue: { version: 1, createdAt: new Date().toISOString(), doctypes: {"Dokument": []} }
  })
  const methods = {
    contents: state,
    setContents: store,
    patchContents: (patch: Partial<AppState>) => store({ ...state, ...patch }),
    clearContents: removeItem,
  }
  return methods
}

export type DocumentEntry = {
  filename: string;
  doctype: string;
  values: Record<string, string>;
  /** Extracted HTML body content (HTML/image documents); undefined for PDF. */
  mainDocumentContent?: string;
};

export type AppState = {
  version?: number;
  createdAt?: string;
  doctypes?: Doctypes;
  documents?: DocumentEntry[];
  workflow?: "csv";
  /** Main document type per doctype name. */
  mainDocumentTypes?: Record<string, DocumentType>;
};
