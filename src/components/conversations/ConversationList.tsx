import { Session } from '../../lib/api';
import { ConversationCard } from './ConversationCard';

interface Props {
  sessions: Session[];
  onToggleFavorite: (id: string) => void;
  onSelectProject?: (projectSlug: string) => void;
}

export function ConversationList({ sessions, onToggleFavorite, onSelectProject }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#9aafa3]">
        <p className="text-lg">No conversations found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map(session => (
        <ConversationCard
          key={session.id}
          session={session}
          onToggleFavorite={onToggleFavorite}
          onSelectProject={onSelectProject}
        />
      ))}
    </div>
  );
}
