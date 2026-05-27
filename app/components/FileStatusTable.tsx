import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Checkbox, Label, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { HiChevronDown, HiChevronRight, HiExclamationCircle, HiTrash } from "react-icons/hi2";
import type { DocumentEntry } from "~/state";
import { getServerFiles, isStandalone } from "~/utils/api";
import { useUploadQueue } from "~/context/UploadContext";

const PAGE_SIZE = 20;

type Props = {
  /** Document entries (document file mode: cross-references GET /api/files). */
  documents?: DocumentEntry[];
  /** Plain filename list (CSV/generic mode: list IS the source of truth, no cross-ref). */
  filenames?: string[];
  /** Called when the user clicks the remove button for a row. `onServer` is true/false when known, null while loading. */
  onRemove?: (filename: string, onServer: boolean | null) => void;
  /** Header label override. Defaults to "Dateien". */
  label?: string;
};

export const FileStatusTable = ({ documents, filenames: filenamesProp, onRemove, label }: Props) => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [serverFiles, setServerFiles] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // "filenames" mode: plain list, no server cross-reference
  const isFilenamesMode = filenamesProp !== undefined;
  // In document mode, derive filenames from DocumentEntry objects
  const allFilenames: string[] = isFilenamesMode
    ? filenamesProp
    : (documents ?? []).map((d) => d.filename);

  const fetchServerFiles = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const files = await getServerFiles();
      setServerFiles(new Set(files));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch fresh data each time the panel is opened (document mode, connected only).
  useEffect(() => {
    if (open && !isStandalone && !isFilenamesMode) {
      void fetchServerFiles();
    }
  }, [open, fetchServerFiles, isFilenamesMode]);

  // Re-fetch whenever active uploads finish (so "Auf Server" reflects new uploads).
  const { tasks } = useUploadQueue();
  const uploadingCount = tasks.filter((t) => t.status === "uploading").length;
  const prevUploadingCount = useRef(0);
  useEffect(() => {
    if (prevUploadingCount.current > 0 && uploadingCount === 0 && open && !isStandalone && !isFilenamesMode) {
      void fetchServerFiles();
    }
    prevUploadingCount.current = uploadingCount;
  }, [uploadingCount, open, fetchServerFiles, isFilenamesMode]);

  // Reset to page 0 when the filter or list changes.
  useEffect(() => {
    setPage(0);
  }, [showMissingOnly, documents, filenamesProp]);

  if (allFilenames.length === 0) return null;

  const missingCount =
    !isStandalone && !isFilenamesMode && serverFiles != null
      ? allFilenames.filter((f) => !serverFiles.has(f)).length
      : null;

  const sortedFilenames = [...allFilenames].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  const filteredFilenames =
    showMissingOnly && serverFiles != null && !isFilenamesMode
      ? sortedFilenames.filter((f) => !serverFiles.has(f))
      : sortedFilenames;

  const totalPages = Math.ceil(filteredFilenames.length / PAGE_SIZE);
  const pageSlice = filteredFilenames.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const baseLabel = label ?? "Dateien";
  const headerLabel = isStandalone || isFilenamesMode
    ? `${baseLabel} (${allFilenames.length})`
    : missingCount === null
      ? `${baseLabel} (${allFilenames.length})`
      : missingCount === 0
        ? `${baseLabel} (${allFilenames.length} – alle hochgeladen)`
        : `${baseLabel} (${allFilenames.length}, ${missingCount} fehlen auf dem Server)`;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        aria-expanded={open}
      >
        <span className="font-medium text-sm text-gray-700 flex items-center gap-2">
          {open ? (
            <HiChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <HiChevronRight className="w-4 h-4 text-gray-500" />
          )}
          {headerLabel}
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="p-4 space-y-3">
          {/* Missing-only filter (document mode, connected only) */}
          {!isStandalone && !isFilenamesMode && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="showMissingOnly"
                checked={showMissingOnly}
                onChange={(e) => setShowMissingOnly(e.target.checked)}
              />
              <Label htmlFor="showMissingOnly" className="cursor-pointer">
                Nur fehlende Dateien anzeigen
              </Label>
              {loading && (
                <span className="text-xs text-gray-400 ml-2">Lade Serverliste…</span>
              )}
            </div>
          )}

          {fetchError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <HiExclamationCircle className="w-4 h-4 shrink-0" />
              <span>Serverliste konnte nicht geladen werden: {fetchError}</span>
              <Button size="xs" color="light" onClick={() => void fetchServerFiles()}>
                Wiederholen
              </Button>
            </div>
          )}

          {filteredFilenames.length === 0 ? (
            <p className="text-sm text-gray-500">Keine Einträge.</p>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Dateiname</TableHeadCell>
                    {!isStandalone && !isFilenamesMode && <TableHeadCell>Auf Server</TableHeadCell>}
                    {onRemove && <TableHeadCell className="w-10" />}
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {pageSlice.map((filename) => {
                    const onServer =
                      !isStandalone && !isFilenamesMode && serverFiles != null
                        ? serverFiles.has(filename)
                        : null;
                    return (
                      <TableRow key={filename}>
                        <TableCell className="font-mono text-xs">{filename}</TableCell>
                        {!isStandalone && !isFilenamesMode && (
                          <TableCell>
                            {onServer === null ? (
                              <Badge color="gray">…</Badge>
                            ) : onServer ? (
                              <Badge color="success">✓ vorhanden</Badge>
                            ) : (
                              <Badge color="failure">✗ fehlt</Badge>
                            )}
                          </TableCell>
                        )}
                        {onRemove && (
                          <TableCell>
                            <button
                              type="button"
                              aria-label={`${filename} entfernen`}
                              onClick={() => onRemove(filename, onServer)}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <Button
                    size="xs"
                    color="light"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Zurück
                  </Button>
                  <span>
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredFilenames.length)}{" "}
                    von {filteredFilenames.length} · Seite {page + 1} von {totalPages}
                  </span>
                  <Button
                    size="xs"
                    color="light"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Weiter →
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
