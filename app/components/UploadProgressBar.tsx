import { useUploadQueue, type UploadTask } from "~/context/UploadContext";

function taskProgress(task: UploadTask): number {
  if (task.status === "done") return 100;
  if (task.total === 0) return 0;
  return Math.round((task.loaded / task.total) * 100);
}

function aggregateProgress(tasks: UploadTask[]): number {
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((sum, t) => sum + t.total, 0);
  const loaded = tasks.reduce((sum, t) => sum + t.loaded, 0);
  if (total === 0) return 0;
  return Math.round((loaded / total) * 100);
}

export const UploadProgressBar = () => {
  const { tasks } = useUploadQueue();

  if (tasks.length === 0) return null;

  const uploading = tasks.filter((t) => t.status === "uploading");
  const errors = tasks.filter((t) => t.status === "error");
  const done = tasks.filter((t) => t.status === "done");

  const progress = aggregateProgress(tasks);
  const totalFiles = tasks.reduce((n, t) => n + t.filenames.length, 0);

  let statusText: string;
  let barColor: string;

  if (errors.length > 0) {
    statusText = errors.map((t) => t.error ?? "Unbekannter Fehler").join(" · ");
    barColor = "bg-red-500";
  } else if (uploading.length > 0) {
    statusText = `${totalFiles} Datei${totalFiles !== 1 ? "en" : ""} wird${totalFiles !== 1 ? " werden" : ""} hochgeladen … ${progress} %`;
    barColor = "bg-blue-500";
  } else {
    const n = done.reduce((sum, t) => sum + t.filenames.length, 0);
    statusText = `${n} Datei${n !== 1 ? "en" : ""} erfolgreich hochgeladen`;
    barColor = "bg-green-500";
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
      role="status"
      aria-live="polite"
    >
      {/* Progress fill */}
      <div className="h-1 w-full bg-gray-100">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2 text-sm">
        {/* Spinner for active uploads */}
        {uploading.length > 0 && (
          <svg
            className="animate-spin h-4 w-4 text-blue-500 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}

        <span
          className={
            errors.length > 0
              ? "text-red-600"
              : uploading.length > 0
                ? "text-gray-700"
                : "text-green-700"
          }
        >
          {statusText}
        </span>

        {/* Per-task breakdown when there are multiple tasks or errors */}
        {tasks.length > 1 && (
          <span className="text-gray-400 text-xs ml-auto">
            {tasks.map((t) => `${t.filenames.join(", ")}: ${taskProgress(t)} %`).join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
};
