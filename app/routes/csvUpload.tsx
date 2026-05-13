import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Badge, Button, Checkbox, Label, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { HiExclamationCircle, HiExclamationTriangle } from "react-icons/hi2";
import { Card, CardTitle } from "~/components/card";
import { DropZone } from "~/components/DropZone";
import { useAppState } from "~/utils/flowStorage";
import {
  detectDocumentType,
  readDocumentFiles,
  mergeDocFiles,
  docFilesToEntries,
  type UploadedDocFile,
} from "~/utils/documentUploads";
import {
  inferSchemaFromCsv,
  csvSchemaErrorMessage,
  type CsvSchemaResult,
} from "~/utils/csvSchemaInfer";
import { documentTypeOptions, typeOptions } from "~/state";
import type { DocumentType } from "~/state";
import type { Route } from "./+types/csvUpload";

const DEFAULT_DOCTYPE = "Dokument";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "CSV hochladen" },
    { name: "description", content: "Felder aus CSV-Datei ableiten" },
  ];
};

export const CsvUploadPage = () => {
  const navigate = useNavigate();
  const storage = useAppState();

  const [csvFilename, setCsvFilename] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<CsvSchemaResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [docFiles, setDocFiles] = useState<UploadedDocFile[]>([]);
  const [detectedDocType, setDetectedDocType] = useState<DocumentType | null>(null);
  const [mixedTypeError, setMixedTypeError] = useState(false);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);

  const parseCsv = (text: string, ignore: boolean) => {
    const result = inferSchemaFromCsv(text, DEFAULT_DOCTYPE, { ignoreDuplicateFilenames: ignore });
    if (result.ok) {
      setParseResult(result.result);
      setParseError(null);
    } else {
      setParseResult(null);
      setParseError(csvSchemaErrorMessage(result.error));
    }
  };

  const [lastCsvText, setLastCsvText] = useState<string | null>(null);

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
    reader.onerror = () => {
      setParseError("Datei konnte nicht gelesen werden.");
    };
    reader.readAsText(file);
  };

  const handleCsvRemove = () => {
    setCsvFilename(null);
    setParseResult(null);
    setParseError(null);
    setLastCsvText(null);
  };

  const addDocFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const detected = detectDocumentType(Array.from(files));
    if (!detected) {
      setMixedTypeError(true);
      return;
    }
    setMixedTypeError(false);
    const read = await readDocumentFiles(files);
    if (read.length === 0) return;
    setDocFiles((prev) => mergeDocFiles(prev, read));
    setDetectedDocType(detected);
  };

  const removeDocFile = (name: string) => {
    setDocFiles((prev) => {
      const remaining = prev.filter((f) => f.filename !== name);
      if (remaining.length === 0) setDetectedDocType(null);
      return remaining;
    });
  };

  const hasExistingData =
    (storage.contents.documents?.length ?? 0) > 0 ||
    Object.values(storage.contents.doctypes ?? {}).some((f) => f.length > 0);

  const handleWeiter = () => {
    if (!parseResult) return;

    if (
      hasExistingData &&
      !window.confirm(
        "Es sind bereits Daten vorhanden. Wenn Sie fortfahren, werden diese überschrieben. Möchten Sie wirklich fortfahren?"
      )
    ) {
      return;
    }

    // Merge doc file content into the document entries from the CSV
    const csvDocs = parseResult.documents;
    const mergedDocs = docFiles.length > 0
      ? docFilesToEntries(docFiles, DEFAULT_DOCTYPE, csvDocs)
      : csvDocs;

    // Fill in any CSV documents that weren't matched by an uploaded file
    const uploadedFilenames = new Set(docFiles.map((f) => f.filename));
    const finalDocs = csvDocs.map((csvDoc) => {
      if (uploadedFilenames.has(csvDoc.filename)) {
        return mergedDocs.find((d) => d.filename === csvDoc.filename) ?? csvDoc;
      }
      return csvDoc;
    });

    storage.patchContents({
      doctypes: { [DEFAULT_DOCTYPE]: parseResult.fields },
      documents: finalDocs,
      workflow: "csv",
      ...(detectedDocType
        ? { mainDocumentTypes: { [DEFAULT_DOCTYPE]: detectedDocType } }
        : {}),
    });
    navigate(`/doctypeFields/${DEFAULT_DOCTYPE}`);
  };

  return (
    <Card className="max-w-200 pb-4 grid grid-cols-3 gap-4">
      <div className="col-span-3 space-y-4">
        <CardTitle>CSV-Datei hochladen</CardTitle>
        <p>
          Laden Sie eine CSV-Datei hoch. Die Spaltenköpfe werden als Felder übernommen, und der
          Feldtyp wird automatisch aus den Inhalten abgeleitet. Eine Spalte muss den Namen{" "}
          <code>filename</code>, <code>dateiname</code>, <code>index</code> oder <code>key</code>{" "}
          tragen und enthält den Dateinamen des jeweiligen Dokuments.
        </p>

        <div>
          <h3 className="font-semibold mb-2">1. CSV-Datei (erforderlich)</h3>
          <DropZone
            files={csvFilename ? [csvFilename] : []}
            onAdd={handleCsvUpload}
            onRemove={handleCsvRemove}
            accept=".csv,text/csv"
            multiple={false}
            placeholder="CSV-Datei hier ablegen oder klicken zum Auswählen"
          />
        </div>

        {parseError && (
          <>
            <Alert color="failure" icon={HiExclamationCircle}>
              {parseError}
            </Alert>
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
          <div className="space-y-2">
            {parseResult.ignoredDuplicateFilenames && parseResult.ignoredDuplicateFilenames.length > 0 && (
              <Alert color="warning" icon={HiExclamationTriangle}>
                <strong>{parseResult.ignoredDuplicateFilenames.length} doppelte {parseResult.ignoredDuplicateFilenames.length === 1 ? "Dateiname wurde" : "Dateinamen wurden"} ignoriert</strong>
                {" "}– nur die erste Zeile je Dateiname wird verwendet:{" "}
                {parseResult.ignoredDuplicateFilenames.slice(0, 5).map((f) => `"${f}"`).join(", ")}
                {parseResult.ignoredDuplicateFilenames.length > 5 && ` (und ${parseResult.ignoredDuplicateFilenames.length - 5} weitere)`}.
              </Alert>
            )}
            <p className="text-sm text-gray-600">
              <strong>{parseResult.documents.length}</strong> Zeilen erkannt · Dateiname-Spalte:{" "}
              <code>{parseResult.filenameColumnName}</code>
            </p>
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
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-2">2. Dokumente (optional)</h3>
          {mixedTypeError && (
            <Alert color="failure" icon={HiExclamationCircle} className="mb-2">
              Die Dateien haben unterschiedliche Typen. Bitte nur PDF, HTML oder Bilder (jeweils nur einen Typ) hochladen.
            </Alert>
          )}
          {detectedDocType && (
            <p className="text-sm text-gray-600 mb-2">
              Erkannter Typ:{" "}
              <Badge color="gray" className="inline-flex">
                {documentTypeOptions[detectedDocType]}
              </Badge>
            </p>
          )}
          <DropZone
            files={docFiles.map((f) => f.filename)}
            onAdd={(f) => void addDocFiles(f)}
            onRemove={removeDocFile}
            accept=".pdf,.html,.htm,image/*"
            placeholder="Dokumente hier ablegen oder klicken zum Auswählen (PDF, HTML oder Bilder)"
          />
        </div>
      </div>

      <hr className="text-gray-300 col-span-3" />
      <Button color="light" onClick={() => navigate("/")}>
        zurück
      </Button>
      <Button
        className="col-start-3"
        disabled={!parseResult}
        onClick={handleWeiter}
      >
        weiter
      </Button>
    </Card>
  );
};

export default CsvUploadPage;

