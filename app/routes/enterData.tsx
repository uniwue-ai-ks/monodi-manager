import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  FormProvider,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { Button, TabItem, Table, TableBody, TableHead, TableHeadCell, TableRow, Tabs } from "flowbite-react";
import { HiExclamationCircle } from "react-icons/hi2";
import { Card, CardTitle } from "~/components/card";
import { useAppState, type DocumentEntry } from "~/utils/flowStorage";
import type { PdfNamesByDoctype } from "~/utils/pdfUploads";
import type { DoctypeField } from "~/state";
import { exportToCsv, importFromCsv, type ImportErrors, type ImportWarnings } from "~/utils/csvImportExport";
import type { Route } from "./+types/enterData";
import { DocumentTableRow, ImportAlerts, PaginationControls } from "~/components/enterData";
import type { EnterDataFormData } from "~/components/enterData/types";
import { CsvToolbar } from "~/components/enterData/CsvToolbar";

const PAGE_SIZE = 100;

export const meta = ({ }: Route.MetaArgs) => {
  return [
    { title: "Metadaten erfassen" },
    { name: "description", content: "Schritt 4: Metadaten für die Dokumente erfassen" },
  ];
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function triggerCsvDownload(csvText: string, filename: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const MetadataPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { filesByDoctype?: PdfNamesByDoctype; uploadSkipped?: boolean } | null;
  const uploadSkipped = locationState?.uploadSkipped ?? false;

  const storage = useAppState();
  const doctypes = storage.contents.doctypes ?? {};
  const doctypeNames = Object.keys(doctypes);
  const defaultDoctype = doctypeNames[0] ?? "";

  const allFields: DoctypeField[] = [];
  const seenFieldNames = new Set<string>();
  for (const fields of Object.values(doctypes)) {
    for (const field of fields) {
      if (!seenFieldNames.has(field.name) && field.type !== ":pdf") {
        seenFieldNames.add(field.name);
        allFields.push(field);
      }
    }
  }

  const doctypeFieldMap = new Map<string, Set<string>>(
    Object.entries(doctypes).map(([name, fields]) => [
      name,
      new Set(fields.filter((f) => f.type !== ":pdf").map((f) => f.name)),
    ])
  );

  const doctypeFields = new Map<string, DoctypeField[]>(
    Object.entries(doctypes).map(([name, fields]) => [
      name,
      fields.filter((f) => f.type !== ":pdf"),
    ])
  );

  const multipleTypes = doctypeNames.length > 1;
  const existingDocs = storage.contents.documents ?? [];

  const incomingFiles: { filename: string; doctype: string }[] = locationState?.filesByDoctype
    ? Object.entries(locationState.filesByDoctype).flatMap(([doctype, files]) =>
      files.map((filename) => ({ filename, doctype }))
    )
    : [];

  const initialDocs: DocumentEntry[] =
    incomingFiles.length > 0
      ? incomingFiles.map(({ filename, doctype }) => {
        const existing = existingDocs.find((d) => d.filename === filename);
        return existing ?? { filename, doctype, values: {} };
      })
      : existingDocs;

  const methods = useForm<EnterDataFormData>({
    defaultValues: { documents: initialDocs },
  });
  const { fields } = useFieldArray({ control: methods.control, name: "documents" });

  const [importErrors, setImportErrors] = useState<ImportErrors>({});
  const [importWarnings, setImportWarnings] = useState<ImportWarnings>({});
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  // Memoized per-doctype row index lists to avoid O(n) scans on every render
  const rowsByDoctype = useMemo(() => {
    const map = new Map<string, Array<{ row: (typeof fields)[0]; i: number }>>();
    fields.forEach((row, i) => {
      const arr = map.get(row.doctype) ?? [];
      arr.push({ row, i });
      map.set(row.doctype, arr);
    });
    return map;
  }, [fields]);

  const filenamesByDoctype = useMemo(() => {
    const map = new Map<string, Set<string>>();
    fields.forEach((row) => {
      const set = map.get(row.doctype) ?? new Set<string>();
      set.add(row.filename);
      map.set(row.doctype, set);
    });
    return map;
  }, [fields]);

  const [pages, setPages] = useState<Map<string, number>>(new Map());
  const getPage = (doctype: string) => pages.get(doctype) ?? 0;
  const setPage = (doctype: string, page: number) =>
    setPages((prev) => new Map(prev).set(doctype, page));

  useEffect(() => {
    if (!uploadSkipped && incomingFiles.length === 0 && existingDocs.length === 0) {
      navigate("/upload");
    }
  }, []);

  const onSubmit = (data: EnterDataFormData) => {
    storage.patchContents({ documents: data.documents });
    navigate("/step5");
  };

  const handleExport = (doctype: string) => {
    const currentDocs = methods.getValues("documents");
    const docsForType = currentDocs.filter((d) => d.doctype === doctype);
    const fields = doctypeFields.get(doctype) ?? [];
    const csv = exportToCsv(docsForType, fields);
    const safeName = doctype.replace(/[^a-zA-Z0-9_-]/g, "_");
    triggerCsvDownload(csv, multipleTypes ? `metadata-${safeName}.csv` : "metadata-export.csv");
  };

  const handleImport = (file: File, doctype: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const fields = doctypeFields.get(doctype) ?? [];
        const currentDocs = methods.getValues("documents");
        const { updated, errors, warnings } = importFromCsv(text, currentDocs, fields, doctype);
        methods.reset({ documents: updated });
        setImportErrors(errors);
        setImportWarnings(warnings);
        setShowErrorsOnly(false);
      } catch (err) {
        alert(`Fehler beim Importieren: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  const errorFilenames = new Set(Object.keys(importErrors));
  const warningFilenames = new Set(Object.keys(importWarnings));

  const shouldShowRow = (filename: string) => {
    if (!showErrorsOnly) return true;
    return errorFilenames.has(filename);
  };

  const hasAnyFeedback = (doctype: string) =>
    fields
      .filter((f) => f.doctype === doctype)
      .some((f) => errorFilenames.has(f.filename) || warningFilenames.has(f.filename));

  const renderTable = (doctype: string, tabFields: DoctypeField[]) => {
    const allRows = rowsByDoctype.get(doctype) ?? [];
    const filenameSet = filenamesByDoctype.get(doctype) ?? new Set<string>();
    const visibleRows = allRows.filter(({ row }) => shouldShowRow(row.filename));
    const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    const page = Math.min(getPage(doctype), totalPages - 1);
    const pagedRows = visibleRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const tabErrors = Object.fromEntries(
      Object.entries(importErrors).filter(([fn]) => filenameSet.has(fn))
    );
    const tabWarnings = Object.fromEntries(
      Object.entries(importWarnings).filter(([fn]) => filenameSet.has(fn))
    );

    return (
      <>
        <ImportAlerts
          errors={tabErrors}
          warnings={uploadSkipped ? {} : tabWarnings}
          showErrorsOnly={showErrorsOnly}
          onToggleFilter={() => setShowErrorsOnly((v) => !v)}
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableHeadCell>Dateiname</TableHeadCell>
              {tabFields.map((f) => (
                <TableHeadCell key={f.name}>{f.name}</TableHeadCell>
              ))}
            </TableHead>
            <TableBody className="divide-y">
              {pagedRows.map(({ row, i }) => (
                <DocumentTableRow
                  key={row.id}
                  index={i}
                  doctypeNames={doctypeNames}
                  allFields={tabFields}
                  doctypeFieldMap={doctypeFieldMap}
                  multipleTypes={false}
                  rowErrors={importErrors[row.filename]}
                  isWarning={!uploadSkipped && warningFilenames.has(row.filename)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalRows={visibleRows.length}
          onPage={(p) => setPage(doctype, p)}
        />
      </>
    );
  };

  const singleVisibleRows = fields
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => shouldShowRow(row.filename));
  const singleTotalPages = Math.max(1, Math.ceil(singleVisibleRows.length / PAGE_SIZE));
  const singlePage = Math.min(getPage(defaultDoctype), singleTotalPages - 1);
  const singlePagedRows = singleVisibleRows.slice(singlePage * PAGE_SIZE, (singlePage + 1) * PAGE_SIZE);

  return (
    <Card className="pb-4 w-full max-w-screen-xl">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="space-y-4 mb-4">
            <CardTitle>Metadaten erfassen</CardTitle>
            <p>Erfassen Sie die Metadaten für jedes Dokument.</p>
          </div>
          {multipleTypes ? (
            <Tabs>
              {doctypeNames.map((doctype) => {
                const tabFields = allFields.filter((f) => doctypeFieldMap.get(doctype)?.has(f.name));
                const hasFeedback = hasAnyFeedback(doctype);
                return (
                  <TabItem
                    key={doctype}
                    title={
                      <span className="flex items-center gap-1">
                        {hasFeedback && <HiExclamationCircle className="text-red-500 w-4 h-4" />}
                        {doctype} ({fields.filter((f) => f.doctype === doctype).length})
                      </span>
                    }
                  >
                    <div className="flex justify-end mb-3">
                      <CsvToolbar
                        onExport={() => handleExport(doctype)}
                        onImport={(file) => handleImport(file, doctype)}
                      />
                    </div>
                    {renderTable(doctype, tabFields)}
                  </TabItem>
                );
              })}
            </Tabs>
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <CsvToolbar
                  onExport={() => handleExport(defaultDoctype)}
                  onImport={(file) => handleImport(file, defaultDoctype)}
                />
              </div>
              <ImportAlerts
                errors={importErrors}
                warnings={uploadSkipped ? {} : importWarnings}
                showErrorsOnly={showErrorsOnly}
                onToggleFilter={() => setShowErrorsOnly((v) => !v)}
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableHeadCell>Dateiname</TableHeadCell>
                    {allFields.map((f) => (
                      <TableHeadCell key={f.name}>{f.name}</TableHeadCell>
                    ))}
                  </TableHead>
                  <TableBody className="divide-y">
                    {singlePagedRows.map(({ row, i }) => (
                      <DocumentTableRow
                        key={row.id}
                        index={i}
                        doctypeNames={doctypeNames}
                        allFields={allFields}
                        doctypeFieldMap={doctypeFieldMap}
                        multipleTypes={false}
                        rowErrors={importErrors[row.filename]}
                        isWarning={!uploadSkipped && warningFilenames.has(row.filename)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                page={singlePage}
                totalPages={singleTotalPages}
                totalRows={singleVisibleRows.length}
                onPage={(p) => setPage(defaultDoctype, p)}
              />
            </>
          )}
          <hr className="text-gray-300 mt-4" />
          <div className="flex justify-between mt-4">
            <Button color="light" onClick={() => navigate(-1)}>
              zurück
            </Button>
            <Button type="submit">weiter</Button>
          </div>
        </form>
      </FormProvider>
    </Card>
  );
}
export default MetadataPage;
