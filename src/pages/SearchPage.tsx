import { useSearch } from '../hooks/useSearch';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchResultSkeleton } from '../components/shared/Skeleton';

export function SearchPage() {
  const { query, updateQuery, results, total, loading, indexingStatus, page, totalPages, goToPage, error } = useSearch();

  const grouped = new Map<string, typeof results>();
  for (const r of results) {
    if (!grouped.has(r.session_id)) grouped.set(r.session_id, []);
    grouped.get(r.session_id)!.push(r);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-[#d0ddd5] px-4 py-4 shadow-sm">
        <div className="relative max-w-2xl mx-auto">
          <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aafa3]" />
          <input
            type="text"
            placeholder="Search all conversations... (Ctrl+K)"
            value={query}
            onChange={e => updateQuery(e.target.value)}
            autoFocus
            className="w-full bg-[#f0f5f2] border border-[#d0ddd5] rounded-xl pl-12 pr-4 py-3 text-[#2d3d34] placeholder-[#9aafa3] focus:outline-none focus:border-[#7ec8a0] focus:ring-2 focus:ring-[#7ec8a0]/20 text-lg"
          />
        </div>
        {indexingStatus && (
          <div className="max-w-2xl mx-auto mt-2 flex items-center gap-2 text-xs text-[#9aafa3]">
            <Database size={12} />
            {indexingStatus.isIndexing
              ? `Indexing... ${indexingStatus.indexed}/${indexingStatus.total} sessions`
              : `${indexingStatus.indexed}/${indexingStatus.total} sessions indexed`
            }
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <div className="max-w-3xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
        {loading ? (
          <SearchResultSkeleton />
        ) : query && results.length === 0 ? (
          <div className="text-center py-20 text-[#9aafa3]">
            <p className="text-lg">No results found</p>
            <p className="text-sm mt-1">Try different keywords</p>
          </div>
        ) : query ? (
          <>
            <p className="text-sm text-[#9aafa3] mb-4">{total} results in {grouped.size} conversations</p>
            <div className="space-y-4 max-w-3xl">
              {Array.from(grouped.entries()).map(([sessionId, hits]) => (
                <div key={sessionId} className="bg-white rounded-lg border border-[#d0ddd5] overflow-hidden shadow-sm">
                  <Link
                    to={`/conversation/${sessionId}`}
                    className="block px-4 py-2 bg-[#e8f0eb] hover:bg-[#dce9e0] transition-colors"
                  >
                    <div className="font-medium text-sm text-[#2d3d34] truncate">
                      {hits[0].summary || hits[0].first_prompt?.slice(0, 80) || sessionId}
                    </div>
                    <div className="text-xs text-[#9aafa3] mt-0.5">
                      {hits[0].project_slug} &middot; {hits.length} matches
                    </div>
                  </Link>
                  <div className="divide-y divide-[#d0ddd5]">
                    {hits.slice(0, 5).map((hit, i) => (
                      <div key={i} className="px-4 py-2 text-sm">
                        <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${
                          hit.role === 'user' ? 'bg-[#e8f0eb] text-[#6b8578]' : 'bg-[#7ec8a0]/15 text-[#4da87a]'
                        }`}>
                          {hit.role}
                        </span>
                        <span
                          className="text-[#3d5248]"
                          dangerouslySetInnerHTML={{ __html: hit.snippet }}
                        />
                      </div>
                    ))}
                    {hits.length > 5 && (
                      <div className="px-4 py-1.5 text-xs text-[#9aafa3]">
                        +{hits.length - 5} more matches
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6 pb-4">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg bg-white border border-[#d0ddd5] text-[#6b8578] disabled:opacity-30 hover:bg-[#edf5f0] shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-[#6b8578]">{page} / {totalPages}</span>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg bg-white border border-[#d0ddd5] text-[#6b8578] disabled:opacity-30 hover:bg-[#edf5f0] shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-[#9aafa3]">
            <SearchIcon size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">Full-text search across all conversations</p>
            <p className="text-sm mt-1">Search messages, code, tool calls, and more</p>
          </div>
        )}
      </div>
    </div>
  );
}
