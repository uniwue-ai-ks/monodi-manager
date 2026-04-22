import { useCallback, useRef, useState, type DragEvent } from "react";

export type DropZoneProps = {
  files: string[];
  onAdd: (newFiles: FileList | null) => void;
  onRemove: (name: string) => void;
  accept?: string;
  multiple?: boolean;
  placeholder?: string;
};

export const DropZone = ({ files, onAdd, onRemove, accept, multiple = true, placeholder }: DropZoneProps) => {
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
    <div className="space-y-3">
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

      {files.length > 0 && (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {files.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
            >
              <span className="text-sm truncate">{name}</span>
              <button
                type="button"
                aria-label={`${name} entfernen`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(name);
                }}
                className="text-red-500 hover:text-red-700 ml-2 text-sm font-bold shrink-0"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
