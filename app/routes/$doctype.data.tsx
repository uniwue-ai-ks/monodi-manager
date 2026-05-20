import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  FormProvider,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { Button, Table, TableBody, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { Card, CardTitle } from "~/components/card";
import { useAppState, getDoctypeBySlug, updateDoctype, type DocumentEntry } from "~/utils/flowStorage";
import { exportToCsv, importFromCsv, type ImportErrors, type ImportWarnings } from "~/utils/csvImportExport";
import type { Route } from "./+types/$doctype.data";
import { DocumentTableRow, ImportAlerts, PaginationControls } from "~/components/enterData";
import type { EnterDataFormData } from "~/components/enterData/types";
import { CsvToolbar } from "~/components/enterData/CsvToolbar";

const PAGE_SIZE = 100;

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Metadaten erfassen" },
    { name: "description", content: "Metadaten für die Dokumente erfassen" },
  ];
};

function triggerCsvDownload(csvText: string, filename: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const DataEntryPage = ({ params }: Route.ComponentProps) => {
  const navigate = useNavigate();
  const storage = useAppState();
  const doctypes = storage.contents.doctypes ?? [];
  const doctype = getDoctypeBySlug(doctypes, params.doctype);

  const [importErrors, setImportErrors] = useState<ImportErrors>({});
  const [importWarnings, setImportWarnings] = useState<ImportWarnings>({});
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  const [page, setPage] = useState(0);

  if (!doctype) {
    return (
      <Card>
        <p className="text-red-600">Dokumententyp „{params.doctype}" nicht gefunden.</p>
        <Button color="light" onClick={() => navigate("/")}>Zurück zur Übersicht</Button>
      </Card>
    );
  }

  const fields = doctype.fields;
  const doctypeNames = [doctype.name];
  const doctypeFieldMap = new Map([[doctype.name, new Set(fields.map((f) => f.name))]]);

  const methods = useForm<EnterDataFormData>({
    defaultValues: { documents: doctype.documents },
  });
  const { fields: rows } = useFieldArray({ control: methods.control, name: "documents" });

  const errorFilenames = new Set(Object.keys(importErrors));
  const warningFilenames = new Set(Object.keys(importWarnings));

  const shouldShowRow = (filename: string) => {
    if (!showErrorsOnly) return true;
    return errorFilenames.has(filename);
  };

  const visibleRows = useMemo(
    () => rows.map((row, i) => ({ row, i })).filter(({ row }) => shouldShowRow(row.filename)),
    [rows, showErrorsOnly, errorFilenames]
  );

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedRows = visibleRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const onSubmit = (data: EnterDataFormData) => {
    const updatedDoctypes = updateDoctype(doctypes, params.doctype, {
      documents: data.documents,
    });
    storage.patchContents({ doctypes: updatedDoctypes });
    navigate("/frontmatter");
  };

  const handleExport = () => {
    const currentDocs = methods.getValues("documents");
    const csv = exportToCsv(currentDocs, fields);
    const safeName = doctype.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    triggerCsvDownload(csv, `metadata-${safeName}.csv`);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const currentDocs = methods.getValues("documents");
        const { updated, errors, warnings } = importFromCsv(text, currentDocs, fields, doctype.name);
        methods.reset({ documents: updated });
        setImportErrors(errors);
        setImportWarnings(warnings);
        setShowErrorsOnly(false);
        setPage(0);
      } catch (err) {
        alert(`Fehler beim Importieren: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.onerror = () => alert("Datei konnte nicht gelesen werden.");
    reader.readAsText(file);
  };

  return (
    <Card className="pb-4 w-full max-w-screen-xl">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="space-y-4 mb-4">
            <CardTitle>Metadaten – {doctype.name}</CardTitle>
            <p>Erfassen oder prüfen Sie die Metadaten für die Dokumente dieses Typs.</p>
          </div>

          <div className="flex justify-end mb-3">
            <CsvToolbar
              onExport={handleExport}
              onImport={(file) => handleImport(file)}
            />
          </div>

          <ImportAlerts
            errors={importErrors}
            warnings={importWarnings}
            showErrorsOnly={showErrorsOnly}
            onToggleFilter={() => setShowErrorsOnly((v) => !v)}
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Dateiname</TableHeadCell>
                  {fields.map((f) => (
                    <TableHeadCell key={f.name}>{f.name}</TableHeadCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {pagedRows.map(({ row, i }) => (
                  <DocumentTableRow
                    key={row.id}
                    index={i}
                    doctypeNames={doctypeNames}
                    allFields={fields}
                    doctypeFieldMap={doctypeFieldMap}
                    multipleTypes={false}
                    rowErrors={importErrors[row.filename]}
                    isWarning={warningFilenames.has(row.filename)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            totalRows={visibleRows.length}
            onPage={setPage}
          />

          <hr className="text-gray-300 mt-4" />
          <div className="flex justify-between mt-4">
            <Button color="light" onClick={() => navigate(`/${params.doctype}/fields`)}>
              zurück
            </Button>
            <Button type="submit">weiter</Button>
          </div>
        </form>
      </FormProvider>
    </Card>
  );
};

export default DataEntryPage;
