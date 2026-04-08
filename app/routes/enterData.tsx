import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { Alert, Button, Select, TabItem, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Tabs, TextInput, Tooltip } from "flowbite-react";
import { HiExclamationCircle, HiExclamationTriangle } from "react-icons/hi2";
import { Card, CardTitle } from "~/components/card";
import { useAppState, type DocumentEntry } from "~/utils/flowStorage";
import type { DoctypeField } from "~/state";
import { CheckboxTristate } from "~/components/CheckboxTristate";
import { exportToCsv, importFromCsv, type ImportErrors, type ImportWarnings } from "~/utils/csvImportExport";
import type { Route } from "./+types/enterData";

type EnterDataFormData = {
  documents: DocumentEntry[];
};

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

// ─── Toolbar (export + import buttons) ───────────────────────────────────────

type CsvToolbarProps = {
  onExport: () => void;
  onImport: (file: File) => void;
};

const CsvToolbar = ({ onExport, onImport }: CsvToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button size="xs" color="light" onClick={onExport}>
        CSV exportieren
      </Button>
      <Button size="xs" color="light" onClick={() => fileInputRef.current?.click()}>
        CSV importieren
      </Button>
    </div>
  );
};

// ─── Error / warning alerts ───────────────────────────────────────────────────

type ImportAlertsProps = {
  errors: ImportErrors;
  warnings: ImportWarnings;
  showErrorsOnly: boolean;
  onToggleFilter: () => void;
};

const ImportAlerts = ({ errors, warnings, showErrorsOnly, onToggleFilter }: ImportAlertsProps) => {
  const errorCount = Object.keys(errors).length;
  const warningCount = Object.keys(warnings).length;

  return (
    <div className="space-y-2 mb-3">
      {errorCount > 0 && (
        <Alert color="failure" icon={HiExclamationCircle}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              <strong>{errorCount} {errorCount === 1 ? "Zeile hat" : "Zeilen haben"} Importfehler.</strong>
              {" "}Ungültige Werte wurden auf leer oder unbestimmt gesetzt.
            </span>
            <Button size="xs" color="failure" onClick={onToggleFilter}>
              {showErrorsOnly ? "Alle anzeigen" : "Nur Fehler anzeigen"}
            </Button>
          </div>
        </Alert>
      )}
      {warningCount > 0 && (
        <Alert color="warning" icon={HiExclamationTriangle}>
          <p className="font-semibold mb-1">
            {warningCount} {warningCount === 1 ? "Datei wurde" : "Dateien wurden"} importiert, aber noch nicht hochgeladen:
          </p>
          <ul className="list-disc pl-4 text-sm space-y-0.5">
            {Object.keys(warnings).map((filename) => (
              <li key={filename}><code>{filename}</code></li>
            ))}
          </ul>
          <p className="text-sm mt-1">
            Diese Dateien werden für den RDF-Export verwendet, müssen aber für die PDF-Paketierung manuell hochgeladen werden.
          </p>
        </Alert>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const MetadataPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { files?: File[]; filesByDoctype?: Record<string, File[]> } | null;

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

  const incomingFiles: { file: File; doctype: string }[] = locationState?.filesByDoctype
    ? Object.entries(locationState.filesByDoctype).flatMap(([doctype, files]) =>
      files.map((file) => ({ file, doctype }))
    )
    : (locationState?.files ?? []).map((file) => ({ file, doctype: defaultDoctype }));

  const initialDocs: DocumentEntry[] =
    incomingFiles.length > 0
      ? incomingFiles.map(({ file, doctype }) => {
        const existing = existingDocs.find((d) => d.filename === file.name);
        return existing ?? { filename: file.name, doctype, values: {} };
      })
      : existingDocs;

  const methods = useForm<EnterDataFormData>({
    defaultValues: { documents: initialDocs },
  });
  const { fields } = useFieldArray({ control: methods.control, name: "documents" });

  const [importErrors, setImportErrors] = useState<ImportErrors>({});
  const [importWarnings, setImportWarnings] = useState<ImportWarnings>({});
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  useEffect(() => {
    if (incomingFiles.length === 0 && existingDocs.length === 0) {
      navigate("/upload");
    }
  }, []);

  const onSubmit = (data: EnterDataFormData) => {
    storage.patchContents({ documents: data.documents });
    navigate("/step5", { state: { filesByDoctype: locationState?.filesByDoctype } });
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
    const visibleRows = fields
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => row.doctype === doctype)
      .filter(({ row }) => shouldShowRow(row.filename));

    const tabErrors = Object.fromEntries(
      Object.entries(importErrors).filter(([fn]) => fields.some((r) => r.doctype === doctype && r.filename === fn))
    );
    const tabWarnings = Object.fromEntries(
      Object.entries(importWarnings).filter(([fn]) => fields.some((r) => r.doctype === doctype && r.filename === fn))
    );

    return (
      <>
        <ImportAlerts
          errors={tabErrors}
          warnings={tabWarnings}
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
              {visibleRows.map(({ row, i }) => (
                <DocumentTableRow
                  key={row.id}
                  index={i}
                  doctypeNames={doctypeNames}
                  allFields={tabFields}
                  doctypeFieldMap={doctypeFieldMap}
                  multipleTypes={false}
                  rowErrors={importErrors[row.filename]}
                  isWarning={warningFilenames.has(row.filename)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

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
                warnings={importWarnings}
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
                    {fields
                      .map((row, i) => ({ row, i }))
                      .filter(({ row }) => shouldShowRow(row.filename))
                      .map(({ row, i }) => (
                        <DocumentTableRow
                          key={row.id}
                          index={i}
                          doctypeNames={doctypeNames}
                          allFields={allFields}
                          doctypeFieldMap={doctypeFieldMap}
                          multipleTypes={false}
                          rowErrors={importErrors[row.filename]}
                          isWarning={warningFilenames.has(row.filename)}
                        />
                      ))}
                  </TableBody>
                </Table>
              </div>
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

// ─── Table row ───────────────────────────────────────────────────────────────

type DocumentTableRowProps = {
  index: number;
  doctypeNames: string[];
  allFields: DoctypeField[];
  doctypeFieldMap: Map<string, Set<string>>;
  multipleTypes: boolean;
  rowErrors?: Record<string, string>;
  isWarning?: boolean;
};

const DocumentTableRow = ({
  index,
  doctypeNames,
  allFields,
  doctypeFieldMap,
  multipleTypes,
  rowErrors,
  isWarning,
}: DocumentTableRowProps) => {
  const { register, control } = useFormContext<EnterDataFormData>();
  const doctype = useWatch({ control, name: `documents.${index}.doctype` });
  const filename = useWatch({ control, name: `documents.${index}.filename` });
  const activeFields = doctypeFieldMap.get(doctype) ?? new Set<string>();

  const rowBg = isWarning ? "bg-yellow-50" : "bg-white";

  return (
    <TableRow className={rowBg}>
      <TableCell className="whitespace-nowrap font-medium text-gray-900">
        <input type="hidden" {...register(`documents.${index}.filename`)} />
        <span className="flex items-center gap-1">
          {isWarning && (
            <Tooltip content="Datei noch nicht hochgeladen">
              <HiExclamationTriangle className="text-yellow-500 w-4 h-4 shrink-0" />
            </Tooltip>
          )}
          {filename}
        </span>
      </TableCell>
      {multipleTypes && (
        <TableCell>
          <Controller
            control={control}
            name={`documents.${index}.doctype`}
            render={({ field }) => (
              <Select {...field} sizing="sm">
                {doctypeNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          />
        </TableCell>
      )}
      {allFields.map((f) => {
        const active = !multipleTypes || activeFields.has(f.name);
        const fieldError = rowErrors?.[f.name];
        return (
          <TableCell key={f.name}>
            {active ? (
              fieldError ? (
                <Tooltip content={fieldError}>
                  <div className="ring-2 ring-red-500 rounded inline-block">
                    <FieldInput f={f} index={index} control={control} register={register} />
                  </div>
                </Tooltip>
              ) : (
                <FieldInput f={f} index={index} control={control} register={register} />
              )
            ) : (
              <span className="text-gray-300 select-none">—</span>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

// ─── Field input ─────────────────────────────────────────────────────────────

type FieldInputProps = {
  f: DoctypeField;
  index: number;
  control: ReturnType<typeof useFormContext<EnterDataFormData>>["control"];
  register: ReturnType<typeof useFormContext<EnterDataFormData>>["register"];
};

const FieldInput = ({ f, index, control, register }: FieldInputProps) => {
  if (f.type === ":boolean") {
    return (
      <Controller
        control={control}
        name={`documents.${index}.values.${f.name}`}
        render={({ field }) => {
          const triValue = field.value === "true" ? true : field.value === "false" ? false : undefined;
          return (
            <CheckboxTristate
              value={triValue}
              onChange={(v) => field.onChange(v === true ? "true" : v === false ? "false" : "")}
            />
          );
        }}
      />
    );
  }
  return (
    <TextInput
      {...register(`documents.${index}.values.${f.name}`)}
      sizing="sm"
      type={f.type === ":number" ? "number" : "text"}
    />
  );
};
