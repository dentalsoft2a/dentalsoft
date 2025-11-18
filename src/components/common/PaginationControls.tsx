import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onGoToPage: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  startIndex,
  endIndex,
  hasNextPage,
  hasPrevPage,
  onNextPage,
  onPrevPage,
  onGoToPage,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100]
}: PaginationControlsProps) {
  if (totalItems === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-slate-500">
        Aucun élément à afficher
      </div>
    );
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 bg-white border-t border-slate-200">
      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span>
          Affichage <span className="font-semibold text-slate-900">{startIndex + 1}</span> à{' '}
          <span className="font-semibold text-slate-900">{endIndex}</span> sur{' '}
          <span className="font-semibold text-slate-900">{totalItems}</span> éléments
        </span>

        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-slate-600">
            Par page:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onGoToPage(1)}
          disabled={!hasPrevPage}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Première page"
        >
          <ChevronsLeft className="w-4 h-4 text-slate-600" />
        </button>

        <button
          onClick={onPrevPage}
          disabled={!hasPrevPage}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Page précédente"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <button
                key={index}
                onClick={() => onGoToPage(page)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-sky-500 text-white'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={index} className="px-2 text-slate-400">
                {page}
              </span>
            )
          ))}
        </div>

        <button
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Page suivante"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        <button
          onClick={() => onGoToPage(totalPages)}
          disabled={!hasNextPage}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Dernière page"
        >
          <ChevronsRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}
