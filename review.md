Here is a comprehensive code review of the **generator-monodi** codebase, organized by category:

---

## Bugs / Potential Bugs

| ID | File | Issue |
|----|------|-------|
| BUG-01 | `app/docClass/DisplayLocationSelector.tsx:22` | Local `selected` state initialized from `props.value` only on mount — never re-syncs if parent updates the prop. Use a controlled pattern or add a `useEffect` sync. |
| BUG-02 | `app/routes/doctypeFields.tsx:24` | `useEffect` dependency array omits `doctypes` and `params.name` — stale closure warning, guard never re-runs. |
| BUG-05 | `app/utils/exportTtl.ts:8` | `toSlug("")` or `toSlug("---")` returns `""`, producing an invalid Turtle URI like `data:`. Add a fallback (e.g. `"unnamed"`). |
| BUG-06 | `app/routes/doctypeFields.tsx:43` | `navigate(next!)` uses a non-null assertion to silence a compiler warning instead of a proper null-check. |
| BUG-07 | `app/routes/enterData.tsx:164` | `location.state as { ... }` is an unsafe cast with no runtime validation — malformed state causes silent failures. |
| BUG-08 | `app/routes/enterData.tsx:249` | `useEffect` with an empty dependency array closes over `uploadSkipped`, `incomingFiles`, `existingDocs`, and `navigate` — none are listed. |
| BUG-09 | `app/routes/upload.tsx:37` | Two files named `report.pdf` from different directories are silently deduplicated with no warning to the user. |

---

## Code Quality / Maintainability

| ID | File | Issue |
|----|------|-------|
| QM-01 | `app/root.tsx:45` | Anonymous default export — shows as `Anonymous` in React DevTools and stack traces. Name the component. |
| QM-02 | `app/docClass/docClass.tsx:38` | Large commented-out block of dead code — delete it, git history preserves it. |
| QM-03 | `app/components/MultiSubForm.tsx:55,61` | `console.log` debug statements left in production code. |
| QM-04 | `app/routes/csvUpload.tsx:80` | `window.confirm` used for a data-loss confirmation — inaccessible, inconsistent with the Flowbite design system. Use a `Modal`. |
| QM-05 | `app/routes/enterData.tsx:282` | `alert()` used for error reporting — same problem. Use an `Alert` component. |
| QM-06 | `app/routes/enterData.tsx:340` | `multipleTypes` is hardcoded `false` inside `renderTable`, making the prop largely dead code. |
| QM-08 | `app/components/forms.tsx:133` | `useToggle` returns a component defined inside the hook body — a React anti-pattern that causes remount on every render. Also, `key` is a React reserved prop and cannot be forwarded. |
| QM-09 | `app/utils/flowStorage.ts:8` + `app/routes/csvUpload.tsx:17` | Magic string `"Dokument"` (default doctype name) is duplicated. Extract to a shared constant. |
| QM-10 | `app/utils/csvImportExport.ts:92` | Blank lines anywhere in CSV data are silently dropped — no warning if a mid-data blank line shifts row indices. |
| QM-11 | `app/routes/enterData.tsx:247` | `Map` inside React state works but is unserializable and less idiomatic — a `Record<string, number>` is simpler. |

---

## Security

| ID | File | Issue |
|----|------|-------|
| SEC-01 | `app/utils/flowStorage.ts:4` | All wizard state in `localStorage` under a fixed key with no expiry, no session isolation, and no schema-migration check. The `version` field exists but is never read or used. |
| SEC-02 | `app/utils/exportTtl.ts:125` | User-supplied string values are injected directly into Turtle output without sanitization — Turtle injection is possible (low risk since client-only, but still poor practice). |
| SEC-04 | `Caddyfile:4` | `browse` directive enables directory listing in production. Remove it unless intentional. |

---

## Performance

| ID | File | Issue |
|----|------|-------|
| PERF-01 | `app/routes/enterData.tsx:172` | `allFields`, `doctypeFieldMap`, and `doctypeFields` are recomputed on every render. Wrap in `useMemo([doctypes])`. |
| PERF-02 | `app/routes/enterData.tsx:296` | `hasAnyFeedback(doctype)` runs `.filter().some()` per doctype inside a render loop — O(n) per doctype. Precompute a map with `useMemo`. |
| PERF-03 | `app/utils/csvSchemaInfer.ts:102` | `inferSchemaFromCsv` creates a full copy of all column values per column for type inference, doubling memory for large CSVs. Use a single-pass approach. |

---

## Missing Error Handling

| ID | File | Issue |
|----|------|-------|
| ERR-02 | `app/routes/enterData.tsx` (general) | No error boundary around the export step — a crash in `generateTtl` (e.g., from BUG-05) bubbles to the global boundary and wipes the entire UI. |
| ERR-03 | `app/utils/flowStorage.ts:13` | `patchContents` does a shallow merge — callers who supply a top-level key accidentally wipe all nested data under it. This behavior is undocumented. |

---

## Dead Code / Unused

| ID | File | Issue |
|----|------|-------|
| DEAD-01 | `app/components/forms.tsx:133` | `useToggle` is exported but never imported anywhere. |
| DEAD-02 | `app/utils/pdfUploads.ts:3` | `PendingPdfUpload` and `PdfUploadProcessor` are exported but only used internally. |
| DEAD-03 | `app/docClass/editFields.tsx:13` | `FieldArrayFromValue` type is exported but never referenced. |
| DEAD-04 | `app/utils/exportTtl.ts:34` | `DOC_POSITION_KEY` maps each key to itself — it's an identity lookup. Just use the value directly. |
| DEAD-05 | `Containerfile:8` | `prod-deps` build stage is declared but never referenced in the final image. |
| DEAD-06 | `app/utils/index.ts:1` | Barrel file only re-exports `flowStorage`, not other utils — misleading and incomplete. |

---

## Type Safety

| ID | File | Issue |
|----|------|-------|
| TYPE-01 | `app/components/forms.tsx:58` | `methods.control as any` suppresses a compiler error caused by using `useFormContext()` without a type parameter. Fix: `useFormContext<T>()`. |
| TYPE-02 | `app/components/forms.tsx:51` | `Boolean` (wrapper object type) used instead of primitive `boolean`. `new Boolean(false)` is truthy. |
| TYPE-03 | `app/components/forms.tsx:20` | `FormCard<T, C>` has a generic `C` parameter that is unconstrained, unneeded, and vestigial. |
| TYPE-04 | `app/utils/csvImportExport.ts:182` | Multiple `doc!` non-null assertions — restructure so TypeScript can narrow the type instead. |

---

## Tests

**There are zero test files in this project.** The highest-priority areas to add tests:

1. **`csvImportExport.ts`** — `parseCsvLine`, `splitCsvRows`, `importFromCsv`: pure logic with many edge cases (quoted fields, embedded newlines, BOM, deduplication).
2. **`csvSchemaInfer.ts`** — type inference logic for boolean/number/string detection.
3. **`exportTtl.ts`** — Turtle output correctness, escaping, slug generation.
4. **Navigation guards** in `doctypeFields.tsx` and `enterData.tsx`.

---

## Architecture

| ID | Issue |
|----|-------|
| ARCH-01 | No migration path for `localStorage` schema — the `version` field exists but is never checked. Users who upgrade get silently incompatible state. |
| ARCH-02 | No navigation guards — users can navigate directly to `/step5` (export) or `/enterData` with no data. Only two routes have guards. Add a shared loader/middleware. |
| ARCH-03 | `Containerfile` deploys a static SPA via Caddy, but `package.json` still has SSR dependencies (`@react-router/node`, `@react-router/serve`) and a `start` script for SSR. Pick one and remove the other. |
| ARCH-05 | `exportTtl.ts` builds RDF by string concatenation with post-hoc mutation of the last array element (`.replace(/ ;$/, " .")`) — fragile and hard to extend. Consider using triple objects + a final serializer, or the `n3` library. |
| ARCH-06 | Route `step5` is the only step using a positional name; all others use semantic names (`doctypes`, `upload`, `enterData`, etc.). Rename to `export` for consistency (ARCH-07). |
| ARCH-07 | `pdfUploads.ts` exports a generic `processPdfUploadsSequentially` abstraction used for only a single trivial `({ name }) => name` callback. The abstraction adds indirection with no current benefit. |
