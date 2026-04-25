"use client";

export type FilterType = 'all' | 'images' | 'videos' | 'audio' | 'documents';
export type FilterSize = 'lt1mb' | '1to10mb' | 'gt10mb' | null;
export type FilterDate = 'today' | 'last7' | 'last30' | null;

export type ExplorerFilters = {
  type: FilterType;
  size: FilterSize;
  date: FilterDate;
};

interface FiltersPanelProps {
  filters: ExplorerFilters;
  onChange: (next: ExplorerFilters) => void;
}

export function FiltersPanel({ filters, onChange }: FiltersPanelProps) {
  const hasActiveFilters = filters.type !== 'all' || filters.size !== null || filters.date !== null;

  return (
    <section className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => onChange({ ...filters, type: e.target.value as FilterType })}
            className="text-sm px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200"
          >
            <option value="all">All</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
            <option value="audio">Audio</option>
            <option value="documents">Documents</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Size</label>
          <select
            value={filters.size ?? ''}
            onChange={(e) => onChange({ ...filters, size: (e.target.value || null) as FilterSize })}
            className="text-sm px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200"
          >
            <option value="">Any</option>
            <option value="lt1mb">&lt; 1MB</option>
            <option value="1to10mb">1MB – 10MB</option>
            <option value="gt10mb">&gt; 10MB</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
          <select
            value={filters.date ?? ''}
            onChange={(e) => onChange({ ...filters, date: (e.target.value || null) as FilterDate })}
            className="text-sm px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200"
          >
            <option value="">Any</option>
            <option value="today">Today</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onChange({ type: 'all', size: null, date: null })}
          disabled={!hasActiveFilters}
          className="self-end mb-0.5 px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
