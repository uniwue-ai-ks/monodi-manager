import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Label,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { HiExclamationCircle, HiExclamationTriangle } from "react-icons/hi2";
import { Card, CardTitle } from "~/components/card";
import { DropZone } from "~/components/DropZone";
import {
  useAppState,
  getDoctypeBySlug,
  updateDoctype,
} from "~/utils/flowStorage";
import {
  detectDocumentType,
  readDocumentFiles,
  docFilesToEntries,
} from "~/utils/documentUploads";
import {
  inferSchemaFromCsv,
  csvSchemaErrorMessage,
  type CsvSchemaResult,
} from "~/utils/csvSchemaInfer";
import { importFromCsv, mergeFields } from "~/utils/csvImportExport";
import { documentTypeOptions, typeOptions } from "~/state";
import type { DocumentEntry } from "~/state";
import {
  isStandalone,
  uploadCsvToBackend,
  deleteCsvFile,
  deleteServerFile,
  getCsvFiles,
} from "~/utils/api";
import { useUploadQueue } from "~/context/UploadContext";
import { FileStatusTable } from "~/components/FileStatusTable";
import type { Route } from "./+types/$doctype.import";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Import" },
    { name: "description", content: "Daten importieren" },
  ];
};

type FieldsMode = "replace" | "add-new" | "keep";
type DataMode = "replace" | "add-new" | "keep";

export const ImportPage = ({ params }: Route.ComponentProps) => {
  const navigate = useNavigate();
  const storage = useAppState();
  const doctypes = storage.contents.doctypes ?? [];
  const doctype = getDoctypeBySlug(doctypes, params.doctype);
  const { queueUpload } = useUploadQueue();

  const [csvFilename, setCsvFilename] = useState<string | null>(null);
  const [serverCsvFiles, setServerCsvFiles] = useState<string[]>([]);
  const [parseResult, setParseResult] = useState<CsvSchemaResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);
  const [lastCsvText, setLastCsvText] = useState<string | null>(null);
  const [fieldsMode, setFieldsMode] = useState<FieldsMode>("replace");
  const [dataMode, setDataMode] = useState<DataMode>("replace");
  const [mixedTypeError, setMixedTypeError] = useState(false);
  const [ignoreUnknownFiles, setIgnoreUnknownFiles] = useState(false);

  if (!doctype) {
    return (
      <Card>
        <p className="text-red-600">Dokumententyp „{params.doctype}" nicht gefunden.</p>
        <Button color="light" onClick={() => navigate("/")}>Zurück zur Übersicht</Button>
      </Card>
    );
  }

  const parseCsv = (text: string, ignore: boolean) => {
    const result = inferSchemaFromCsv(text, doctype.name, { ignoreDuplicateFilenames: ignore });
    if (result.ok) {
      setParseResult(result.result);
      setParseError(null);
    } else {
      setParseResult(null);
      setParseError(csvSchemaErrorMessage(result.error));
    }
  };

  const handleCsvUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setLastCsvText(text);
      setCsvFilename(file.name);
      parseCsv(text, ignoreDuplicates);
    };
    reader.onerror = () => setParseError("Datei konnte nicht gelesen werden.");
    reader.readAsText(file);

    // Upload to backend in connected mode; update server list on completion
    if (!isStandalone) {
      uploadCsvToBackend([file], () => {})
        .then(() => getCsvFiles())
        .then(setServerCsvFiles)
        .catch(() => {/* errors are non-fatal here */});
    }
  };

  const handleCsvRemoveByName = useCallback(async (name: string, _onServer: boolean | null) => {
    // Clear local parse state if the active CSV is being removed
    if (name === csvFilename) {
      setCsvFilename(null);
      setParseResult(null);
      setParseError(null);
      setLastCsvText(null);
    }
    if (!isStandalone) {
      try {
        await deleteCsvFile(name);
        setServerCsvFiles((prev) => prev.filter((f) => f !== name));
      } catch {
        /* silently ignore; user can retry by reopening the panel */
      }
    }
  }, [csvFilename]);

  const addDocFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Filter to known files if the option is enabled and there are existing entries
    const knownFilenames = new Set(doctype.documents.map((d) => d.filename));
    const filteredFiles = ignoreUnknownFiles && knownFilenames.size > 0
      ? Array.from(files).filter((f) => knownFilenames.has(f.name))
      : Array.from(files);
    if (filteredFiles.length === 0) return;

    const detected = detectDocumentType(filteredFiles);
    if (!detected) {
      setMixedTypeError(true);
      return;
    }
    setMixedTypeError(false);
    const read = await readDocumentFiles(filteredFiles);
    if (read.length === 0) return;

    // Immediately commit new files to doctype.documents so FileStatusTable shows them
    const newEntries = docFilesToEntries(read, doctype.name, doctype.documents);
    const existingFilenames = new Set(doctype.documents.map((d) => d.filename));
    const updatedDocuments: DocumentEntry[] = [
      // Update existing entries with new content if re-dropped
      ...doctype.documents.map((doc) => {
        const updated = newEntries.find((e) => e.filename === doc.filename);
        return updated ?? doc;
      }),
      // Add brand-new entries
      ...newEntries.filter((e) => !existingFilenames.has(e.filename)),
    ];
    const updatedDoctypes = updateDoctype(doctypes, params.doctype, {
      documents: updatedDocuments,
      mainDocumentType: detected,
    });
    storage.patchContents({ doctypes: updatedDoctypes });

    // Upload binary files (PDF, image) to the backend unless in standalone mode.
    if (!isStandalone && (detected === "pdf" || detected === "image")) {
      queueUpload(filteredFiles);
    }
  };

  const handleDocRemove = useCallback(async (filename: string, onServer: boolean | null) => {
    const updatedDoctypes = updateDoctype(doctypes, params.doctype, {
      documents: doctype.documents.filter((d) => d.filename !== filename),
    });
    storage.patchContents({ doctypes: updatedDoctypes });
    // Only attempt server delete when we know the file is actually there
    if (!isStandalone && onServer === true) {
      try {
        await deleteServerFile(filename);
      } catch {
        /* silently ignore; the entry has already been removed from state */
      }
    }
  }, [doctypes, doctype, params.doctype, storage]);

  /** Apply the current CSV parseResult using the selected fieldsMode + dataMode. Returns false on error. */
  const applyCsv = (): boolean => {
    if (!parseResult) return true; // nothing to apply
    const existingDocs = doctype.documents;

    // --- Fields ---
    let newFields = doctype.fields;
    if (fieldsMode === "replace") {
      newFields = parseResult.fields;
    } else if (fieldsMode === "add-new") {
      newFields = mergeFields(doctype.fields, parseResult.fields);
    }
    // "keep": leave newFields as doctype.fields

    // --- Data (documents) ---
    let newDocs: DocumentEntry[] = existingDocs;
    if (dataMode === "replace") {
      newDocs = parseResult.documents;
    } else if (dataMode === "add-new") {
      try {
        const { updated } = importFromCsv(lastCsvText!, existingDocs, newFields, doctype.name);
        newDocs = updated;
      } catch (err) {
        setParseError(err instanceof Error ? err.message : String(err));
        return false;
      }
    }
    // "keep": leave newDocs as existingDocs

    if (newDocs !== existingDocs || newFields !== doctype.fields) {
      const updatedDoctypes = updateDoctype(doctypes, params.doctype, {
        fields: newFields,
        documents: newDocs,
      });
      storage.patchContents({ doctypes: updatedDoctypes });
    }
    return true;
  };

  const handleWeiter = () => {
    if (!applyCsv()) return;
    navigate(`/${params.doctype}/fields`);
  };

  // CSV file list: in connected mode use server list; in standalone use local state
  const csvFilenames: string[] = isStandalone
    ? (csvFilename ? [csvFilename] : [])
    : serverCsvFiles;

  return (
    <Card className="max-w-200 pb-4 grid grid-cols-3 gap-4">
      <div className="col-span-3 space-y-4">
        <CardTitle>Import – {doctype.name}</CardTitle>
        <p>
          Laden Sie optional eine CSV-Datei hoch, um Felder und Metadaten zu importieren. Sie können
          auch ohne CSV direkt zu den Felddefinitionen weitergehen.
        </p>

        {/* CSV upload */}
        <div>
          <h3 className="font-semibold mb-2">1. CSV-Datei (optional)</h3>
          <p className="text-sm text-gray-500 mb-2">
            Eine Spalte muss den Namen <code>filename</code>, <code>dateiname</code>,{" "}
            <code>index</code> oder <code>key</code> tragen.
          </p>
          <DropZone
            onAdd={handleCsvUpload}
            accept=".csv,text/csv"
            multiple={false}
            placeholder="CSV-Datei hier ablegen oder klicken zum Auswählen"
          />
          <div className="mt-2">
            <FileStatusTable
              filenames={csvFilenames}
              onRemove={(name, onServer) => void handleCsvRemoveByName(name, onServer)}
              label="CSV-Dateien"
            />
          </div>
        </div>

        {parseError && (
          <>
            <Alert color="failure" icon={HiExclamationCircle}>{parseError}</Alert>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ignoreDuplicates"
                checked={ignoreDuplicates}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIgnoreDuplicates(checked);
                  if (lastCsvText) parseCsv(lastCsvText, checked);
                }}
              />
              <Label htmlFor="ignoreDuplicates">
                Doppelte Dateinamen ignorieren (nur erste Zeile wird verwendet)
              </Label>
            </div>
          </>
        )}

        {!parseError && lastCsvText && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="ignoreDuplicates"
              checked={ignoreDuplicates}
              onChange={(e) => {
                const checked = e.target.checked;
                setIgnoreDuplicates(checked);
                if (lastCsvText) parseCsv(lastCsvText, checked);
              }}
            />
            <Label htmlFor="ignoreDuplicates">
              Doppelte Dateinamen ignorieren (nur erste Zeile wird verwendet)
            </Label>
          </div>
        )}

        {parseResult && (
          <div className="space-y-4">
            {parseResult.ignoredDuplicateFilenames && parseResult.ignoredDuplicateFilenames.length > 0 && (
              <Alert color="warning" icon={HiExclamationTriangle}>
                <strong>{parseResult.ignoredDuplicateFilenames.length} doppelte{" "}
                  {parseResult.ignoredDuplicateFilenames.length === 1 ? "Dateiname wurde" : "Dateinamen wurden"} ignoriert
                </strong>{" "}– nur die erste Zeile je Dateiname wird verwendet:{" "}
                {parseResult.ignoredDuplicateFilenames.slice(0, 5).map((f) => `"${f}"`).join(", ")}
                {parseResult.ignoredDuplicateFilenames.length > 5 &&
                  ` (und ${parseResult.ignoredDuplicateFilenames.length - 5} weitere)`}.
              </Alert>
            )}

            <p className="text-sm text-gray-600">
              <strong>{parseResult.documents.length}</strong> Zeilen erkannt · Dateiname-Spalte:{" "}
              <code>{parseResult.filenameColumnName}</code>
            </p>

            {/* Import mode selection */}
            {(doctype.fields.length > 0 || doctype.documents.length > 0) ? (
              <div className="space-y-3">
                <h3 className="font-semibold">Importmodus</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Fields axis */}
                  <div className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Felder</p>
                    {(
                      [
                        { value: "replace" as FieldsMode, label: "Ersetzen", description: "Felder werden vollständig durch die aus der CSV abgeleiteten ersetzt." },
                        { value: "add-new" as FieldsMode, label: "Neue ergänzen", description: "Bestehende Felder bleiben erhalten, neue Spalten werden hinzugefügt." },
                        { value: "keep" as FieldsMode, label: "Unverändert lassen", description: "Felder werden nicht verändert." },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                        <Radio name="fieldsMode" value={opt.value} checked={fieldsMode === opt.value} onChange={() => setFieldsMode(opt.value)} className="mt-0.5" />
                        <span>
                          <span className="font-medium text-sm">{opt.label}</span>
                          <span className="block text-xs text-gray-500">{opt.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {/* Data axis */}
                  <div className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Metadaten</p>
                    {(
                      [
                        { value: "replace" as DataMode, label: "Ersetzen", description: "Alle bestehenden Dokumente werden durch die aus der CSV ersetzt." },
                        { value: "add-new" as DataMode, label: "Neue ergänzen", description: "Bestehende Einträge werden aktualisiert, neue aus der CSV hinzugefügt." },
                        { value: "keep" as DataMode, label: "Unverändert lassen", description: "Dokumenteinträge werden nicht verändert." },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                        <Radio name="dataMode" value={opt.value} checked={dataMode === opt.value} onChange={() => setDataMode(opt.value)} className="mt-0.5" />
                        <span>
                          <span className="font-medium text-sm">{opt.label}</span>
                          <span className="block text-xs text-gray-500">{opt.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" color="light" onClick={() => applyCsv()}>
                    Metadaten jetzt anwenden
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button size="sm" color="light" onClick={() => applyCsv()}>
                  Metadaten jetzt anwenden
                </Button>
              </div>
            )}

            {/* Field preview */}
            {fieldsMode !== "keep" && (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Feldname</TableHeadCell>
                    <TableHeadCell>Erkannter Typ</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {parseResult.fields.map((f) => (
                    <TableRow key={f.name}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>
                        <Badge color="gray">{typeOptions[f.type]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Document upload */}
        <div>
          <h3 className="font-semibold mb-2">2. Dokumente (optional)</h3>
          {mixedTypeError && (
            <Alert color="failure" icon={HiExclamationCircle} className="mb-2">
              Die Dateien haben unterschiedliche Typen. Bitte nur PDF, HTML oder Bilder (jeweils nur einen Typ)
              hochladen.
            </Alert>
          )}
          {doctype.mainDocumentType && (
            <p className="text-sm text-gray-600 mb-2">
              Erkannter Typ:{" "}
              <Badge color="gray" className="inline-flex">
                {documentTypeOptions[doctype.mainDocumentType]}
              </Badge>
            </p>
          )}
          <DropZone
            onAdd={(f) => void addDocFiles(f)}
            accept=".pdf,.html,.htm,image/*"
            placeholder="Dokumente hier ablegen oder klicken zum Auswählen (PDF, HTML oder Bilder)"
          />
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              id="ignoreUnknownFiles"
              checked={ignoreUnknownFiles}
              onChange={(e) => setIgnoreUnknownFiles(e.target.checked)}
            />
            <Label htmlFor="ignoreUnknownFiles" className="cursor-pointer">
              Dateien ohne Metadaten-Eintrag ignorieren
            </Label>
          </div>
        </div>

        {/* File status overview */}
        <FileStatusTable
          documents={doctype.documents}
          onRemove={(f, onServer) => void handleDocRemove(f, onServer)}
        />
      </div>

      <hr className="text-gray-300 col-span-3" />
      <div className="col-span-3 flex justify-end">
        <Button onClick={handleWeiter}>
          weiter
        </Button>
      </div>
    </Card>
  );
};

export default ImportPage;
