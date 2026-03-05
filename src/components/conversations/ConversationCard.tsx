import { Link } from 'react-router-dom';
import { Star, MessageSquare, Clock, Wrench } from 'lucide-react';
import { Session } from '../../lib/api';
import { timeAgo, truncate, cn, formatTokens } from '../../lib/utils';
import { TagBadge } from '../tags/TagBadge';

interface Props {
  session: Session;
  onToggleFavorite: (id: string) => void;
}

export function ConversationCard({ session, onToggleFavorite }: Props) {
  return (
    <div className="bg-white rounded-lg p-4 hover:bg-[#edf5f0] transition-colors border border-[#d0ddd5] group shadow-sm">
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => { e.preventDefault(); onToggleFavorite(session.id); }}
          className={cn(
            'mt-1 transition-colors shrink-0',
            session.is_favorite ? 'text-yellow-400' : 'text-[#c5d4cb] hover:text-yellow-400'
          )}
        >
          <Star size={16} fill={session.is_favorite ? 'currentColor' : 'none'} />
        </button>

        <Link to={`/conversation/${session.id}`} className="flex-1 min-w-0">
          <h3 className="font-medium text-[#2d3d34] truncate">
            {session.summary || truncate(session.first_prompt, 80) || 'Untitled'}
          </h3>

          {session.first_prompt && session.summary && (
            <p className="text-sm text-[#6b8578] mt-1 truncate">
              {truncate(session.first_prompt, 120)}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-[#9aafa3]">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {timeAgo(session.modified_at)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {session.message_count} msgs
            </span>
            {session.model && (
              <span className="text-[#4da87a] font-medium">
                {session.model.replace('claude-', '').split('-').slice(0, 2).join('-')}
              </span>
            )}
            {session.total_input_tokens > 0 && (
              <span>{formatTokens(session.total_input_tokens + session.total_output_tokens)} tokens</span>
            )}
            {session.tool_call_count > 0 && (
              <span className="flex items-center gap-1">
                <Wrench size={12} />
                {session.tool_call_count}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded bg-[#e8f0eb] text-[#6b8578]">
              {session.project_slug.replace(/--/g, '/').split('/').pop()}
            </span>
            {session.git_branch && session.git_branch !== 'HEAD' && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#e0f0e6] text-[#3a8a62]">
                {session.git_branch}
              </span>
            )}
            {session.tags.map(tag => (
              <TagBadge key={tag.name} name={tag.name} color={tag.color} />
            ))}
          </div>
        </Link>
      </div>
    </div>
  );
}
