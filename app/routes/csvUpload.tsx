import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Badge, Button, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { HiExclamationCircle } from "react-icons/hi2";
import { Card, CardTitle } from "~/components/card";
import { DropZone } from "~/components/DropZone";
import { useAppState } from "~/utils/flowStorage";
import { collectPdfNames, mergePdfNames } from "~/utils/pdfUploads";
import {
  inferSchemaFromCsv,
  csvSchemaErrorMessage,
  type CsvSchemaResult,
} from "~/utils/csvSchemaInfer";
import { typeOptions } from "~/state";
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
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);

  const handleCsvUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = inferSchemaFromCsv(text, DEFAULT_DOCTYPE);
      if (result.ok) {
        setParseResult(result.result);
        setParseError(null);
        setCsvFilename(file.name);
      } else {
        setParseResult(null);
        setParseError(csvSchemaErrorMessage(result.error));
        setCsvFilename(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvRemove = () => {
    setCsvFilename(null);
    setParseResult(null);
    setParseError(null);
  };

  const addPdfFiles = async (files: FileList | null) => {
    const names = await collectPdfNames(DEFAULT_DOCTYPE, files);
    if (names.length === 0) return;
    setPdfFiles((prev) => mergePdfNames(prev, names));
  };

  const removePdfFile = (name: string) => {
    setPdfFiles((prev) => prev.filter((f) => f !== name));
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

    storage.patchContents({
      doctypes: { [DEFAULT_DOCTYPE]: parseResult.fields },
      documents: parseResult.documents,
      workflow: "csv",
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
          <Alert color="failure" icon={HiExclamationCircle}>
            {parseError}
          </Alert>
        )}

        {parseResult && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>{parseResult.documents.length}</strong> Zeilen erkannt · Dateiname-Spalte:{" "}
              <code>{parseResult.filenameColumnName}</code>
            </p>
            <Table>
              <TableHead>
                <TableHeadCell>Feldname</TableHeadCell>
                <TableHeadCell>Erkannter Typ</TableHeadCell>
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
          <h3 className="font-semibold mb-2">2. PDF-Dateien (optional)</h3>
          <DropZone
            files={pdfFiles}
            onAdd={(f) => void addPdfFiles(f)}
            onRemove={removePdfFile}
            accept="application/pdf"
            placeholder="PDF-Dateien hier ablegen oder klicken zum Auswählen"
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
