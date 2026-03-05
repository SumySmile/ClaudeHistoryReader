import { useState, useEffect } from 'react';
import { Search, Star } from 'lucide-react';
import { getProjects, getModels } from '../../lib/api';
import type { Project } from '../../lib/api';

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

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const TOKEN_RANGES = [
  { label: 'All Sizes', min: undefined, max: undefined },
  { label: '<1K tokens', min: undefined, max: '1000' },
  { label: '1K–10K', min: '1000', max: '10000' },
  { label: '10K–100K', min: '10000', max: '100000' },
  { label: '100K+', min: '100000', max: undefined },
];

function getTokenRangeKey(min?: string, max?: string) {
  return `${min ?? ''}:${max ?? ''}`;
}

function currentTokenRangeKey(filters: Filters) {
  return getTokenRangeKey(filters.min_tokens, filters.max_tokens);
}

export function FilterBar({ filters, onChange }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [models, setModels] = useState<{ model: string; count: number }[]>([]);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
    getModels().then(setModels).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filters, search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleTokenRange = (min?: string, max?: string) => {
    const { min_tokens: _a, max_tokens: _b, ...rest } = filters;
    onChange({ ...rest, ...(min ? { min_tokens: min } : {}), ...(max ? { max_tokens: max } : {}) });
  };

  const currentRange = TOKEN_RANGES.find(
    r => getTokenRangeKey(r.min, r.max) === currentTokenRangeKey(filters)
  ) || TOKEN_RANGES[0];

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#d0ddd5] flex-wrap">
      <div className="relative flex-1 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aafa3]" />
        <input
          type="text"
          placeholder="Filter conversations..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full bg-[#f0f5f2] border border-[#d0ddd5] rounded-lg pl-10 pr-4 py-2 text-sm text-[#2d3d34] placeholder-[#9aafa3] focus:outline-none focus:border-[#7ec8a0] focus:ring-1 focus:ring-[#7ec8a0]/30"
        />
      </div>

      <select
        value={filters.project || ''}
        onChange={e => onChange({ ...filters, project: e.target.value || undefined })}
        className="bg-[#f0f5f2] border border-[#d0ddd5] rounded-lg px-3 py-2 text-sm text-[#2d3d34] focus:outline-none focus:border-[#7ec8a0]"
      >
        <option value="">All Projects</option>
        {projects.map(p => (
          <option key={p.project_slug} value={p.project_slug}>
            {p.project_slug.replace(/--/g, '/').split('/').pop()} ({p.session_count})
          </option>
        ))}
      </select>

      {models.length > 1 && (
        <select
          value={filters.model || ''}
          onChange={e => onChange({ ...filters, model: e.target.value || undefined })}
          className="bg-[#f0f5f2] border border-[#d0ddd5] rounded-lg px-3 py-2 text-sm text-[#2d3d34] focus:outline-none focus:border-[#7ec8a0]"
        >
          <option value="">All Models</option>
          {models.map(m => (
            <option key={m.model} value={m.model}>
              {m.model.replace('claude-', '').split('-').slice(0, 2).join('-')} ({m.count})
            </option>
          ))}
        </select>
      )}

      <select
        value={getTokenRangeKey(currentRange.min, currentRange.max)}
        onChange={e => {
          const r = TOKEN_RANGES.find(r => getTokenRangeKey(r.min, r.max) === e.target.value);
          if (r) handleTokenRange(r.min, r.max);
        }}
        className="bg-[#f0f5f2] border border-[#d0ddd5] rounded-lg px-3 py-2 text-sm text-[#2d3d34] focus:outline-none focus:border-[#7ec8a0]"
      >
        {TOKEN_RANGES.map(r => (
          <option key={getTokenRangeKey(r.min, r.max)} value={getTokenRangeKey(r.min, r.max)}>
            {r.label}
          </option>
        ))}
      </select>

      <select
        value={`${filters.sort || 'modified_at'}:${filters.order || 'desc'}`}
        onChange={e => {
          const [sort, order] = e.target.value.split(':');
          onChange({ ...filters, sort, order });
        }}
        className="bg-[#f0f5f2] border border-[#d0ddd5] rounded-lg px-3 py-2 text-sm text-[#2d3d34] focus:outline-none focus:border-[#7ec8a0]"
      >
        <option value="modified_at:desc">Latest</option>
        <option value="modified_at:asc">Oldest</option>
        <option value="created_at:desc">Created (newest)</option>
        <option value="message_count:desc">Most messages</option>
      </select>

      <button
        onClick={() => onChange({ ...filters, favorite: filters.favorite ? undefined : '1' })}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
          filters.favorite
            ? 'bg-yellow-50 border-yellow-300 text-yellow-600'
            : 'bg-[#f0f5f2] border-[#d0ddd5] text-[#6b8578] hover:text-yellow-500'
        }`}
      >
        <Star size={14} fill={filters.favorite ? 'currentColor' : 'none'} />
        Favorites
      </button>
    </div>
  );
}
