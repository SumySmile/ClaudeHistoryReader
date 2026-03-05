import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSessionDetail } from '../hooks/useConversations';
import { useTags } from '../hooks/useTags';
import { MessageList } from '../components/detail/MessageList';
import { TagManager } from '../components/tags/TagManager';
import { ArrowLeft, Download, Star, Clock, MessageSquare, Wrench, Pencil, Check, X } from 'lucide-react';
import { MessageListSkeleton } from '../components/shared/Skeleton';
import { formatDate, formatTokens, sessionTitle } from '../lib/utils';
import { toggleFavorite, exportSession, updateSessionTitle, getLocalCustomTitle } from '../lib/api';
import { useState, useEffect, useCallback } from 'react';

export function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useSessionDetail(id);
  const { tags, create: createTag, addToSession, removeFromSession, reload: reloadTags } = useTags();
  const [isFav, setIsFav] = useState<boolean | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleToggleFav = useCallback(async () => {
    if (!id) return;
    const result = await toggleFavorite(id);
    setIsFav(!!result.is_favorite);
  }, [id]);

  const handleAddTag = useCallback(async (tagId: number) => {
    if (!id) return;
    await addToSession(id, tagId);
    reloadTags();
  }, [id, addToSession, reloadTags]);

  const handleRemoveTag = useCallback(async (tagId: number) => {
    if (!id) return;
    await removeFromSession(id, tagId);
    reloadTags();
  }, [id, removeFromSession, reloadTags]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
      if (isEditing) return;

      if (e.key === 'Escape') {
        navigate(-1);
      } else if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        handleToggleFav();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, handleToggleFav]);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-[#d0ddd5] px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 animate-pulse bg-[#e8f0eb] rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 animate-pulse bg-[#e8f0eb] rounded" />
              <div className="h-3 w-1/2 animate-pulse bg-[#e8f0eb] rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <MessageListSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#9aafa3]">
        <p className="text-lg">Failed to load conversation</p>
        <p className="text-sm mt-1">{error}</p>
        <Link to="/" className="mt-4 text-[#7ec8a0] hover:text-[#65b589]">Back to list</Link>
      </div>
    );
  }

  const { session, messages, subagents } = data;
  const favorite = isFav !== null ? isFav : !!session.is_favorite;
  const localCustomTitle = getLocalCustomTitle(session.id);
  const effectiveSummary = localCustomTitle || session.custom_title || session.summary;
  const displayTitle = sessionTitle(effectiveSummary, session.first_prompt, 'Untitled Conversation');

  const beginEditTitle = () => {
    setTitleError(null);
    setTitleInput(displayTitle === 'Untitled Conversation' ? '' : displayTitle);
    setEditingTitle(true);
  };

  const cancelEditTitle = () => {
    setEditingTitle(false);
    setTitleInput('');
    setTitleError(null);
  };

  const saveTitle = async () => {
    if (!id) return;
    setTitleSaving(true);
    setTitleError(null);
    try {
      const result = await updateSessionTitle(id, titleInput);
      session.summary = result.title;
      session.custom_title = result.title;
      setEditingTitle(false);
    } catch (e: any) {
      setTitleError(e.message || 'Failed to update title');
    } finally {
      setTitleSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-[#d0ddd5] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-[#6b8578] hover:text-[#2d3d34] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  maxLength={120}
                  placeholder="Enter custom title"
                  className="flex-1 min-w-0 bg-[#f0f5f2] border border-[#d0ddd5] rounded px-2 py-1 text-sm text-[#2d3d34] focus:outline-none focus:border-[#7ec8a0]"
                />
                <button
                  onClick={saveTitle}
                  disabled={titleSaving}
                  className="p-1.5 rounded text-[#4da87a] hover:bg-[#edf7f0] disabled:opacity-50"
                  title="Save title"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={cancelEditTitle}
                  disabled={titleSaving}
                  className="p-1.5 rounded text-[#9aafa3] hover:bg-[#f0f5f2] disabled:opacity-50"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg font-medium text-[#2d3d34] truncate">
                  {displayTitle}
                </h1>
                {(session.custom_title || localCustomTitle) && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-[#e8f0eb] text-[#6b8578] shrink-0">
                    <Pencil size={10} />
                    Custom
                  </span>
                )}
                <button
                  onClick={beginEditTitle}
                  className="p-1 rounded text-[#9aafa3] hover:text-[#6b8578] hover:bg-[#f0f5f2]"
                  title="Edit title"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            {titleError && <div className="text-xs text-red-500 mt-1">{titleError}</div>}
            <div className="flex items-center gap-4 mt-1 text-xs text-[#9aafa3]">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {formatDate(session.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={12} /> {messages.length} messages
              </span>
              {session.model && <span className="text-[#4da87a] font-medium">{session.model}</span>}
              {session.total_input_tokens > 0 && (
                <span>{formatTokens(session.total_input_tokens + session.total_output_tokens)} tokens</span>
              )}
              {session.tool_call_count > 0 && (
                <span className="flex items-center gap-1">
                  <Wrench size={12} /> {session.tool_call_count} tool calls
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-[#e8f0eb] text-[#6b8578]">
                {session.project_slug.replace(/--/g, '/').split('/').pop()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TagManager
              tags={tags}
              sessionTags={session.tags || []}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onCreateTag={createTag}
            />
            <button
              onClick={handleToggleFav}
              className={`p-2 rounded-lg transition-colors ${
                favorite ? 'text-yellow-400' : 'text-[#c5d4cb] hover:text-yellow-400'
              }`}
              title="Favorite (F)"
            >
              <Star size={18} fill={favorite ? 'currentColor' : 'none'} />
            </button>
            <a
              href={exportSession(id!, 'md')}
              download
              className="p-2 rounded-lg text-[#9aafa3] hover:text-[#3d5248] transition-colors"
              title="Export as Markdown"
            >
              <Download size={18} />
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />

        {Object.keys(subagents).length > 0 && (
          <div className="px-4 py-4 border-t border-[#d0ddd5]">
            <h2 className="text-sm font-medium text-[#6b8578] mb-3">
              Sub-agents ({Object.keys(subagents).length})
            </h2>
            {Object.entries(subagents).map(([agentId, msgs]) => (
              <details key={agentId} className="mb-2">
                <summary className="cursor-pointer text-sm text-[#7ec8a0] hover:text-[#65b589] py-1">
                  {agentId} ({msgs.length} messages)
                </summary>
                <div className="ml-4 border-l-2 border-[#d0ddd5] pl-4">
                  <MessageList messages={msgs} />
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
