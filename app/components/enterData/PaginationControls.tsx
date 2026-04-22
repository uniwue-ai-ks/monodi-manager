import { Button } from "flowbite-react";

const PAGE_SIZE = 100;

export type PaginationControlsProps = {
  page: number;
  totalPages: number;
  totalRows: number;
  onPage: (p: number) => void;
};

export const PaginationControls = ({ page, totalPages, totalRows, onPage }: PaginationControlsProps) => {
  if (totalPages <= 1) return null;
  const start = page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, totalRows);
  return (
    <div className="flex items-center justify-between mt-3">
      <Button size="xs" color="light" disabled={page === 0} onClick={() => onPage(page - 1)}>
        ← Zurück
      </Button>
      <span className="text-sm text-gray-600">
        {start}–{end} von {totalRows} · Seite {page + 1} von {totalPages}
      </span>
      <Button size="xs" color="light" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
        Weiter →
      </Button>
    </div>
  );
};
