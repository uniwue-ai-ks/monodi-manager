import { Alert, Button } from "flowbite-react";
import { HiExclamationCircle, HiExclamationTriangle } from "react-icons/hi2";
import type { ImportErrors, ImportWarnings } from "~/utils/csvImportExport";

export type ImportAlertsProps = {
  errors: ImportErrors;
  warnings: ImportWarnings;
  showErrorsOnly: boolean;
  onToggleFilter: () => void;
};

export const ImportAlerts = ({ errors, warnings, showErrorsOnly, onToggleFilter }: ImportAlertsProps) => {
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
            Diese Dateinamen werden für den RDF-Export verwendet, sind aber nicht in der
            aktuellen Upload-Liste enthalten.
          </p>
        </Alert>
      )}
    </div>
  );
};
