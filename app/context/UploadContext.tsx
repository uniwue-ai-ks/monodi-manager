import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { uploadFilesToBackend } from "~/utils/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadTaskStatus = "uploading" | "done" | "error";

export type UploadTask = {
  id: string;
  filenames: string[];
  /** Bytes uploaded so far. */
  loaded: number;
  /** Total bytes to upload. */
  total: number;
  status: UploadTaskStatus;
  error?: string;
};

type UploadContextValue = {
  tasks: UploadTask[];
  /** Queue a batch of files for upload. */
  queueUpload: (files: File[]) => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UploadContext = createContext<UploadContextValue | null>(null);

let nextId = 0;
function makeId(): string {
  return `upload-${++nextId}`;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  // Track dismiss timers keyed by task id so we can cancel them
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }, []);

  const scheduleDismiss = useCallback((id: string, delayMs = 3000) => {
    const timer = setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      dismissTimers.current.delete(id);
    }, delayMs);
    dismissTimers.current.set(id, timer);
  }, []);

  // Clean up any pending timers on unmount
  useEffect(() => {
    const timers = dismissTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  const queueUpload = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      const id = makeId();
      const filenames = files.map((f) => f.name);
      const task: UploadTask = {
        id,
        filenames,
        loaded: 0,
        total: 0,
        status: "uploading",
      };

      setTasks((prev) => [...prev, task]);

      uploadFilesToBackend(files, (loaded, total) => {
        updateTask(id, { loaded, total });
      })
        .then(() => {
          updateTask(id, { status: "done", loaded: 1, total: 1 });
          scheduleDismiss(id);
        })
        .catch((err: unknown) => {
          updateTask(id, {
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          });
          // Keep error visible longer
          scheduleDismiss(id, 8000);
        });
    },
    [updateTask, scheduleDismiss],
  );

  return (
    <UploadContext.Provider value={{ tasks, queueUpload }}>
      {children}
    </UploadContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUploadQueue(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) {
    throw new Error("useUploadQueue must be used inside <UploadProvider>");
  }
  return ctx;
}
