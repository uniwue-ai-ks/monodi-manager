import { useCallback, useRef, useState, type DragEvent } from "react";

export type DropZoneProps = {
  onAdd: (newFiles: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
  placeholder?: string;
};

export const DropZone = ({ onAdd, accept, multiple = true, placeholder }: DropZoneProps) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      onAdd(e.dataTransfer.files);
    },
    [onAdd],
  );

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors select-none ${
        dragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
      }`}
    >
      <p className="text-gray-500">
        {placeholder ?? "Dateien hier ablegen oder klicken zum Auswählen"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
};
