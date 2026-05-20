import useLocalStorageState from "use-local-storage-state";
import type { DoctypeEntry, DoctypeField, DocumentEntry, Doctypes } from "~/state";
import type { DocumentType } from "~/state";

export type FrontmatterData = {
  tabTitle: string;
  headerTitle: string;
  copyright: string;
  footer: string;
  mainPagePreSearches: string;
  mainPagePostSearches: string;
  customJavascript: string;
  customCss: string;
};

export const defaultFrontmatter: FrontmatterData = {
  tabTitle: "",
  headerTitle: "",
  copyright: "",
  footer: "",
  mainPagePreSearches: "",
  mainPagePostSearches: "",
  customJavascript: "",
  customCss: "",
};

const V1_KEY = 'createDocFlow_v1';
const KEY = 'createDocFlow_v2';

const DEFAULT_DOCTYPE: DoctypeEntry = { name: "Dokumente", fields: [], documents: [] };

// ─── V1 → V2 migration ────────────────────────────────────────────────────────

type V1AppState = {
  version?: number;
  createdAt?: string;
  doctypes?: Record<string, DoctypeField[]>;
  documents?: DocumentEntry[];
  mainDocumentTypes?: Record<string, DocumentType>;
  frontmatter?: FrontmatterData;
};

/**
 * One-time migration from v1 localStorage format to v2.
 * Runs synchronously at module load; safe to call multiple times (no-ops if v2 already exists).
 */
function migrateV1ToV2(): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(KEY) !== null) return; // v2 already present
  const v1Raw = localStorage.getItem(V1_KEY);
  if (!v1Raw) return; // nothing to migrate

  try {
    const v1 = JSON.parse(v1Raw) as V1AppState;
    const oldDoctypes: Record<string, DoctypeField[]> = v1.doctypes ?? {};
    const oldDocuments: DocumentEntry[] = v1.documents ?? [];
    const oldMainDocTypes: Record<string, DocumentType> = v1.mainDocumentTypes ?? {};

    let newDoctypes: DoctypeEntry[] = Object.entries(oldDoctypes).map(([name, fields]) => ({
      name,
      fields,
      documents: oldDocuments.filter((d) => d.doctype === name),
      ...(oldMainDocTypes[name] ? { mainDocumentType: oldMainDocTypes[name] } : {}),
    }));

    // Handle orphan documents whose doctype isn't in oldDoctypes (shouldn't normally happen)
    const knownDoctypeNames = new Set(Object.keys(oldDoctypes));
    const orphans = oldDocuments.filter((d) => !knownDoctypeNames.has(d.doctype));
    if (orphans.length > 0) {
      const byDoctype = new Map<string, DocumentEntry[]>();
      for (const doc of orphans) {
        const arr = byDoctype.get(doc.doctype) ?? [];
        arr.push(doc);
        byDoctype.set(doc.doctype, arr);
      }
      for (const [name, docs] of byDoctype) {
        newDoctypes.push({ name, fields: [], documents: docs });
      }
    }

    const v2State: AppState = {
      version: 2,
      createdAt: v1.createdAt ?? new Date().toISOString(),
      doctypes: newDoctypes.length > 0 ? newDoctypes : [DEFAULT_DOCTYPE],
      frontmatter: v1.frontmatter,
    };

    localStorage.setItem(KEY, JSON.stringify(v2State));
  } catch {
    // Migration failed; app will start with defaults — old v1 data is preserved
  }
}

migrateV1ToV2();

// ─── State hook ───────────────────────────────────────────────────────────────

export const useAppState = () => {
  const [state, store, { removeItem }] = useLocalStorageState<AppState>(KEY, {
    defaultValue: { version: 2, createdAt: new Date().toISOString(), doctypes: [DEFAULT_DOCTYPE] }
  })

  // Normalize: guard against any non-array doctypes value (e.g. from failed migration)
  const normalizedState: AppState = {
    ...state,
    doctypes: Array.isArray(state.doctypes) ? state.doctypes : [DEFAULT_DOCTYPE],
  };

  const methods = {
    contents: normalizedState,
    setContents: store,
    patchContents: (patch: Partial<AppState>) => store({ ...normalizedState, ...patch }),
    clearContents: removeItem,
  }
  return methods
}


export type AppState = {
  version?: number;
  createdAt?: string;
  doctypes?: Doctypes;
  /** Viewer-level RDF frontmatter properties. */
  frontmatter?: FrontmatterData;
};

// ─── Slug helpers ─────────────────────────────────────────────────────────────

/** Convert a doctype name to a URL-safe slug (lowercase, hyphens). */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

/** Find a DoctypeEntry by its URL slug. */
export function getDoctypeBySlug(doctypes: Doctypes, slug: string): DoctypeEntry | undefined {
  return doctypes.find((dt) => slugify(dt.name) === slug);
}

/** Return a new Doctypes array with the entry for `slug` patched. */
export function updateDoctype(
  doctypes: Doctypes,
  slug: string,
  patch: Partial<DoctypeEntry>
): Doctypes {
  return doctypes.map((dt) =>
    slugify(dt.name) === slug ? { ...dt, ...patch } : dt
  );
}

/** Add a new doctype, or return the array unchanged if the name already exists. */
export function addDoctype(doctypes: Doctypes, name: string): Doctypes {
  const slug = slugify(name);
  if (doctypes.some((dt) => slugify(dt.name) === slug)) return doctypes;
  return [...doctypes, { name, fields: [], documents: [] }];
}

/** Rename a doctype (identified by slug), updating the `doctype` field in all its documents. */
export function renameDoctype(doctypes: Doctypes, slug: string, newName: string): Doctypes {
  return doctypes.map((dt) => {
    if (slugify(dt.name) !== slug) return dt;
    return {
      ...dt,
      name: newName,
      documents: dt.documents.map((doc) => ({ ...doc, doctype: newName })),
    };
  });
}

/** Remove a doctype by slug. */
export function removeDoctype(doctypes: Doctypes, slug: string): Doctypes {
  return doctypes.filter((dt) => slugify(dt.name) !== slug);
}

// Re-export DocumentEntry from state for backwards compatibility with existing imports
export type { DocumentEntry } from "~/state";
