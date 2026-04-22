import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, TabItem, Tabs } from "flowbite-react";
import { Card, CardTitle } from "~/components/card";
import { DropZone } from "~/components/DropZone";
import { useAppState } from "~/utils/flowStorage";
import {
  collectPdfNames,
  createPdfNamesByDoctype,
  mergePdfNames,
  type PdfNamesByDoctype,
} from "~/utils/pdfUploads";
import type { Route } from "./+types/upload";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "PDF-Dateien hinzufügen" },
    { name: "description", content: "Schritt 3: PDF-Dateien hochladen" },
  ];
}

export const PdfUploadPage = () => {
  const navigate = useNavigate();
  const storage = useAppState();
  const doctypeNames = Object.keys(storage.contents.doctypes ?? {});

  const [filesByDoctype, setFilesByDoctype] = useState<PdfNamesByDoctype>(
    () => createPdfNamesByDoctype(doctypeNames),
  );

  const addFiles = async (doctype: string, newFiles: FileList | null) => {
    const pdfNames = await collectPdfNames(doctype, newFiles);
    if (pdfNames.length === 0) return;

    setFilesByDoctype((prev) => {
      const next = { ...prev };
      next[doctype] = mergePdfNames(prev[doctype] ?? [], pdfNames);
      return next;
    });
  };

  const removeFile = (doctype: string, name: string) => {
    setFilesByDoctype((prev) => ({
      ...prev,
      [doctype]: (prev[doctype] ?? []).filter((filename) => filename !== name),
    }));
  };

  const totalFiles = Object.values(filesByDoctype).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Card className="max-w-200 pb-4 grid grid-cols-3 gap-4">
      <div className="col-span-3 space-y-4">
        <CardTitle>PDF-Dateien hinzufügen</CardTitle>
        <p>
          Wählen Sie PDF-Dateien aus, damit ihre Dateinamen in den folgenden Schritten
          verwendet werden. Die PDF-Inhalte werden aktuell nicht gespeichert.
        </p>

        {doctypeNames.length <= 1 ? (
          <DropZone
            files={filesByDoctype[doctypeNames[0]] ?? []}
            onAdd={(f) => {
              void addFiles(doctypeNames[0], f);
            }}
            onRemove={(name) => removeFile(doctypeNames[0], name)}
            accept="application/pdf"
            placeholder="PDF-Dateien hier ablegen oder klicken zum Auswählen"
          />
        ) : (
          <Tabs>
            {doctypeNames.map((name) => (
              <TabItem key={name} title={`${name} (${(filesByDoctype[name] ?? []).length})`}>
                <DropZone
                  files={filesByDoctype[name] ?? []}
                  onAdd={(f) => {
                    void addFiles(name, f);
                  }}
                  onRemove={(fname) => removeFile(name, fname)}
                  accept="application/pdf"
                  placeholder="PDF-Dateien hier ablegen oder klicken zum Auswählen"
                />
              </TabItem>
            ))}
          </Tabs>
        )}
      </div>

      <hr className="text-gray-300 col-span-3" />
      <Button color="light" onClick={() => navigate(-1)}>
        zurück
      </Button>
      <Button
        color="light"
        className="col-start-2"
        onClick={() => navigate("/enterData", { state: { uploadSkipped: true } })}
      >
        überspringen
      </Button>
      <Button
        className="col-start-3"
        disabled={totalFiles === 0}
        onClick={() => navigate("/enterData", { state: { filesByDoctype } })}
      >
        weiter
      </Button>
    </Card>
  );
}

export default PdfUploadPage;
