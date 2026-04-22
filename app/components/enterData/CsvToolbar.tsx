import { useRef } from "react";
import { Button } from "flowbite-react";

export type CsvToolbarProps = {
  onExport: () => void;
  onImport: (file: File) => void;
};

export const CsvToolbar = ({ onExport, onImport }: CsvToolbarProps) => {
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
