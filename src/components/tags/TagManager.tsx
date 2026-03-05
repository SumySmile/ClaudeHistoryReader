import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Tag } from '../../lib/api';
import { TagBadge } from './TagBadge';

interface Props {
  tags: Tag[];
  sessionTags: { name: string; color: string }[];
  onAddTag: (tagId: number) => void;
  onRemoveTag: (tagId: number) => void;
  onCreateTag: (name: string, color: string) => Promise<any>;
}

const TAG_COLORS = ['#7ec8a0', '#c878a0', '#5a9ec8', '#d08050', '#48a8b8', '#e06060', '#9878b8', '#48a890'];

export function TagManager({ tags, sessionTags, onAddTag, onRemoveTag, onCreateTag }: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);

  const availableTags = tags.filter(t => !sessionTags.some(st => st.name === t.name));

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const tag = await onCreateTag(newName.trim(), newColor);
    onAddTag(tag.id);
    setNewName('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 flex-wrap">
        {sessionTags.map(tag => {
          const fullTag = tags.find(t => t.name === tag.name);
          return (
            <TagBadge
              key={tag.name}
              name={tag.name}
              color={tag.color}
              onRemove={fullTag ? () => onRemoveTag(fullTag.id) : undefined}
            />
          );
        })}
        <button
          onClick={() => setOpen(!open)}
          className="text-[#9aafa3] hover:text-[#6b8578] transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-[#d0ddd5] rounded-lg shadow-lg z-50 p-3">
          {availableTags.length > 0 && (
            <div className="mb-2 space-y-1">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => { onAddTag(tag.id); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-[#f0f5f2] text-left text-[#3d5248]"
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              ))}
              <hr className="border-[#d0ddd5]" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="New tag..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1 bg-[#f0f5f2] border border-[#d0ddd5] rounded px-2 py-1 text-sm text-[#2d3d34] placeholder-[#9aafa3] focus:outline-none focus:border-[#7ec8a0]"
            />
            <div className="flex gap-1">
              {TAG_COLORS.slice(0, 4).map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-4 h-4 rounded-full ${newColor === c ? 'ring-2 ring-[#2d3d34]' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button onClick={handleCreate} className="text-[#7ec8a0] hover:text-[#65b589]">
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
