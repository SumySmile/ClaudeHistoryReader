import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSessionDetail } from '../hooks/useConversations';
import { useTags } from '../hooks/useTags';
import { MessageList } from '../components/detail/MessageList';
import { TagManager } from '../components/tags/TagManager';
import { ArrowLeft, Download, Star, Clock, MessageSquare, Wrench } from 'lucide-react';
import { MessageListSkeleton } from '../components/shared/Skeleton';
import { formatDate, formatTokens } from '../lib/utils';
import { toggleFavorite, exportSession } from '../lib/api';
import { useState, useEffect, useCallback } from 'react';

export function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useSessionDetail(id);
  const { tags, create: createTag, addToSession, removeFromSession, reload: reloadTags } = useTags();
  const [isFav, setIsFav] = useState<boolean | null>(null);

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

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-[#d0ddd5] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-[#6b8578] hover:text-[#2d3d34] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-medium text-[#2d3d34] truncate">
              {session.summary || 'Untitled Conversation'}
            </h1>
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
