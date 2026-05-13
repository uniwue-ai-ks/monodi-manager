import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Badge, Button, TabItem, Tabs } from "flowbite-react";
import { HiExclamationCircle } from "react-icons/hi2";
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
import { documentTypeOptions, type DocumentType } from "~/state";
import type { Route } from "./+types/upload";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Dokumente hinzufügen" },
    { name: "description", content: "Schritt 2: Dokumente hochladen" },
  ];
};

type FilesByDoctype = Record<string, UploadedDocFile[]>;
type TypeByDoctype = Record<string, DocumentType | null>;

export const DocumentUploadPage = () => {
  const navigate = useNavigate();
  const storage = useAppState();
  const doctypeNames = Object.keys(storage.contents.doctypes ?? {});
  const firstDoctype = doctypeNames[0] ?? "";

  const [filesByDoctype, setFilesByDoctype] = useState<FilesByDoctype>(
    () => Object.fromEntries(doctypeNames.map((n) => [n, []])),
  );
  const [typeByDoctype, setTypeByDoctype] = useState<TypeByDoctype>(
    () => Object.fromEntries(doctypeNames.map((n) => [n, null])),
  );
  const [mixedErrors, setMixedErrors] = useState<Record<string, boolean>>({});

  const addFiles = async (doctype: string, newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const allFiles = Array.from(newFiles);
    const detected = detectDocumentType(allFiles);
    if (!detected) {
      setMixedErrors((prev) => ({ ...prev, [doctype]: true }));
      return;
    }
    setMixedErrors((prev) => ({ ...prev, [doctype]: false }));
    const read = await readDocumentFiles(newFiles);
    setFilesByDoctype((prev) => ({
      ...prev,
      [doctype]: mergeDocFiles(prev[doctype] ?? [], read),
    }));
    setTypeByDoctype((prev) => ({ ...prev, [doctype]: detected }));
  };

  const removeFile = (doctype: string, filename: string) => {
    setFilesByDoctype((prev) => {
      const remaining = (prev[doctype] ?? []).filter((f) => f.filename !== filename);
      if (remaining.length === 0) {
        setTypeByDoctype((t) => ({ ...t, [doctype]: null }));
      }
      return { ...prev, [doctype]: remaining };
    });
  };

  const totalFiles = Object.values(filesByDoctype).reduce((sum, arr) => sum + arr.length, 0);

  const handleWeiter = () => {
    const existingDocs = storage.contents.documents ?? [];
    const newMainDocTypes: Record<string, DocumentType> = {};
    let allEntries = [...existingDocs];

    for (const doctype of doctypeNames) {
      const files = filesByDoctype[doctype] ?? [];
      const type = typeByDoctype[doctype];
      if (files.length > 0 && type) {
        newMainDocTypes[doctype] = type;
        allEntries = docFilesToEntries(files, doctype, allEntries);
      }
    }

    storage.patchContents({
      documents: allEntries,
      mainDocumentTypes: {
        ...(storage.contents.mainDocumentTypes ?? {}),
        ...newMainDocTypes,
      },
    });
    navigate(`/doctypeFields/${firstDoctype}`);
  };

  const renderDropZone = (doctype: string) => (
    <div className="space-y-2">
      {mixedErrors[doctype] && (
        <Alert color="failure" icon={HiExclamationCircle}>
          Die Dateien haben unterschiedliche Typen (PDF, HTML und Bilder dürfen nicht gemischt
          werden). Bitte nur einen Typ hochladen.
        </Alert>
      )}
      {typeByDoctype[doctype] && (
        <p className="text-sm text-gray-600">
          Erkannter Typ:{" "}
          <Badge color="gray" className="inline-flex">
            {documentTypeOptions[typeByDoctype[doctype]!]}
          </Badge>
        </p>
      )}
      <DropZone
        files={(filesByDoctype[doctype] ?? []).map((f) => f.filename)}
        onAdd={(f) => void addFiles(doctype, f)}
        onRemove={(name) => removeFile(doctype, name)}
        accept=".pdf,.html,.htm,image/*"
        placeholder="Dokumente hier ablegen oder klicken zum Auswählen (PDF, HTML oder Bilder)"
      />
    </div>
  );

  return (
    <Card className="max-w-200 pb-4 grid grid-cols-3 gap-4">
      <div className="col-span-3 space-y-4">
        <CardTitle>Dokumente hinzufügen</CardTitle>
        <p>
          Wählen Sie die Dokumente aus, die zu den Einträgen gehören. Es werden PDF-Dateien,
          HTML-Dateien und Bilder unterstützt. Alle Dokumente eines Typs müssen vom gleichen
          Format sein (verschiedene Bildformate sind erlaubt).
        </p>

        {doctypeNames.length <= 1 ? (
          renderDropZone(firstDoctype)
        ) : (
          <Tabs>
            {doctypeNames.map((name) => (
              <TabItem
                key={name}
                title={`${name} (${(filesByDoctype[name] ?? []).length})`}
              >
                {renderDropZone(name)}
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
        onClick={() => navigate(`/doctypeFields/${firstDoctype}`)}
      >
        überspringen
      </Button>
      <Button className="col-start-3" disabled={totalFiles === 0} onClick={handleWeiter}>
        weiter
      </Button>
    </Card>
  );
};

export default DocumentUploadPage;

