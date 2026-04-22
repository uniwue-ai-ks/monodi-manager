import useLocalStorageState from "use-local-storage-state";
import type { DoctypeField, Doctypes } from "~/state";

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
};

export type AppState = {
  version?: number;
  createdAt?: string;
  doctypes?: Doctypes;
  documents?: DocumentEntry[];
  workflow?: "csv";
};
