import { useState } from 'react';
import { useConversations } from '../hooks/useConversations';
import { ConversationList } from '../components/conversations/ConversationList';
import { FilterBar } from '../components/conversations/FilterBar';
import { ConversationListSkeleton } from '../components/shared/Skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Filters {
  project?: string;
  favorite?: string;
  tag?: string;
  search?: string;
  sort?: string;
  order?: string;
  model?: string;
  min_tokens?: string;
  max_tokens?: string;
}

export function HomePage() {
  const [filters, setFilters] = useState<Filters>({});
  const { data, loading, error, page, setPage, toggleFavorite } = useConversations(filters);
  const handleSelectProject = (projectSlug: string) => {
    setPage(1);
    setFilters(prev => ({ ...prev, project: projectSlug }));
  };

  return (
    <div className="h-full flex flex-col">
      <FilterBar filters={filters} onChange={setFilters} />

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <ConversationListSkeleton count={8} />
        ) : data ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[#9aafa3]">
                {data.pagination.total} conversations
              </span>
            </div>
            <ConversationList
              sessions={data.sessions}
              onToggleFavorite={toggleFavorite}
              onSelectProject={handleSelectProject}
            />
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6 pb-4">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg bg-white border border-[#d0ddd5] text-[#6b8578] disabled:opacity-30 hover:bg-[#edf5f0] shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-[#6b8578]">
                  {page} / {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.pagination.totalPages}
                  className="p-2 rounded-lg bg-white border border-[#d0ddd5] text-[#6b8578] disabled:opacity-30 hover:bg-[#edf5f0] shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
